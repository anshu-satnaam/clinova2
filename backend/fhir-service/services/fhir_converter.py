"""
FHIR Service — FHIR Converter
HL7 v2 parsed dict → FHIR R4 Patient resource
"""
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime


class FHIRConverter:
    @staticmethod
    def hl7_to_fhir_patient(parsed: Dict[str, Any]) -> Dict:
        """Convert a parsed HL7 v2 PID segment to FHIR R4 Patient resource."""
        patient_data = parsed.get("patient", {})
        fhir_id = str(uuid4())
        now = datetime.utcnow().isoformat() + "Z"

        resource = {
            "resourceType": "Patient",
            "id": fhir_id,
            "meta": {
                "versionId": "1",
                "lastUpdated": now,
                "source": "hl7-v2-adt",
            },
            "active": True,
        }

        # Name
        family = patient_data.get("family_name", "")
        given = patient_data.get("given_name", "")
        if family or given:
            resource["name"] = [{"use": "official", "family": family, "given": [given] if given else []}]

        # Gender mapping (HL7 → FHIR)
        gender_map = {"M": "male", "F": "female", "O": "other", "U": "unknown"}
        hl7_gender = patient_data.get("gender", "U")
        resource["gender"] = gender_map.get(hl7_gender.upper(), "unknown")

        # Date of birth (HL7 format: YYYYMMDD → FHIR: YYYY-MM-DD)
        dob = patient_data.get("date_of_birth", "")
        if dob and len(dob) >= 8:
            resource["birthDate"] = f"{dob[:4]}-{dob[4:6]}-{dob[6:8]}"

        # Phone
        phone = patient_data.get("phone", "")
        if phone:
            resource["telecom"] = [{"system": "phone", "value": phone, "use": "home"}]

        # Identifier (original HL7 patient ID)
        patient_id = patient_data.get("patient_id", "")
        if patient_id:
            resource["identifier"] = [{
                "system": "urn:hl7:pid-3",
                "value": patient_id,
            }]

        return resource

    @staticmethod
    def hl7_observations_to_fhir(parsed: Dict[str, Any], patient_fhir_id: str) -> list:
        """Convert HL7 OBX segments to FHIR Observation resources."""
        observations = []
        for obx in parsed.get("observations", []):
            obs = {
                "resourceType": "Observation",
                "id": str(uuid4()),
                "status": "final",
                "code": {"text": obx.get("observation_id", "Unknown")},
                "subject": {"reference": f"Patient/{patient_fhir_id}"},
                "valueString": obx.get("observation_value", ""),
                "referenceRange": [{"text": obx.get("reference_range", "")}] if obx.get("reference_range") else [],
            }
            observations.append(obs)
        return observations
