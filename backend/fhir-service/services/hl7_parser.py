"""
FHIR Service — HL7 v2 Parser
Parses HL7 v2 messages (ADT, ORU, ORM) into structured Python dicts
"""
import hl7
from typing import Dict, Any
import structlog

logger = structlog.get_logger()


class HL7Parser:
    @staticmethod
    def parse(raw_message: str) -> Dict[str, Any]:
        """
        Parse an HL7 v2 message string into a structured dict.
        Supports: ADT^A01, ADT^A08, ADT^A03, ORU^R01, ORM^O01
        """
        try:
            msg = hl7.parse(raw_message.strip())
            msh = msg['MSH'][0]
            message_type = str(msh[9])

            result = {
                "message_type": message_type,
                "sending_app": str(msh[3]),
                "sending_facility": str(msh[4]),
                "datetime": str(msh[7]),
                "message_control_id": str(msh[10]),
                "segments": {}
            }

            # Parse PID (Patient Identification)
            if 'PID' in msg:
                pid = msg['PID'][0]
                result["patient"] = {
                    "patient_id": str(pid[3]) if len(pid) > 3 else "",
                    "family_name": str(pid[5][0][0]) if len(pid) > 5 else "",
                    "given_name": str(pid[5][0][1]) if len(pid) > 5 and len(pid[5][0]) > 1 else "",
                    "date_of_birth": str(pid[7]) if len(pid) > 7 else "",
                    "gender": str(pid[8]) if len(pid) > 8 else "",
                    "address": str(pid[11]) if len(pid) > 11 else "",
                    "phone": str(pid[13]) if len(pid) > 13 else "",
                }

            # Parse PV1 (Patient Visit)
            if 'PV1' in msg:
                pv1 = msg['PV1'][0]
                result["visit"] = {
                    "patient_class": str(pv1[2]) if len(pv1) > 2 else "",
                    "attending_doctor": str(pv1[7]) if len(pv1) > 7 else "",
                    "admit_datetime": str(pv1[44]) if len(pv1) > 44 else "",
                }

            # Parse OBX (Observation) for ORU messages
            if 'OBX' in msg:
                observations = []
                for obx in msg['OBX']:
                    observations.append({
                        "value_type": str(obx[2]) if len(obx) > 2 else "",
                        "observation_id": str(obx[3]) if len(obx) > 3 else "",
                        "observation_value": str(obx[5]) if len(obx) > 5 else "",
                        "units": str(obx[6]) if len(obx) > 6 else "",
                        "reference_range": str(obx[7]) if len(obx) > 7 else "",
                        "status": str(obx[11]) if len(obx) > 11 else "",
                    })
                result["observations"] = observations

            logger.info("hl7_parsed", message_type=message_type)
            return result

        except Exception as e:
            logger.error("hl7_parse_failed", error=str(e))
            raise ValueError(f"Failed to parse HL7 message: {str(e)}")
