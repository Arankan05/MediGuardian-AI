from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class UploadedDocument(Base):
    """A raw file the user uploaded, plus the text we pulled out of it."""
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_type = Column(String)          # PDF, PNG, JPG
    is_scanned = Column(Boolean, default=False)
    document_category = Column(String)  # Prescription, Laboratory Report, ...
    extracted_text = Column(Text, nullable=True)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    medical_records = relationship(
        "MedicalRecord", back_populates="document", cascade="all, delete-orphan"
    )


class MedicalRecord(Base):
    """
    The AI-extracted content of one document.

    Stored as JSON documents that mirror `schemas.StructuredMedicalData` exactly,
    which is the shape every service in services/ consumes:

        record.patient              -> {"name", "age", "gender"}
        record.visit                -> {"date", "hospital", "doctor"}
        record.medications          -> [{"name", "strength", "dosage", "frequency", "duration"}]
        record.laboratory_results   -> [{"test_name", "result", "unit", "normal_range"}]
        record.medical_information  -> {"diagnosis", "allergies", "symptoms", "notes"}

    Keeping one shape end-to-end (LLM -> Pydantic -> DB -> services) removes the
    mapping layer that previously dropped medications and lab results.
    """
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("uploaded_documents.id"), index=True)

    patient = Column(JSON, nullable=True)
    visit = Column(JSON, nullable=True)
    medications = Column(JSON, nullable=True)
    laboratory_results = Column(JSON, nullable=True)
    medical_information = Column(JSON, nullable=True)
    confidence_score = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    document = relationship("UploadedDocument", back_populates="medical_records")

    # --- convenience accessors used by the API layer -----------------------
    @property
    def patient_name(self) -> str | None:
        return (self.patient or {}).get("name")

    @property
    def visit_date(self) -> str | None:
        return (self.visit or {}).get("date")

    def to_dict(self) -> dict:
        """Explicit serialisation — never hand raw ORM objects to FastAPI."""
        return {
            "id": self.id,
            "document_id": self.document_id,
            "patient": self.patient or {},
            "visit": self.visit or {},
            "medications": self.medications or [],
            "laboratory_results": self.laboratory_results or [],
            "medical_information": self.medical_information or {},
            "confidence_score": self.confidence_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "filename": self.document.filename if self.document else None,
        }
