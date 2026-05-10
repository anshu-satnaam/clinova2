"""
FHIR Service — MedicationRequest Router
FHIR R4 MedicationRequest resources (prescriptions)
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from datetime import datetime

router = APIRouter()


class FHIRMedicationCreate(BaseModel):
    resourceType: str = "MedicationRequest"
    subject_patient_id: str
    requester_doctor_id: Optional[str] = None
    medication_name: str
    medication_code: Optional[str] = None
    dosage_text: Optional[str] = None
    dosage_value: Optional[float] = None
    dosage_unit: Optional[str] = None
    frequency: Optional[str] = None       # e.g. "1 tablet twice daily"
    route: Optional[str] = None           # oral | intravenous | topical
    status: str = "active"               # active | on-hold | cancelled | completed
    intent: str = "order"
    note: Optional[str] = None
    days_supply: Optional[int] = None


@router.post("/MedicationRequest", status_code=201)
async def create_medication_request(med: FHIRMedicationCreate):
    """Create a FHIR R4 MedicationRequest (prescription)."""
    fhir_id = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    resource = {
        "resourceType": "MedicationRequest",
        "id": fhir_id,
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": med.status,
        "intent": med.intent,
        "medicationCodeableConcept": {
            "coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                        "code": med.medication_code or "unknown",
                        "display": med.medication_name}],
            "text": med.medication_name,
        },
        "subject": {"reference": f"Patient/{med.subject_patient_id}"},
        "authoredOn": now,
    }
    if med.requester_doctor_id:
        resource["requester"] = {"reference": f"Practitioner/{med.requester_doctor_id}"}
    if med.dosage_text or med.frequency:
        resource["dosageInstruction"] = [{
            "text": med.dosage_text or med.frequency,
            "route": {"text": med.route} if med.route else None,
        }]
    if med.note:
        resource["note"] = [{"text": med.note}]
    return resource


@router.get("/MedicationRequest")
async def list_medication_requests(patient: Optional[str] = Query(None)):
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}


@router.get("/MedicationRequest/{med_id}")
async def get_medication_request(med_id: str):
    return {"resourceType": "MedicationRequest", "id": med_id,
            "meta": {"lastUpdated": datetime.utcnow().isoformat() + "Z"}}
