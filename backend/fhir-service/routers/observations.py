"""
FHIR Service — Observation Router
FHIR R4 Observation resources (vitals, lab results, symptoms)
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from uuid import uuid4
from datetime import datetime

router = APIRouter()


class ObservationValue(BaseModel):
    value: float
    unit: str
    system: str = "http://unitsofmeasure.org"


class FHIRObservationCreate(BaseModel):
    resourceType: str = "Observation"
    status: str = "final"
    category: Optional[str] = "vital-signs"
    code_text: str
    code_system: str = "http://loinc.org"
    code_code: Optional[str] = None
    subject_patient_id: str
    value: Optional[ObservationValue] = None
    effective_datetime: Optional[str] = None
    note: Optional[str] = None


@router.post("/Observation", status_code=201)
async def create_observation(obs: FHIRObservationCreate):
    """Create a FHIR R4 Observation resource (vital signs, lab results, symptoms)."""
    fhir_id = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    resource = {
        "resourceType": "Observation",
        "id": fhir_id,
        "meta": {"versionId": "1", "lastUpdated": now},
        "status": obs.status,
        "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                   "code": obs.category, "display": obs.category}]}],
        "code": {"coding": [{"system": obs.code_system, "code": obs.code_code or "unknown",
                              "display": obs.code_text}], "text": obs.code_text},
        "subject": {"reference": f"Patient/{obs.subject_patient_id}"},
        "effectiveDateTime": obs.effective_datetime or now,
    }
    if obs.value:
        resource["valueQuantity"] = {"value": obs.value.value, "unit": obs.value.unit,
                                      "system": obs.value.system, "code": obs.value.unit}
    if obs.note:
        resource["note"] = [{"text": obs.note}]
    return resource


@router.get("/Observation")
async def list_observations(patient: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    """List FHIR Observations, optionally filtered by patient."""
    # In production: query from PostgreSQL fhir_resources table
    return {"resourceType": "Bundle", "type": "searchset", "total": 0, "entry": []}


@router.get("/Observation/{obs_id}")
async def get_observation(obs_id: str):
    """Get a specific FHIR Observation by ID."""
    return {"resourceType": "Observation", "id": obs_id, "status": "final",
            "meta": {"lastUpdated": datetime.utcnow().isoformat() + "Z"}}
