import json
import logging
from typing import Dict, Any
from schemas import StructuredMedicalData
from services.groq_service import groq_service

logger = logging.getLogger(__name__)

def extract_structured_medical_data(document_text: str) -> Dict[str, Any]:
    """
    Calls Groq API to extract structured medical data from raw text and validates via Pydantic.
    """
    
    schema_definition = """
    {
      "patient": {
        "name": "string | null",
        "age": "number | null",
        "gender": "string | null"
      },
      "visit": {
        "date": "string | null",
        "hospital": "string | null",
        "doctor": "string | null"
      },
      "medications": [
        {
          "name": "string",
          "strength": "string | null",
          "dosage": "string | null",
          "frequency": "string | null",
          "duration": "string | null"
        }
      ],
      "laboratory_results": [
        {
          "test_name": "string",
          "result": "string | null",
          "unit": "string | null",
          "normal_range": "string | null"
        }
      ],
      "medical_information": {
        "diagnosis": ["string"],
        "allergies": ["string"],
        "symptoms": ["string"],
        "notes": "string | null"
      },
      "confidence_score": "number (0-100)"
    }
    """
    
    prompt = f"""
    You are an expert medical AI extraction engine. 
    Analyze the following raw OCR text extracted from a medical document and extract the information into a strict JSON format.
    
    RULES:
    1. Output ONLY valid JSON matching the exact schema provided. Do not include markdown formatting like ```json or any other text.
    2. If a piece of information is missing, uncertain, or ambiguous, you MUST return null (or an empty array for list fields) rather than guessing.
    3. Ensure standard formatting for dates and numbers where possible.
    
    SCHEMA:
    {schema_definition}
    
    RAW OCR TEXT:
    {document_text}
    """

    try:
        response_text = groq_service.generate_json(
            system_prompt="You are a helpful assistant that outputs only valid JSON.",
            user_prompt=prompt
        )
        
        # Validate through Pydantic
        validated_data = StructuredMedicalData.model_validate_json(response_text)
        return validated_data.model_dump()
            
    except Exception as e:
        logger.error(f"AI Extraction Error: {e}")
        raise e
