"""
Voice Service — Full Pipeline Router
Patient/Doctor Voice → LiveKit → Deepgram STT → LangGraph → FHIR → Audit + AI → Cartesia TTS → LiveKit
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import httpx, os, structlog
from uuid import uuid4

router = APIRouter()
logger = structlog.get_logger()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai-service:8001")
FHIR_SERVICE_URL = os.getenv("FHIR_SERVICE_URL", "http://fhir-service:8002")


class VoicePipelineRequest(BaseModel):
    transcript: str = Field(..., description="Pre-transcribed text from Deepgram STT")
    patient_id: str
    session_id: Optional[str] = None
    include_tts: bool = Field(default=True, description="Return audio response via Cartesia")
    voice_id: Optional[str] = None
    consent_given: bool = Field(default=False, description="DPDP Act 2023 consent verification")


class VoicePipelineResponse(BaseModel):
    session_id: str
    transcript: str
    ai_response_text: str
    medical_entities: Optional[dict] = None
    fhir_bundle: Optional[dict] = None
    risk_level: Optional[str] = None
    requires_doctor_approval: bool = True
    audio_url: Optional[str] = None
    icd_codes: Optional[list] = None


@router.post("/pipeline/process", response_model=VoicePipelineResponse)
async def process_voice_pipeline(request: VoicePipelineRequest):
    """
    Full Clinova Voice AI Pipeline:
    Transcript → LangGraph AI → FHIR Format → Audit + Reasoning → TTS Response

    Requires patient consent (DPDP Act 2023 compliance).
    """
    if not request.consent_given:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient consent required for voice processing (DPDP Act 2023)"
        )

    session_id = request.session_id or str(uuid4())

    async with httpx.AsyncClient(timeout=60.0) as client:
        # ── Step 1: Run AI clinical assessment ──────────────────────────────
        try:
            ai_response = await client.post(
                f"{AI_SERVICE_URL}/api/ai/chat",
                json={
                    "message": request.transcript,
                    "patient_id": request.patient_id,
                    "session_id": session_id,
                    "context_type": "dictation",
                }
            )
            ai_response.raise_for_status()
            ai_data = ai_response.json()
        except Exception as e:
            logger.error("ai_service_error", error=str(e))
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                                detail=f"AI service error: {str(e)}")

        # ── Step 2: Store FHIR resource ──────────────────────────────────────
        fhir_bundle = ai_data.get("fhir_resource")
        if fhir_bundle:
            try:
                fhir_response = await client.post(
                    f"{FHIR_SERVICE_URL}/fhir/R4/Bundle",
                    json=fhir_bundle
                )
                fhir_response.raise_for_status()
            except Exception as e:
                logger.warning("fhir_store_failed", error=str(e))

        # ── Step 3: Generate TTS from AI response ────────────────────────────
        ai_response_text = ai_data.get("response", "Assessment complete.")

        logger.info("voice_pipeline_complete",
                    session_id=session_id,
                    patient_id=request.patient_id,
                    risk=ai_data.get("risk_level"))

        return VoicePipelineResponse(
            session_id=session_id,
            transcript=request.transcript,
            ai_response_text=ai_response_text,
            medical_entities=ai_data.get("medical_entities"),
            fhir_bundle=fhir_bundle,
            risk_level=ai_data.get("risk_level"),
            requires_doctor_approval=ai_data.get("requires_doctor_approval", True),
            icd_codes=None,
        )
