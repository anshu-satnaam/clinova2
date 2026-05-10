"""
AI Service — Chat Router
Clinical AI chat powered by LangGraph + Mistral
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4
import structlog

from workflows.clinical_assessment import clinical_assessment_graph
from services.chromadb_service import ChromaService
from services.kafka_service import KafkaService

router = APIRouter()
logger = structlog.get_logger()


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    patient_id: str
    session_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []
    context_type: str = Field(default="general", description="general | clinical | dictation")


class ChatResponse(BaseModel):
    session_id: str
    response: str
    medical_entities: Optional[dict] = None
    risk_level: Optional[str] = None
    requires_doctor_approval: bool = False
    hallucination_score: Optional[float] = None
    fhir_resource: Optional[dict] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Clinical AI chat endpoint.
    Runs through LangGraph ClinicalAssessmentGraph:
    Input → Speech Processing → Entity Extraction → FHIR Format
    → Clinical Audit → Risk Detection → ICD Coding → AI Safety → Output
    """
    session_id = request.session_id or str(uuid4())

    try:
        # Fetch relevant patient context from ChromaDB
        context_docs = await ChromaService.search(
            query=request.message,
            collection="patient_notes",
            n_results=3,
            where={"patient_id": request.patient_id}
        )

        # Build enriched input with context
        enriched_input = request.message
        if context_docs:
            context_text = "\n".join([doc['text'] for doc in context_docs])
            enriched_input = f"Patient context:\n{context_text}\n\nCurrent query:\n{request.message}"

        # Run LangGraph workflow
        result = await clinical_assessment_graph.ainvoke({
            "raw_input": enriched_input,
            "patient_id": request.patient_id,
            "session_id": session_id,
        })

        final = result.get("final_output", {})

        # Build human-readable response from final output
        response_text = _build_response_text(final, request.message)

        # Publish to Kafka
        await KafkaService.publish("diagnosis.generated", {
            "session_id": session_id,
            "patient_id": request.patient_id,
            "risk_level": final.get("risk_level"),
            "requires_doctor_approval": final.get("requires_doctor_approval"),
        })

        return ChatResponse(
            session_id=session_id,
            response=response_text,
            medical_entities=final.get("medical_entities"),
            risk_level=final.get("risk_level"),
            requires_doctor_approval=final.get("requires_doctor_approval", True),
            hallucination_score=final.get("hallucination_score"),
            fhir_resource=final.get("fhir_resource"),
        )

    except Exception as e:
        logger.error("chat_error", error=str(e), session_id=session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI workflow failed: {str(e)}"
        )


def _build_response_text(final: dict, original_query: str) -> str:
    """Build human-readable response from workflow output."""
    entities = final.get("medical_entities") or {}
    risk = final.get("risk_level", "UNKNOWN")
    icd_codes = final.get("icd_codes", [])
    requires_approval = final.get("requires_doctor_approval", True)

    lines = []
    if entities.get("diagnoses"):
        lines.append(f"**Potential diagnoses:** {', '.join(entities['diagnoses'])}")
    if entities.get("symptoms"):
        lines.append(f"**Identified symptoms:** {', '.join(entities['symptoms'])}")
    if entities.get("medications"):
        lines.append(f"**Medications noted:** {', '.join(entities['medications'])}")
    if icd_codes:
        codes = [f"{c.get('code')} ({c.get('description')})" for c in icd_codes[:3]]
        lines.append(f"**ICD-10 suggestions:** {', '.join(codes)}")

    lines.append(f"**Risk level:** {risk}")
    if requires_approval:
        lines.append("⚠️ **This assessment requires doctor review before finalizing.**")

    return "\n".join(lines) if lines else "Assessment complete. Please consult with a doctor for clinical decisions."


@router.get("/chat/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve a past AI session by ID."""
    return {"session_id": session_id, "message": "Session retrieval via DB not yet implemented"}
