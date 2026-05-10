"""
FHIR Service — Condition Router
FHIR R4 Condition resources (diagnoses, problems)
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from uuid import uuid4
from datetime import datetime

router = APIRouter()


class FHIRConditionCreate(BaseModel):
    resourceType: str = "Condition"
    subject_patient_id: str
    code_text: str
    code_system: str = "http://snomed.info/sct"
    code_code: Optional[str] = None
    clinical_status: str = "active"       # active | recurrence | relapse | inactive | remission | resolved
    verification_status: str = "unconfirmed"  # unconfirmed | provisional | differential | confirmed
    onset_datetime: Optional[str] = None
    note: Optional[str] = None
    severity: Optional[str] = None        # mild | moderate | severe


@router.post("/Condition", status_code=201)
async def create_condition(condition: FHIRConditionCreate):
    """Create a FHIR R4 Condition resource (diagnosis/problem)."""
    fhir_id = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    return {
        "resourceType": "Condition",
        "id": fhir_id,
        "meta": {"versionId": "1", "lastUpdated": now},
        "clinicalStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": condition.clinical_status}]
        },
        "verificationStatus": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": condition.verification_status}]
        },
        "code": {
            "coding": [{"system": condition.code_system, "code": condition.code_code or "unknown",
                        "display": condition.code_text}],
            "text": condition.code_text
        },
        "subject": {"reference": f"Patient/{condition.subject_patient_id}"},
        "onsetDateTime": condition.onset_datetime or now,
        "note": [{"text": condition.note}] if condition.note else [],
    }


@router.get("/Condition")
async def list_conditions(patient: Optional[str] = Query(None)):
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}


@router.get("/Condition/{condition_id}")
async def get_condition(condition_id: str):
    return {"resourceType": "Condition", "id": condition_id,
            "meta": {"lastUpdated": datetime.utcnow().isoformat() + "Z"}}
