"""Deterministic cross-checking engine.

Safety-critical findings are decided by explicit rules here — not by free-form
LLM output — so the same records always produce the same alerts. The LLM
explains; this module decides.

Detects, across the full multi-visit / multi-provider record set:
  1. Duplicate medication      same drug (or same generic) prescribed more than once
  2. Dosage conflict           same drug prescribed at different strength/frequency
  3. Allergy conflict          drug matched against allergies, drug-family aware
  4. Drug interaction          curated interaction pairs on concurrently active drugs
  5. Abnormal lab result       value outside the stated reference range
  6. Discontinued medication   previously active drug absent from the latest visit
"""

from typing import List, Dict, Any, Optional
import re

import models
from services.timeline_service import generate_timeline

# --------------------------------------------------------------------------
# Reference data
# --------------------------------------------------------------------------

# Brand -> generic, so "Panadol" and "Paracetamol" are recognised as one drug.
BRAND_TO_GENERIC = {
    "panadol": "paracetamol",
    "calpol": "paracetamol",
    "tylenol": "paracetamol",
    "acetaminophen": "paracetamol",
    "brufen": "ibuprofen",
    "advil": "ibuprofen",
    "nurofen": "ibuprofen",
    "motrin": "ibuprofen",
    "augmentin": "amoxicillin",
    "amoxil": "amoxicillin",
    "glucophage": "metformin",
    "coumadin": "warfarin",
    "lipitor": "atorvastatin",
    "zocor": "simvastatin",
    "prinivil": "lisinopril",
    "zestril": "lisinopril",
    "norvasc": "amlodipine",
    "lasix": "furosemide",
    "cipro": "ciprofloxacin",
    "zithromax": "azithromycin",
    "flagyl": "metronidazole",
    "voltaren": "diclofenac",
    "disprin": "aspirin",
    "ecosprin": "aspirin",
}

# Drug families let us catch "allergic to Penicillin" vs "prescribed Amoxicillin".
DRUG_FAMILIES = {
    "penicillin": {
        "penicillin", "amoxicillin", "ampicillin", "augmentin", "amoxil",
        "flucloxacillin", "cloxacillin", "piperacillin", "benzylpenicillin",
    },
    "cephalosporin": {
        "cephalexin", "cefuroxime", "ceftriaxone", "cefixime", "cefaclor", "cephradine",
    },
    "sulfa": {"sulfamethoxazole", "cotrimoxazole", "bactrim", "septrin", "sulfasalazine"},
    "nsaid": {
        "ibuprofen", "diclofenac", "naproxen", "aspirin", "mefenamic acid",
        "indomethacin", "celecoxib", "ketoprofen",
    },
    "statin": {"atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"},
    "macrolide": {"azithromycin", "erythromycin", "clarithromycin"},
    "quinolone": {"ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin"},
}

# Curated interaction pairs (generic names).
KNOWN_INTERACTIONS: List[Dict[str, Any]] = [
    {"pair": ("aspirin", "warfarin"), "severity": "Red",
     "description": "Warfarin combined with Aspirin substantially increases the risk of serious bleeding.",
     "recommendation": "Contact the prescribing doctor before taking these together."},
    {"pair": ("ibuprofen", "warfarin"), "severity": "Red",
     "description": "NSAIDs such as Ibuprofen raise bleeding risk when taken with Warfarin.",
     "recommendation": "Ask a doctor or pharmacist about a safer pain-relief option."},
    {"pair": ("diclofenac", "warfarin"), "severity": "Red",
     "description": "Diclofenac taken with Warfarin increases the risk of bleeding.",
     "recommendation": "Ask a doctor or pharmacist about a safer pain-relief option."},
    {"pair": ("clarithromycin", "simvastatin"), "severity": "Red",
     "description": "Clarithromycin raises Simvastatin levels, increasing the risk of muscle damage.",
     "recommendation": "Review this combination with the prescriber."},
    {"pair": ("atorvastatin", "clarithromycin"), "severity": "Yellow",
     "description": "Clarithromycin can raise Atorvastatin levels, increasing muscle-related side effects.",
     "recommendation": "Mention this combination to the prescriber."},
    {"pair": ("aspirin", "ibuprofen"), "severity": "Yellow",
     "description": "Taking Ibuprofen with Aspirin can reduce Aspirin's heart protection and irritate the stomach.",
     "recommendation": "Discuss timing or alternatives with a pharmacist."},
    {"pair": ("lisinopril", "spironolactone"), "severity": "Yellow",
     "description": "Both medicines can raise potassium levels, so combined use needs monitoring.",
     "recommendation": "Ask the doctor whether potassium levels should be checked."},
    {"pair": ("metformin", "prednisolone"), "severity": "Yellow",
     "description": "Steroids such as Prednisolone can raise blood sugar and work against Metformin.",
     "recommendation": "Monitor blood sugar more closely while taking both."},
    {"pair": ("ciprofloxacin", "warfarin"), "severity": "Yellow",
     "description": "Ciprofloxacin can increase Warfarin's blood-thinning effect.",
     "recommendation": "Ask about INR monitoring while on this antibiotic."},
]

