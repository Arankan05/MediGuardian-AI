from typing import List, Dict, Any
from datetime import datetime
import models

def determine_visit_status(medical_info: Dict, visit_info: Dict) -> str:
    """
    Determines the visit status color based on keywords in the medical info and visit notes.
    Returns: 'blue' (Regular), 'green' (Improvement), 'yellow' (Follow-up), 'red' (Important Finding)
    """
    if not medical_info:
        return 'blue'
        
    text_to_analyze = " ".join([
        " ".join(medical_info.get("diagnosis", [])),
        " ".join(medical_info.get("symptoms", [])),
        str(medical_info.get("notes", "")),
        str(visit_info.get("hospital", "") if visit_info else ""),
    ]).lower()
    
    # Heuristics
    if any(kw in text_to_analyze for kw in ["critical", "urgent", "severe", "important", "abnormal", "emergency"]):
        return "red"
    if any(kw in text_to_analyze for kw in ["follow", "review", "recheck", "return"]):
        return "yellow"
    if any(kw in text_to_analyze for kw in ["improvement", "better", "resolved", "healing", "normal"]):
        return "green"
        
    return "blue"

def generate_timeline(records: List[models.MedicalRecord]) -> List[Dict[str, Any]]:
    """
    Aggregates and merges medical records by patient and visit date, returning chronological timeline events.
    """
    timeline_map = {} # Key: (patient_name, visit_date)
    
    for record in records:
        patient = record.patient or {}
        patient_name = patient.get("name") or "Unknown Patient"
        
        visit = record.visit or {}
        # Default to 'Unknown Date' or use upload date if we want, but requirements say merge by visit date
        visit_date = visit.get("date") or "Unknown Date"
        
        key = (patient_name, visit_date)
        
        if key not in timeline_map:
            timeline_map[key] = {
                "patient_name": patient_name,
                "visit_date": visit_date,
                "hospital": visit.get("hospital") or "Unknown Hospital",
                "doctor": visit.get("doctor") or "Unknown Doctor",
                "diagnosis": [],
                "medicines": [],
                "laboratory_results": [],
                "allergies": [],
                "notes": "",
                "document_ids": [],
                "status": "blue" # Default
            }
            
        event = timeline_map[key]
        event["document_ids"].append(record.document_id)
        
        # Merge Hospital / Doctor if currently unknown
        if event["hospital"] == "Unknown Hospital" and visit.get("hospital"):
            event["hospital"] = visit.get("hospital")
        if event["doctor"] == "Unknown Doctor" and visit.get("doctor"):
            event["doctor"] = visit.get("doctor")
            
        # Merge medical info
        med_info = record.medical_information or {}

        def _as_list(value):
            if not value:
                return []
            return value if isinstance(value, list) else [value]

        event["diagnosis"].extend(_as_list(med_info.get("diagnosis")))
        event["allergies"].extend(_as_list(med_info.get("allergies")))
        if med_info.get("notes"):
            event["notes"] += "\n" + med_info.get("notes") if event["notes"] else med_info.get("notes")
            
        # Merge medicines
        for med in (record.medications or []):
            if isinstance(med, dict) and med.get("name"):
                event["medicines"].append(med)

        # Merge labs
        for lab in (record.laboratory_results or []):
            if isinstance(lab, dict) and lab.get("test_name"):
                event["laboratory_results"].append(lab)
            
        # Determine status (takes the highest severity if multiple docs are merged, or just recalculates)
        current_status = determine_visit_status(med_info, visit)
        # Severity priority: red > yellow > green > blue
        priority = {"red": 4, "yellow": 3, "green": 2, "blue": 1}
        if priority[current_status] > priority[event["status"]]:
            event["status"] = current_status

    # Convert map to list and clean up lists (remove duplicates)
    timeline_events = list(timeline_map.values())
    for event in timeline_events:
        event["diagnosis"] = sorted({str(d) for d in event["diagnosis"] if d})
        event["allergies"] = sorted({str(a) for a in event["allergies"] if a})
        
    # Sort chronologically (oldest to newest). 
    # Fallback to string sort if date parsing fails.
    def sort_key(event):
        try:
            # Attempt to parse common date formats YYYY-MM-DD or similar
            # In a real app, date parsing would be more robust.
            return datetime.strptime(event["visit_date"].split("T")[0], "%Y-%m-%d")
        except:
            return datetime.min # Put unparseable/unknown dates at the beginning
            
    timeline_events.sort(key=sort_key)
    
    return timeline_events
