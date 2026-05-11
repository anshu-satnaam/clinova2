"""
AI Service — Chat Router
Clinical AI chat powered by LangGraph + Mistral
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4
import os
import structlog
from dotenv import load_dotenv
import pathlib

# Load env
env_path = pathlib.Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

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


async def _generate_conversational_response(message: str, history: List[ChatMessage], entities: dict, risk_level: str, processed_text: str) -> str:
    """Generate a natural, contextual AI response using Mistral."""
    try:
        from langchain_mistralai import ChatMistralAI
        from langchain_core.messages import HumanMessage, SystemMessage

        api_key = os.getenv("MISTRAL_API_KEY", "")
        model = os.getenv("MISTRAL_MODEL", "mistral-medium-latest")
        llm = ChatMistralAI(api_key=api_key, model=model, temperature=0.3)

        history_text = ""
        if history:
            for h in history[-6:]:
                role = "Doctor" if h.role == "user" else "AI"
                history_text += f"\n{role}: {h.content}"

        system_prompt = """You are Clinova, an expert clinical AI assistant for medical professionals.
You help doctors with patient assessments, differential diagnoses, clinical notes, ICD-10 coding, and medication reviews.
CRITICAL RULES:
1. DEFAULT LENGTH: Keep responses extremely concise (1-4 lines maximum) unless the doctor specifically asks for a detailed explanation.
2. Directness: Do not use filler words. Be medically precise and fast.
3. Fallbacks: If you don't know, state it quickly.
4. Summary: If summarizing a record, strictly adhere to the 20-word limit.
Always remind that AI suggestions require doctor verification if providing a diagnosis."""

        user_context = f"""Conversation history:{history_text if history_text else ' None'}

Doctor's message: {message}

Clinical analysis performed:
- Processed text: {processed_text or message}
- Extracted entities: {entities}
- Risk level assessed: {risk_level}

Provide a helpful, specific clinical response addressing the doctor's actual question or message."""

        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_context)]
        response = await llm.ainvoke(messages)
        return response.content

    except Exception as e:
        logger.error("response_generation_failed", error=str(e))
        # Fallback: build structured response from entities
        return _build_fallback_response(entities, risk_level, message)


def _build_fallback_response(entities: dict, risk_level: str, original_query: str) -> str:
    """Fallback response builder when LLM call fails."""
    lines = []

    # Detect greeting/casual messages
    greetings = ["hello", "hi", "hey", "good morning", "good evening", "thanks", "thank you"]
    msg_lower = original_query.lower().strip()
    if any(msg_lower.startswith(g) for g in greetings) or len(original_query.split()) < 4:
        return f"Hello! I'm Clinova Clinical AI. How can I assist you with your clinical work today? You can ask me about patient assessments, differential diagnoses, ICD-10 codes, medication interactions, or FHIR documentation."

    if entities.get("diagnoses"):
        lines.append(f"**Potential diagnoses:** {', '.join(entities['diagnoses'])}")
    if entities.get("symptoms"):
        lines.append(f"**Identified symptoms:** {', '.join(entities['symptoms'])}")
    if entities.get("medications"):
        lines.append(f"**Medications noted:** {', '.join(entities['medications'])}")
    if entities.get("vitals"):
        lines.append(f"**Vitals:** {entities['vitals']}")

    if not lines:
        return "I've processed your message. Could you provide more clinical details so I can give you a thorough assessment? For example, mention symptoms, patient history, or specific clinical question."

    lines.append(f"\n**Clinical Risk Assessment:** {risk_level}")
    lines.append("⚠️ *All AI assessments require physician verification before clinical action.*")
    return "\n".join(lines)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Clinical AI chat endpoint.
    Runs LangGraph workflow then generates a natural conversational response.
    """
    session_id = request.session_id or str(uuid4())

    try:
        # Fetch relevant patient context from ChromaDB
        context_docs = []
        try:
            context_docs = await ChromaService.search(
                query=request.message,
                collection="patient_notes",
                n_results=3,
                where={"patient_id": request.patient_id}
            )
        except Exception:
            pass

        # Build enriched input with context
        enriched_input = request.message
        if context_docs:
            context_text = "\n".join([doc['text'] for doc in context_docs])
            enriched_input = f"Patient context:\n{context_text}\n\nCurrent query:\n{request.message}"

        # Run LangGraph clinical analysis workflow
        result = await clinical_assessment_graph.ainvoke({
            "raw_input": enriched_input,
            "patient_id": request.patient_id,
            "session_id": session_id,
        })

        final = result.get("final_output", {})
        entities = final.get("medical_entities") or {}
        risk_level = final.get("risk_level", "LOW")
        processed_text = result.get("processed_text", "")

        # Generate a natural, contextual response using the LLM
        response_text = await _generate_conversational_response(
            message=request.message,
            history=request.history or [],
            entities=entities,
            risk_level=risk_level,
            processed_text=processed_text,
        )

        # Publish to Kafka (non-blocking)
        try:
            await KafkaService.publish("diagnosis.generated", {
                "session_id": session_id,
                "patient_id": request.patient_id,
                "risk_level": risk_level,
                "requires_doctor_approval": final.get("requires_doctor_approval"),
            })
        except Exception:
            pass

        return ChatResponse(
            session_id=session_id,
            response=response_text,
            medical_entities=entities,
            risk_level=risk_level,
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


@router.get("/chat/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve a past AI session by ID."""
    return {"session_id": session_id, "message": "Session retrieval via DB not yet implemented"}
