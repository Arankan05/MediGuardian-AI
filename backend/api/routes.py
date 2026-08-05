"""MediGuardian AI — HTTP API.

Route groups:
  /health, /test-groq          service diagnostics
  /upload                      file intake -> text extraction (PyMuPDF / Tesseract)
  /ai/extract/{document_id}    LLM extraction -> structured record
  /patients                    who is in the database
  /medical-records             raw extracted records
  /timeline, /safety-analysis, /lab-trends, /chat   the four analysis features
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional

import database
import models
from services.document_service import process_document
from services.ai_service import extract_structured_medical_data
from services.groq_service import groq_service, MODEL_NAME
from services.timeline_service import generate_timeline
from services.safety_service import analyze_safety
from services.lab_trend_service import analyze_lab_trends
from services.chat_service import generate_chat_response
from services.summary_service import generate_patient_summary

router = APIRouter()


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    except database.OperationalError as oe:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=f"Database connection unavailable: {oe}"
        )
    finally:
        db.close()



def _records_for(db: Session, patient_name: Optional[str] = None) -> List[models.MedicalRecord]:
    """All records, optionally narrowed to one patient (case-insensitive)."""
    records = db.query(models.MedicalRecord).all()
    if not patient_name or patient_name.lower() in {"all", "__all__"}:
        return records
    target = patient_name.strip().lower()
    return [r for r in records if (r.patient_name or "").strip().lower() == target]


# --------------------------------------------------------------------------
# Diagnostics
# --------------------------------------------------------------------------
@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    health = {"status": "ok", "database": "connected", "groq": "connected", "model": MODEL_NAME}

    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        health["status"] = "error"
        health["database"] = f"unavailable: {e}"

    groq_result = groq_service.test_connection()
    if groq_result.get("status") == "error":
        health["status"] = "error"
        health["groq"] = f"unavailable: {groq_result.get('message')}"

    return health


@router.get("/test-groq")
def test_groq_connection():
    result = groq_service.test_connection()
    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result.get("message"))
    return result


# --------------------------------------------------------------------------
# Intake
# --------------------------------------------------------------------------
@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    for file in files:
        try:
            file_bytes = await file.read()
            processed = process_document(file.filename, file.content_type or "", file_bytes)

            db_doc = models.UploadedDocument(
                filename=processed["filename"],
                file_type=processed["file_type"],
                is_scanned=processed["is_scanned"],
                document_category=processed["document_category"],
                extracted_text=processed["extracted_text"],
            )
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)

            results.append({
                "id": db_doc.id,
                "filename": db_doc.filename,
                "type": db_doc.file_type,
                "category": db_doc.document_category,
                "is_scanned": db_doc.is_scanned,
                "text_length": len(db_doc.extracted_text or ""),
                "status": "Success",
            })
        except Exception as e:
            db.rollback()
            results.append({"filename": file.filename, "status": "Failed", "error": str(e)})

    return {"message": f"Processed {len(files)} files.", "results": results}


@router.post("/ai/extract/{document_id}")
def extract_ai_data(document_id: int, db: Session = Depends(get_db)):
    document = (
        db.query(models.UploadedDocument)
        .filter(models.UploadedDocument.id == document_id)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not (document.extracted_text or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Document has no readable text. If this is a scanned file, ensure Tesseract OCR is installed.",
        )

    existing = (
        db.query(models.MedicalRecord)
        .filter(models.MedicalRecord.document_id == document_id)
        .first()
    )
    if existing:
        return {
            "message": "Data already extracted",
            "record_id": existing.id,
            "patient_name": existing.patient_name,
            "confidence_score": existing.confidence_score,
        }

    try:
        extracted = extract_structured_medical_data(document.extracted_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Extraction failed: {e}")

    # Persist the full structured payload — medications and laboratory_results
    # included. These drive cross-checking and lab trends downstream.
    record = models.MedicalRecord(
        document_id=document_id,
        patient=extracted.get("patient") or {},
        visit=extracted.get("visit") or {},
        medications=extracted.get("medications") or [],
        laboratory_results=extracted.get("laboratory_results") or [],
        medical_information=extracted.get("medical_information") or {},
        confidence_score=extracted.get("confidence_score"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "AI Extraction successful",
        "record_id": record.id,
        "patient_name": record.patient_name,
        "medications_found": len(record.medications or []),
        "lab_results_found": len(record.laboratory_results or []),
        "confidence_score": record.confidence_score,
    }


# --------------------------------------------------------------------------
# Records & patients
# --------------------------------------------------------------------------
@router.get("/patients")
def list_patients(db: Session = Depends(get_db)):
    """Distinct patients found across all extracted records.

    The frontend uses this to target /timeline, /chat, etc. at a real patient
    instead of assuming a name.
    """
    records = db.query(models.MedicalRecord).all()
    buckets: dict[str, dict] = {}
    for r in records:
        name = (r.patient_name or "Unknown Patient").strip() or "Unknown Patient"
        key = name.lower()
        entry = buckets.setdefault(key, {"name": name, "document_count": 0, "visit_dates": []})
        entry["document_count"] += 1
        if r.visit_date:
            entry["visit_dates"].append(r.visit_date)

    patients = sorted(buckets.values(), key=lambda p: -p["document_count"])
    for p in patients:
        p["visit_dates"] = sorted(set(p["visit_dates"]))
    return {"count": len(patients), "patients": patients}


@router.get("/medical-records")
def list_medical_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(models.MedicalRecord).offset(skip).limit(limit).all()
    return [r.to_dict() for r in records]


@router.get("/medical-records/{id}")
def get_medical_record(id: int, db: Session = Depends(get_db)):
    record = db.query(models.MedicalRecord).filter(models.MedicalRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return record.to_dict()


class UpdateMedicalRecordRequest(BaseModel):
    patient: Optional[dict] = None
    visit: Optional[dict] = None
    medications: Optional[list] = None
    laboratory_results: Optional[list] = None
    medical_information: Optional[dict] = None
    confidence_score: Optional[int] = None


@router.put("/medical-records/{id}")
def update_medical_record(id: int, payload: UpdateMedicalRecordRequest, db: Session = Depends(get_db)):
    record = db.query(models.MedicalRecord).filter(models.MedicalRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    if payload.patient is not None:
        record.patient = payload.patient
    if payload.visit is not None:
        record.visit = payload.visit
    if payload.medications is not None:
        record.medications = payload.medications
    if payload.laboratory_results is not None:
        record.laboratory_results = payload.laboratory_results
    if payload.medical_information is not None:
        record.medical_information = payload.medical_information
    if payload.confidence_score is not None:
        record.confidence_score = payload.confidence_score

    db.commit()
    db.refresh(record)
    return {"message": "Medical record updated successfully", "record": record.to_dict()}


@router.delete("/medical-records/{id}")
def delete_medical_record(id: int, db: Session = Depends(get_db)):
    record = db.query(models.MedicalRecord).filter(models.MedicalRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    doc_id = record.document_id
    db.delete(record)
    if doc_id:
        doc = db.query(models.UploadedDocument).filter(models.UploadedDocument.id == doc_id).first()
        if doc:
            db.delete(doc)
    db.commit()
    return {"message": f"Medical record {id} deleted successfully"}


@router.delete("/records")
def clear_all_records(db: Session = Depends(get_db)):
    """Reset the workspace — useful between demo runs."""
    db.query(models.MedicalRecord).delete()
    db.query(models.UploadedDocument).delete()
    db.commit()
    return {"message": "All documents and records cleared."}


# --------------------------------------------------------------------------
# Analysis features
# --------------------------------------------------------------------------
@router.get("/ai/summary")
def get_all_ai_summary(db: Session = Depends(get_db)):
    return generate_patient_summary(_records_for(db))


@router.get("/ai/summary/{patient_name}")
def get_patient_ai_summary(patient_name: str, db: Session = Depends(get_db)):
    return generate_patient_summary(_records_for(db, patient_name))


@router.get("/timeline")
def get_all_timelines(db: Session = Depends(get_db)):
    return generate_timeline(_records_for(db))


@router.get("/timeline/{patient_name}")
def get_patient_timeline(patient_name: str, db: Session = Depends(get_db)):
    return generate_timeline(_records_for(db, patient_name))


@router.get("/safety-analysis")
def get_all_safety_analysis(db: Session = Depends(get_db)):
    return analyze_safety(_records_for(db))


@router.get("/safety-analysis/{patient_name}")
def get_patient_safety_analysis(patient_name: str, db: Session = Depends(get_db)):
    return analyze_safety(_records_for(db, patient_name))


@router.get("/lab-trends")
def get_all_lab_trends(db: Session = Depends(get_db)):
    return analyze_lab_trends(_records_for(db))


@router.get("/lab-trends/{patient_name}")
def get_patient_lab_trends(patient_name: str, db: Session = Depends(get_db)):
    return analyze_lab_trends(_records_for(db, patient_name))


class ChatRequest(BaseModel):
    question: str


@router.post("/chat")
def chat_all_records(request: ChatRequest, db: Session = Depends(get_db)):
    """Ask across every record in the workspace (no patient assumption)."""
    return generate_chat_response("the patient", request.question, _records_for(db))


@router.post("/chat/{patient_name}")
def chat_with_assistant(patient_name: str, request: ChatRequest, db: Session = Depends(get_db)):
    return generate_chat_response(patient_name, request.question, _records_for(db, patient_name))
