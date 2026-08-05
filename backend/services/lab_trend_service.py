import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any

import models
from services.groq_service import groq_service

logger = logging.getLogger(__name__)

def parse_val(val_str: Any) -> float:
    if not val_str:
        return 0.0
    match = re.search(r'[-+]?\d*\.\d+|\d+', str(val_str))
    if match:
        return float(match.group())
    return 0.0

def detect_trend(values: List[float]) -> str:
    if len(values) < 2:
        return "Stable"
        
    diffs = [values[i] - values[i-1] for i in range(1, len(values))]
    all_positive = all(d > 0 for d in diffs)
    all_negative = all(d < 0 for d in diffs)
    all_zero = all(d == 0 for d in diffs)
    
    if all_positive: return "Increasing"
    if all_negative: return "Decreasing"
    if all_zero: return "Stable"
    return "Fluctuating"

def get_ai_explanation(test_name: str, history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates an AI explanation of the laboratory trend using Groq."""
    
    # Format history for prompt
    history_str = "\n".join([f"Date: {h['date']}, Result: {h['result']} {h['unit']}, Normal Range: {h['normal_range']}" for h in history])
    
    prompt = f"""
    You are an expert AI Medical Trend Analyzer. Analyze the following history of a patient's "{test_name}" laboratory results over time.
    
    HISTORY:
    {history_str}
    
    Output ONLY valid JSON matching this exact structure:
    {{
      "summary": "Brief summary of the test values over time.",
      "trend": "Increasing, Decreasing, Stable, or Fluctuating",
      "possible_concern": "Identify any medical concerns based on the normal range and trend.",
      "recommendation": "Suggest next steps (e.g. lifestyle changes, see doctor).",
      "confidence_score": 95,
      "medical_disclaimer": "This AI is for informational purposes only and does not constitute medical advice."
    }}
    """
    
    try:
        response_text = groq_service.generate_json(
            system_prompt="You are a helpful assistant that outputs only valid JSON.",
            user_prompt=prompt
        )
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Failed to generate AI trend explanation: {e}")
        return {
            "summary": "Unable to generate AI explanation at this time.",
            "trend": detect_trend([parse_val(h['result']) for h in history]),
            "possible_concern": "Unknown",
            "recommendation": "Consult with your healthcare provider.",
            "confidence_score": 0,
            "medical_disclaimer": "This AI is for informational purposes only and does not constitute medical advice."
        }

def analyze_lab_trends(records: List[models.MedicalRecord]) -> List[Dict[str, Any]]:
    # 1 & 2. Aggregate and Group by Test Name
    grouped_tests = {}
    
    for record in records:
        visit_date = (record.visit or {}).get("date") or "Unknown Date"
        labs = record.laboratory_results or []

        for lab in labs:
            if not isinstance(lab, dict) or not lab.get("test_name"):
                continue
            test_name = str(lab.get("test_name")).strip().title()
            
            if test_name not in grouped_tests:
                grouped_tests[test_name] = []
                
            grouped_tests[test_name].append({
                "date": visit_date,
                "result": lab.get("result", ""),
                "unit": lab.get("unit", ""),
                "normal_range": lab.get("normal_range", "")
            })
            
    trends_output = []
    
    for test_name, history in grouped_tests.items():
        # 3. Sort Chronologically
        def parse_date(d):
            try: return datetime.strptime(d.split("T")[0], "%Y-%m-%d")
            except: return datetime.min
            
        history.sort(key=lambda x: parse_date(x['date']))
        
        # 5. Detect Abnormal Values
        for h in history:
            h['is_abnormal'] = False
            val = parse_val(h['result'])
            range_str = h['normal_range']
            
            if range_str:
                range_match = re.findall(r'[-+]?\d*\.\d+|\d+', str(range_str))
                if len(range_match) >= 2:
                    min_val, max_val = float(range_match[0]), float(range_match[1])
                    if val < min_val or val > max_val:
                        h['is_abnormal'] = True
                        
        # 6. Generate AI Explanation (only worthwhile once a series exists)
        if len(history) >= 2:
            ai_explanation = get_ai_explanation(test_name, history)
        else:
            ai_explanation = {
                "summary": f"Only one {test_name} reading is available so far, so no trend can be established.",
                "trend": "Stable",
                "possible_concern": "Not enough data points to assess a trend.",
                "recommendation": "Upload earlier or later reports for this test to see how it is changing.",
                "confidence_score": 40,
                "medical_disclaimer": "This AI is for informational purposes only and does not constitute medical advice.",
            }
        
        latest_result = history[-1] if len(history) > 0 else None
        previous_result = history[-2] if len(history) > 1 else None
        
        numeric_series = [parse_val(h["result"]) for h in history]
        trends_output.append({
            "test_name": test_name,
            "unit": history[-1].get("unit") if history else "",
            "history": history,
            "latest_result": latest_result,
            "previous_result": previous_result,
            "direction": detect_trend(numeric_series),
            "out_of_range": any(h.get("is_abnormal") for h in history),
            "ai_analysis": ai_explanation,
        })
        
    return trends_output
