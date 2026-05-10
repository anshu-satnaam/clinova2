"""
AI Service — Diagnose Router
Differential diagnosis generation via Mistral
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage
import os, json, structlog

router = APIRouter()
logger = structlog.get_logger()


class DiagnoseRequest(BaseModel):
    symptoms: List[str] = Field(..., min_items=1)
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    medical_history: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    vital_signs: Optional[dict] = None
    patient_id: Optional[str] = None


class Diagnosis(BaseModel):
    condition: str
    icd10_code: Optional[str] = None
    probability: str      # High | Medium | Low
    reasoning: str
    recommended_tests: List[str] = []


class DiagnoseResponse(BaseModel):
    differential_diagnoses: List[Diagnosis]
    urgent: bool
    emergency_flag: bool
    immediate_action: Optional[str] = None
    requires_doctor_approval: bool = True


EMERGENCY_SYMPTOMS = [
    "chest pain", "shortness of breath", "difficulty breathing",
    "stroke symptoms", "loss of consciousness", "severe bleeding",
    "anaphylaxis", "cardiac arrest", "seizure"
]


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(request: DiagnoseRequest):
    """
    Generate AI differential diagnosis.
    Always requires doctor approval before clinical use.
    Flagged as emergency if high-risk symptoms detected.
    """
    llm = ChatMistralAI(
        api_key=os.getenv("MISTRAL_API_KEY"),
        model=os.getenv("MISTRAL_MODEL", "mistral-medium-latest"),
        temperature=0.05,
    )

    # Emergency flag
    symptoms_lower = " ".join(request.symptoms).lower()
    emergency = any(es in symptoms_lower for es in EMERGENCY_SYMPTOMS)

    prompt = f"""You are an expert clinical diagnostician. Generate a differential diagnosis.

Patient Information:
- Age: {request.patient_age or 'Unknown'}
- Gender: {request.patient_gender or 'Unknown'}
- Symptoms: {', '.join(request.symptoms)}
- Medical History: {', '.join(request.medical_history) if request.medical_history else 'None provided'}
- Current Medications: {', '.join(request.current_medications) if request.current_medications else 'None'}
- Vital Signs: {json.dumps(request.vital_signs) if request.vital_signs else 'Not provided'}

Generate top 3-5 differential diagnoses. Return ONLY valid JSON:
{{
  "differential_diagnoses": [
    {{
      "condition": "Diagnosis name",
      "icd10_code": "X00.0",
      "probability": "High|Medium|Low",
      "reasoning": "Clinical reasoning...",
      "recommended_tests": ["Test 1", "Test 2"]
    }}
  ],
  "urgent": true/false,
  "immediate_action": "If urgent, what action to take immediately"
}}

IMPORTANT: This is for doctor review only. Not for direct patient use."""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        data = json.loads(content)

        logger.info("diagnosis_generated",
                    patient_id=request.patient_id,
                    emergency=emergency,
                    diagnoses_count=len(data.get("differential_diagnoses", [])))

        return DiagnoseResponse(
            differential_diagnoses=data.get("differential_diagnoses", []),
            urgent=data.get("urgent", False) or emergency,
            emergency_flag=emergency,
            immediate_action=data.get("immediate_action"),
            requires_doctor_approval=True,  # Always True — AI Safety Layer
        )
    except Exception as e:
        logger.error("diagnose_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