SEVERITY_RANK = {"Red": 3, "Yellow": 2, "Green": 1}


# --------------------------------------------------------------------------
# Normalisation helpers
# --------------------------------------------------------------------------

def normalize_drug(name: Optional[str]) -> str:
    """Lower-case, strip strength/form noise, and resolve brand -> generic."""
    if not name:
        return ""
    n = str(name).lower().strip()
    n = re.sub(r"\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?)\b", " ", n)
    n = re.sub(r"\b(tab|tabs|tablet|tablets|cap|caps|capsule|capsules|syrup|syp|"
               r"injection|inj|cream|ointment|drop|drops|sr|xr|er|mr|oral|po)\b", " ", n)
    # Keep digits: they distinguish genuinely different products
    # ("Demo Medicine 1" vs "Demo Medicine 2", "Vitamin B12" vs "Vitamin B6").
    # Strengths were already removed above, where they carry a unit.
    n = re.sub(r"[^a-z0-9\s-]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    if not n:
        return ""
    if n in BRAND_TO_GENERIC:
        return BRAND_TO_GENERIC[n]
    first = n.split(" ")[0]
    return BRAND_TO_GENERIC.get(first, n)


def families_of(drug: str) -> set:
    """Every family a normalised drug name belongs to."""
    out = set()
    for family, members in DRUG_FAMILIES.items():
        if drug in members or drug == family:
            out.add(family)
    return out


def parse_numerical_value(val_str: Any) -> Optional[float]:
    if val_str is None or val_str == "":
        return None
    match = re.search(r"[-+]?\d*\.\d+|\d+", str(val_str))
    return float(match.group()) if match else None


def doses_per_day(frequency: Optional[str]) -> Optional[float]:
    """Turn a free-text frequency into a comparable per-day number."""
    if not frequency:
        return None
    f = str(frequency).lower()
    if any(k in f for k in ["three times", "thrice", "tds", "tid", "3 times"]):
        base: Optional[float] = 3.0
    elif any(k in f for k in ["four times", "qds", "qid", "4 times"]):
        base = 4.0
    elif any(k in f for k in ["twice", "bd", "bid", "2 times"]):
        base = 2.0
    elif any(k in f for k in ["once daily", "once a day", "od", "1 time", "daily"]):
        base = 1.0
    else:
        m = re.search(r"(\d+(\.\d+)?)\s*(?:times?|x)\s*(?:per|a|/)?\s*day", f)
        base = float(m.group(1)) if m else None
    if base is None:
        return None
    tabs = re.search(r"(\d+(\.\d+)?)\s*(?:tab|tablet|cap|capsule|pill)", f)
    return base * float(tabs.group(1)) if tabs else base


def _strength_text(med: Dict[str, Any]) -> str:
    return " ".join(
        str(med.get(k) or "").strip() for k in ("strength", "dosage") if med.get(k)
    ).strip()


def _display_name(med: Dict[str, Any]) -> str:
    return (med.get("name") or "Unknown medication").strip()


# --------------------------------------------------------------------------
# Main analysis
# --------------------------------------------------------------------------

def analyze_safety(records: List[models.MedicalRecord]) -> Dict[str, Any]:
    """Cross-check every record against every other record."""
    timeline_events = generate_timeline(records)
    issues: List[Dict[str, Any]] = []

    disclaimer = (
        "MediGuardian AI provides information only and is not a diagnosis. "
        "Always confirm any medication concern with a qualified doctor or pharmacist."
    )

    if not timeline_events:
        return {
            "risk_score": 0,
            "issues": [],
            "summary": {"total_issues": 0, "red": 0, "yellow": 0, "green": 0,
                        "visits_analyzed": 0, "medications_reviewed": 0},
            "medical_disclaimer": disclaimer,
        }

    # Every allergy ever recorded, resolved to drugs and drug families.
    allergy_norms: Dict[str, str] = {}
    for event in timeline_events:
        for allergy in event.get("allergies", []) or []:
            if allergy:
                norm = normalize_drug(allergy)
                if norm:
                    allergy_norms[norm] = str(allergy)

    allergy_families: Dict[str, str] = {}
    for norm, original in allergy_norms.items():
        for fam in (families_of(norm) or {norm}):
            allergy_families[fam] = original

    # Flatten medications across the whole history, tagged with their visit.
    occurrences: Dict[str, List[Dict[str, Any]]] = {}
    med_count = 0

    for event in timeline_events:
        visit_date = event.get("visit_date") or "Unknown Date"
        hospital = event.get("hospital") or "Unknown Hospital"
        for med in event.get("medicines", []) or []:
            if not isinstance(med, dict):
                continue
            generic = normalize_drug(med.get("name"))
            if not generic:
                continue
            med_count += 1
            occurrences.setdefault(generic, []).append({
                "visit_date": visit_date,
                "hospital": hospital,
                "name": _display_name(med),
                "strength": _strength_text(med),
                "frequency": (med.get("frequency") or "").strip(),
                "per_day": doses_per_day(med.get("frequency")),
            })

    latest_visit = timeline_events[-1].get("visit_date") if timeline_events else None

    # --- 1 & 2. Duplicates and dosage conflicts across visits --------------
    for generic, occs in occurrences.items():
        label = occs[0]["name"]
        visits = sorted({o["visit_date"] for o in occs})

        if len(occs) > 1:
            issues.append({
                "issue_type": "Duplicate Medication",
                "severity": "Red" if len(visits) > 1 else "Yellow",
                "description": (
                    f"{label} appears on {len(occs)} prescriptions across "
                    f"{len(visits)} visit(s) ({', '.join(visits)}). Taking the same "
                    f"medicine from more than one prescription can lead to a double dose."
                ),
                "related_medicines": sorted({o["name"] for o in occs}),
                "related_visits": visits,
                "recommendation": "Show all current prescriptions to a doctor or pharmacist to confirm only one should be taken.",
            })

        strengths = {o["strength"] for o in occs if o["strength"]}
        per_days = {o["per_day"] for o in occs if o["per_day"] is not None}
        if len(strengths) > 1 or len(per_days) > 1:
            detail_parts = []
            for o in occs:
                bits = [b for b in (o["strength"], o["frequency"]) if b]
                detail_parts.append(f"{o['visit_date']}: {' '.join(bits) or 'unspecified'}")
            issues.append({
                "issue_type": "Dosage Conflict",
                "severity": "Red",
                "description": (
                    f"{label} was prescribed at different doses across visits — "
                    f"{'; '.join(detail_parts)}. Following both instructions could mean "
                    f"taking too much or too little."
                ),
                "related_medicines": sorted({o["name"] for o in occs}),
                "related_visits": visits,
                "recommendation": "Confirm with the prescribing doctor which dose is current before taking this medicine.",
            })

    # --- 3. Allergy conflicts (drug-family aware) --------------------------
    if allergy_norms:
        for generic, occs in occurrences.items():
            matched_allergy = None
            reason = ""

            if generic in allergy_norms:
                matched_allergy = allergy_norms[generic]
                reason = "the medicine matches a recorded allergy"
            else:
                for fam in families_of(generic):
                    if fam in allergy_families:
                        matched_allergy = allergy_families[fam]
                        reason = f"it belongs to the {fam} family, which the records list as an allergy"
                        break

            if matched_allergy:
                label = occs[0]["name"]
                visits = sorted({o["visit_date"] for o in occs})
                issues.append({
                    "issue_type": "Allergy Conflict",
                    "severity": "Red",
                    "description": (
                        f"{label} was prescribed on {', '.join(visits)} even though the records "
                        f"list an allergy to {matched_allergy} — {reason}."
                    ),
                    "related_medicines": [label],
                    "related_visits": visits,
                    "recommendation": "Do not take this medicine before speaking to a doctor or pharmacist about the recorded allergy.",
                })

    # --- 4. Drug interactions ---------------------------------------------
    present = set(occurrences.keys())
    for entry in KNOWN_INTERACTIONS:
        a, b = entry["pair"]
        if a in present and b in present:
            visits = sorted({o["visit_date"] for o in occurrences[a] + occurrences[b]})
            issues.append({
                "issue_type": "Drug Interaction",
                "severity": entry["severity"],
                "description": entry["description"],
                "related_medicines": [occurrences[a][0]["name"], occurrences[b][0]["name"]],
                "related_visits": visits,
                "recommendation": entry["recommendation"],
            })

    # --- 5. Abnormal lab results ------------------------------------------
    for event in timeline_events:
        visit_date = event.get("visit_date") or "Unknown Date"
        for lab in event.get("laboratory_results", []) or []:
            if not isinstance(lab, dict):
                continue
            test_name = lab.get("test_name") or "Lab test"
            result_val = parse_numerical_value(lab.get("result"))
            range_str = str(lab.get("normal_range") or "")
            if result_val is None or not range_str:
                continue
            bounds = re.findall(r"[-+]?\d*\.\d+|\d+", range_str)
            if len(bounds) < 2:
                continue
            min_val, max_val = float(bounds[0]), float(bounds[1])
            if min_val <= result_val <= max_val:
                continue
            over = result_val > max_val
            margin = ((result_val - max_val) / max_val) if (over and max_val) else 0
            unit = f" {lab.get('unit')}" if lab.get("unit") else ""
            issues.append({
                "issue_type": "Abnormal Lab Result",
                "severity": "Red" if margin > 0.25 else "Yellow",
                "description": (
                    f"{test_name} was {result_val}{unit} on {visit_date}, "
                    f"{'above' if over else 'below'} the normal range ({min_val}–{max_val})."
                ),
                "related_medicines": [],
                "related_visits": [visit_date],
                "recommendation": "Discuss this result with a doctor to see whether follow-up testing is needed.",
            })

    # --- 6. Discontinued medications --------------------------------------
    if latest_visit and len(timeline_events) > 1:
        latest_generics = {
            normalize_drug(m.get("name"))
            for m in (timeline_events[-1].get("medicines") or [])
            if isinstance(m, dict)
        }
        for generic, occs in occurrences.items():
            last_seen = max(o["visit_date"] for o in occs)
            if generic not in latest_generics and last_seen != latest_visit:
                issues.append({
                    "issue_type": "Discontinued Medicine",
                    "severity": "Green",
                    "description": (
                        f"{occs[0]['name']} was prescribed on {last_seen} but does not appear "
                        f"in the most recent visit ({latest_visit})."
                    ),
                    "related_medicines": [occs[0]["name"]],
                    "related_visits": [last_seen, latest_visit],
                    "recommendation": "Check whether stopping this medicine was intended.",
                })

    # --- De-duplicate, sort, score ----------------------------------------
    unique_issues: List[Dict[str, Any]] = []
    seen = set()
    for issue in issues:
        key = (issue["issue_type"], issue["description"])
        if key not in seen:
            seen.add(key)
            unique_issues.append(issue)

    unique_issues.sort(key=lambda i: -SEVERITY_RANK.get(i["severity"], 0))

    risk_score = 0
    for issue in unique_issues:
        if issue["severity"] == "Red":
            risk_score += 25
        elif issue["severity"] == "Yellow":
            risk_score += 10
    risk_score = min(100, risk_score)

    return {
        "risk_score": risk_score,
        "issues": unique_issues,
        "summary": {
            "total_issues": len(unique_issues),
            "red": sum(1 for i in unique_issues if i["severity"] == "Red"),
            "yellow": sum(1 for i in unique_issues if i["severity"] == "Yellow"),
            "green": sum(1 for i in unique_issues if i["severity"] == "Green"),
            "visits_analyzed": len(timeline_events),
            "medications_reviewed": med_count,
        },
        "medical_disclaimer": disclaimer,
    }
