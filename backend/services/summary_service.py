import json
import logging
from typing import List, Dict, Any, Optional
import models
from services.timeline_service import generate_timeline
from services.safety_service import analyze_safety
from services.lab_trend_service import analyze_lab_trends
from services.groq_service import groq_service

logger = logging.getLogger(__name__)


def generate_patient_summary(records: List[models.MedicalRecord]) -> Dict[str, Any]:
    """Generates a holistic AI Medical Summary using Groq llama-3.3-70b-versatile based on stored records."""
    disclaimer = (
        "MediGuardian AI provides an automated medical summary for informational purposes only. "
        "It does not replace professional medical diagnosis or clinical judgment."
    )

    if not records:
        return {
            "patient_name": "Unknown Patient",
            "executive_summary": "No medical records have been uploaded yet. Upload prescriptions or lab reports to generate an AI summary.",
            "key_diagnoses": [],
            "active_medications_summary": [],
            "lab_overview": [],
            "clinical_recommendations": ["Upload medical documents to begin automated summary generation."],
            "confidence_score": 0,
            "medical_disclaimer": disclaimer,
        }

    # Extract patient name from first available record
    patient_name = "Patient"
    for r in records:
        if r.patient_name and r.patient_name != "Unknown Patient":
            patient_name = r.patient_name
            break

    # Build context from timeline, safety, and lab trends
    timeline = generate_timeline(records)
    safety_report = analyze_safety(records)
    lab_trends = analyze_lab_trends(records)

    context_payload = {
        "patient_name": patient_name,
        "timeline_visits": timeline,
        "safety_issues": safety_report.get("issues", []),
        "lab_trends": lab_trends,
    }

    schema_definition = """
    {
      "executive_summary": "string (A comprehensive 3-5 sentence clinical overview of the patient's medical state)",
      "key_diagnoses": ["string"],
      "active_medications_summary": [
        {
          "name": "string",
          "dosage_notes": "string",
          "status": "string (Active / Under Review / Discontinued)"
        }
      ],
      "lab_overview": [
        {
          "test_name": "string",
          "latest_finding": "string",
          "status": "string (Normal / Abnormal / Attention Needed)"
        }
      ],
      "clinical_recommendations": ["string (Key actionable advice or follow-ups for patient/physician)"],
      "confidence_score": 95
    }
    """

    prompt = f"""
    You are an elite clinical AI summarizing physician. Analyze the following complete patient medical context derived strictly from uploaded records and generate a structured executive summary.

    STRICT CONTEXT:
    {json.dumps(context_payload, default=str)}

    RULES:
    1. Base all statements STRICTLY on the provided context. Do not invent or assume unmentioned conditions.
    2. Output ONLY valid JSON matching the exact schema provided. Do not use markdown blocks.

    SCHEMA:
    {schema_definition}
    """

    try:
        response_text = groq_service.generate_json(
            system_prompt="You are a clinical AI medical summary engine that outputs only valid JSON.",
            user_prompt=prompt,
        )
        parsed = json.loads(response_text)
        parsed["patient_name"] = patient_name
        parsed["medical_disclaimer"] = disclaimer
        return parsed
    except Exception as e:
        logger.error(f"Failed to generate AI patient summary: {e}")
        # Structured fallback if Groq API call fails or is unreachable
        return {
            "patient_name": patient_name,
            "executive_summary": f"Medical records for {patient_name} exist across {len(timeline)} visit(s). (Groq AI summary generation currently offline).",
            "key_diagnoses": list({d for event in timeline for d in event.get("diagnosis", [])}),
            "active_medications_summary": [
                {"name": med.get("name"), "dosage_notes": med.get("strength") or med.get("dosage") or "", "status": "Active"}
                for event in timeline for med in event.get("medicines", []) if isinstance(med, dict) and med.get("name")
            ],
            "lab_overview": [
                {"test_name": t.get("test_name"), "latest_finding": f"{t.get('latest_result', {}).get('result')} {t.get('latest_result', {}).get('unit')}", "status": "Abnormal" if t.get("out_of_range") else "Normal"}
                for t in lab_trends
            ],
            "clinical_recommendations": ["Review safety alerts and consult your primary physician."],
            "confidence_score": 50,
            "medical_disclaimer": disclaimer,
            "error": str(e),
        }
