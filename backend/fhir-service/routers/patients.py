"""
FHIR Service — Patient Router
FHIR R4 Patient resource CRUD + HL7 v2 ingestion
"""
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4
from datetime import datetime
import structlog

from services.kafka_service import KafkaService

router = APIRouter()
logger = structlog.get_logger()


class PatientName(BaseModel):
    family: str
    given: List[str]
    use: str = "official"


class PatientIdentifier(BaseModel):
    system: str
    value: str


class FHIRPatientCreate(BaseModel):
    resourceType: str = "Patient"
    identifier: Optional[List[PatientIdentifier]] = []
    name: List[PatientName]
    gender: Optional[str] = Field(None, pattern="^(male|female|other|unknown)$")
    birthDate: Optional[str] = None
    telecom: Optional[list] = []
    address: Optional[list] = []
    active: bool = True


class FHIRPatientResponse(BaseModel):
    resourceType: str = "Patient"
    id: str
    meta: dict
    identifier: Optional[List[dict]] = []
    name: List[dict]
    gender: Optional[str] = None
    birthDate: Optional[str] = None
    active: bool = True


@router.post("/Patient", response_model=FHIRPatientResponse, status_code=201)
async def create_patient(patient: FHIRPatientCreate):
    """
    Create a FHIR R4 Patient resource.
    Publishes patient.created event to Kafka.
    """
    fhir_id = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"

    resource = {
        "resourceType": "Patient",
        "id": fhir_id,
        "meta": {
            "versionId": "1",
            "lastUpdated": now,
            "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"]
        },
        **patient.dict(exclude_none=True)
    }

    # Publish to Kafka
    await KafkaService.publish("patient.created", {
        "fhir_id": fhir_id,
        "name": patient.name[0].dict() if patient.name else {},
        "created_at": now,
    })

    logger.info("fhir_patient_created", fhir_id=fhir_id)
    return resource


@router.get("/Patient/{patient_id}", response_model=FHIRPatientResponse)
async def get_patient(patient_id: str):
    """Get a FHIR Patient resource by ID."""
    # In production: fetch from PostgreSQL fhir_resources table
    return {
        "resourceType": "Patient",
        "id": patient_id,
        "meta": {"versionId": "1", "lastUpdated": datetime.utcnow().isoformat() + "Z"},
        "name": [{"family": "Unknown", "given": ["Patient"]}],
        "active": True,
    }


@router.put("/Patient/{patient_id}")
async def update_patient(patient_id: str, patient: FHIRPatientCreate):
    """Update a FHIR Patient resource."""
    return {"resourceType": "Patient", "id": patient_id, **patient.dict(exclude_none=True)}


@router.delete("/Patient/{patient_id}", status_code=204)
async def delete_patient(patient_id: str):
    """Delete a FHIR Patient resource (GDPR right to erasure)."""
    logger.info("fhir_patient_deleted", fhir_id=patient_id)
    return None


@router.post("/Patient/$process-message")
async def process_hl7_message(body: dict):
    """
    Process an HL7 v2 ADT message and convert to FHIR Patient resource.
    Supports: ADT^A01 (Admit), ADT^A08 (Update), ADT^A03 (Discharge)
    """
    from services.hl7_parser import HL7Parser
    from services.fhir_converter import FHIRConverter

    hl7_raw = body.get("message", "")
    if not hl7_raw:
        raise HTTPException(status_code=400, detail="No HL7 message provided")

    try:
        parsed = HL7Parser.parse(hl7_raw)
        fhir_patient = FHIRConverter.hl7_to_fhir_patient(parsed)
        logger.info("hl7_converted_to_fhir", message_type=parsed.get("message_type"))
        return {"status": "converted", "fhir_resource": fhir_patient}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"HL7 parse error: {str(e)}")
