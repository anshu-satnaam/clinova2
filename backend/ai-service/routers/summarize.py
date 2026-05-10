"""
AI Service — Summarize Router
AI-powered medical note and audit report summarization
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage
import os, structlog

router = APIRouter()
logger = structlog.get_logger()


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50000)
    summary_type: str = Field(
        default="clinical_note",
        description="clinical_note | audit_report | discharge_summary | medication_list"
    )
    patient_id: Optional[str] = None
    max_length: int = Field(default=500, ge=100, le=2000)


class SummarizeResponse(BaseModel):
    summary: str
    key_points: list[str]
    summary_type: str
    word_count: int


SYSTEM_PROMPTS = {
    "clinical_note": (
        "You are a clinical documentation specialist. Summarize the following medical note "
        "concisely, preserving all critical clinical information. Use medical terminology."
    ),
    "audit_report": (
        "You are a medical auditor. Summarize this audit report, highlighting compliance issues, "
        "findings, and recommendations. The AI reads audit reports aloud, so make it clear and structured."
    ),
    "discharge_summary": (
        "You are a hospitalist. Create a clear discharge summary highlighting diagnosis, "
        "treatment provided, medications prescribed, and follow-up instructions."
    ),
    "medication_list": (
        "You are a clinical pharmacist. Summarize the medication list, noting dosages, "
        "frequencies, and any potential interactions."
    ),
}


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    """Summarize clinical notes, audit reports, or medical documents using Mistral."""
    llm = ChatMistralAI(
        api_key=os.getenv("MISTRAL_API_KEY"),
        model=os.getenv("MISTRAL_MODEL", "mistral-medium-latest"),
        temperature=0.1,
    )
    system_prompt = SYSTEM_PROMPTS.get(request.summary_type, SYSTEM_PROMPTS["clinical_note"])

    try:
        # Generate summary
        summary_response = await llm.ainvoke([
            HumanMessage(content=f"{system_prompt}\n\nText to summarize:\n{request.text}\n\n"
                                 f"Maximum length: {request.max_length} words. Be concise.")
        ])
        summary = summary_response.content

        # Extract key points
        key_points_response = await llm.ainvoke([
            HumanMessage(content=f"Extract 3-5 key clinical points from this text as a JSON array of strings:\n{request.text}\n\nReturn only the JSON array.")
        ])
        import json
        try:
            content = key_points_response.content.strip()
            if "```" in content:
                content = content.split("```")[1].replace("json", "").strip()
            key_points = json.loads(content)
        except Exception:
            key_points = ["See full summary for details"]

        return SummarizeResponse(
            summary=summary,
            key_points=key_points,
            summary_type=request.summary_type,
            word_count=len(summary.split()),
        )

    except Exception as e:
        logger.error("summarize_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
