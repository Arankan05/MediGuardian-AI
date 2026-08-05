import json
import logging
from typing import Dict, Any, List
from services.timeline_service import generate_timeline
from services.safety_service import analyze_safety
from services.lab_trend_service import analyze_lab_trends
from services.groq_service import groq_service

logger = logging.getLogger(__name__)

def generate_chat_response(patient_name: str, question: str, records: List[Any]) -> Dict[str, Any]:
    """
    Generates a RAG-style response from the LLM based strictly on the patient's records.
    """
    # 1. Build Context
    timeline = generate_timeline(records)
    safety_report = analyze_safety(records)
    lab_trends = analyze_lab_trends(records)
    
    context_str = f"""
    --- PATIENT TIMELINE ---
    {json.dumps(timeline, default=str)}
    
    --- SAFETY ALERTS ---
    {json.dumps(safety_report, default=str)}
    
    --- LABORATORY TRENDS ---
    {json.dumps(lab_trends, default=str)}
    """
    
    schema_definition = """
    {
      "answer": "string (Your detailed response based ONLY on the provided context. If the context does not contain the answer, say 'I could not find this information in the uploaded medical records.')",
      "supporting_documents": ["string (e.g., 'Visit on 2024-03-15', 'Lab Report', 'DOC-101')"],
      "confidence_score": "number (0-100)",
      "medical_disclaimer": "string (A brief medical disclaimer stating this is AI generated and not medical advice.)",
      "follow_up_suggestions": ["string (3-4 suggested follow-up questions the user can click)"]
    }
    """

    prompt = f"""
    You are an intelligent Medical Assistant for the MediGuardian platform.
    Your task is to answer the user's question using ONLY the provided context (Timeline, Safety Alerts, Lab Trends).
    
    CRITICAL RULES:
    1. NEVER use general assumptions, external knowledge, or hallucinate.
    2. If the answer is not supported by the patient's uploaded records, clearly state that it could not be found.
    3. Output ONLY valid JSON matching the exact schema provided.
    
    SCHEMA:
    {schema_definition}
    
    CONTEXT:
    {context_str}
    
    USER QUESTION:
    {question}
    """

    try:
        response_text = groq_service.generate_json(
            system_prompt="You are a helpful medical assistant that outputs only valid JSON.",
            user_prompt=prompt
        )
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Chat Service Error: {e}")
        return {
            "answer": "I apologize, but I encountered an error processing your request or the AI service is currently unavailable.",
            "supporting_documents": [],
            "confidence_score": 0,
            "medical_disclaimer": "This is an automated system message.",
            "follow_up_suggestions": ["Can you summarize my medical history?"]
        }
