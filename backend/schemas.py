from pydantic import BaseModel, Field
from typing import List, Optional

class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None

class VisitInfo(BaseModel):
    date: Optional[str] = None
    hospital: Optional[str] = None
    doctor: Optional[str] = None

class Medication(BaseModel):
    name: str
    strength: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None

class LaboratoryResult(BaseModel):
    test_name: str
    result: Optional[str] = None
    unit: Optional[str] = None
    normal_range: Optional[str] = None

class MedicalInformation(BaseModel):
    diagnosis: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    symptoms: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class StructuredMedicalData(BaseModel):
    patient: PatientInfo
    visit: VisitInfo
    medications: List[Medication] = Field(default_factory=list)
    laboratory_results: List[LaboratoryResult] = Field(default_factory=list)
    medical_information: MedicalInformation
    confidence_score: Optional[int] = None
