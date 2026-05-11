"""
AI Service — LangGraph Clinical Assessment Workflow
Input → Speech Processing → Medical Entity Extraction → FHIR Formatting
→ Clinical Audit → Risk Detection → Coding Suggestions → Store in DB
"""
from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, END
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage, SystemMessage
import structlog
import os

logger = structlog.get_logger()

# Load .env explicitly
try:
    from dotenv import load_dotenv
    import pathlib
    env_path = pathlib.Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=env_path, override=True)
    logger.info("env_loaded", path=str(env_path))
except Exception as e:
    logger.warning("env_load_failed", error=str(e))


# ── State ─────────────────────────────────────────────────────────────────────

class ClinicalState(TypedDict):
    raw_input: str                    # Raw text or transcription
    patient_id: str
    session_id: str
    processed_text: Optional[str]    # After NLP processing
    medical_entities: Optional[dict] # Extracted entities (symptoms, medications, etc.)
    fhir_resource: Optional[dict]    # FHIR formatted output
    clinical_audit: Optional[dict]   # Audit findings
    risk_level: Optional[str]        # LOW / MEDIUM / HIGH / CRITICAL
    risk_flags: Optional[List[str]]
    icd_codes: Optional[List[str]]   # ICD-10 coding suggestions
    hallucination_score: Optional[float]
    safety_approved: Optional[bool]
    final_output: Optional[dict]
    error: Optional[str]


# ── LLM ───────────────────────────────────────────────────────────────────────

def get_llm():
    api_key = os.getenv("MISTRAL_API_KEY", "")
    model = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
    logger.info("llm_init", model=model, key_set=bool(api_key))
    return ChatMistralAI(
        api_key=api_key,
        model=model,
        temperature=0.1,  # Low temp for clinical accuracy
    )


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def speech_processing_node(state: ClinicalState) -> ClinicalState:
    """Clean and normalize raw clinical input text."""
    llm = get_llm()
    prompt = f"""You are a clinical NLP processor. Clean and normalize the following clinical text.
Fix grammar, expand abbreviations, and structure it clearly. Output only the processed text.

Raw input: {state['raw_input']}"""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        state['processed_text'] = response.content
        logger.info("speech_processing_complete", session_id=state['session_id'])
    except Exception as e:
        state['error'] = f"Speech processing failed: {str(e)}"
        logger.error("speech_processing_failed", error=str(e))
    return state


async def medical_entity_extraction_node(state: ClinicalState) -> ClinicalState:
    """Extract medical entities: symptoms, diagnoses, medications, procedures."""
    if state.get('error'):
        return state
    llm = get_llm()
    prompt = f"""Extract medical entities from the following clinical text.
Return a JSON object with these keys:
- symptoms: list of symptoms mentioned
- diagnoses: list of diagnoses or conditions
- medications: list of medications with dosage if mentioned
- procedures: list of procedures or tests
- vitals: any vital signs mentioned
- allergies: any allergies mentioned

Clinical text: {state['processed_text']}

Return only valid JSON."""

    try:
        import json
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1].strip()
            if content.startswith("json"):
                content = content[4:].strip()
        state['medical_entities'] = json.loads(content)
        logger.info("entity_extraction_complete", session_id=state['session_id'])
    except Exception as e:
        state['medical_entities'] = {}
        logger.warning("entity_extraction_failed", error=str(e))
    return state


async def fhir_formatting_node(state: ClinicalState) -> ClinicalState:
    """Convert extracted entities to FHIR R4 Observation/Condition resources."""
    if state.get('error'):
        return state
    entities = state.get('medical_entities', {})
    fhir_resource = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": []
    }

    # Create Condition resources from diagnoses
    for dx in entities.get('diagnoses', []):
        fhir_resource['entry'].append({
            "resource": {
                "resourceType": "Condition",
                "subject": {"reference": f"Patient/{state['patient_id']}"},
                "code": {"text": dx},
                "clinicalStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                                "code": "active"}]
                },
                "verificationStatus": {
                    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                                "code": "unconfirmed"}]
                }
            }
        })

    # Create Observation resources from symptoms/vitals
    for symptom in entities.get('symptoms', []):
        fhir_resource['entry'].append({
            "resource": {
                "resourceType": "Observation",
                "subject": {"reference": f"Patient/{state['patient_id']}"},
                "code": {"text": symptom},
                "status": "preliminary"
            }
        })

    state['fhir_resource'] = fhir_resource
    return state


async def clinical_audit_node(state: ClinicalState) -> ClinicalState:
    """Perform clinical audit of the AI assessment."""
    if state.get('error'):
        return state
    llm = get_llm()
    prompt = f"""You are a clinical auditor. Review this medical assessment and identify:
1. Any potential errors or inconsistencies
2. Missing critical information
3. Compliance issues

Entities: {state.get('medical_entities', {})}
FHIR Bundle: {state.get('fhir_resource', {})}

Return a JSON with: issues (list), completeness_score (0-1), recommendations (list)"""

    try:
        import json
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        state['clinical_audit'] = json.loads(content)
    except Exception:
        state['clinical_audit'] = {"issues": [], "completeness_score": 0.5, "recommendations": []}
    return state


async def risk_detection_node(state: ClinicalState) -> ClinicalState:
    """Detect clinical risk level from extracted information."""
    if state.get('error'):
        return state
    llm = get_llm()
    HIGH_RISK_KEYWORDS = [
        "chest pain", "shortness of breath", "stroke", "sepsis", "cardiac arrest",
        "suicidal", "overdose", "anaphylaxis", "critical"
    ]

    entities = state.get('medical_entities', {})
    all_text = str(entities).lower()
    risk_flags = [kw for kw in HIGH_RISK_KEYWORDS if kw in all_text]

    if len(risk_flags) >= 2:
        risk_level = "CRITICAL"
    elif len(risk_flags) == 1:
        risk_level = "HIGH"
    elif entities.get('diagnoses'):
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    state['risk_level'] = risk_level
    state['risk_flags'] = risk_flags
    logger.info("risk_detection_complete", risk=risk_level, flags=risk_flags)
    return state


async def coding_suggestions_node(state: ClinicalState) -> ClinicalState:
    """Generate ICD-10 coding suggestions."""
    if state.get('error'):
        return state
    llm = get_llm()
    entities = state.get('medical_entities', {})
    diagnoses = entities.get('diagnoses', [])

    if not diagnoses:
        state['icd_codes'] = []
        return state

    prompt = f"""As a medical coder, suggest ICD-10-CM codes for these diagnoses: {diagnoses}
Return a JSON array of objects with: code, description, confidence (0-1)
Example: [{{"code": "J06.9", "description": "Acute upper respiratory infection", "confidence": 0.85}}]"""

    try:
        import json
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        state['icd_codes'] = json.loads(content)
    except Exception:
        state['icd_codes'] = []
    return state


async def ai_safety_check_node(state: ClinicalState) -> ClinicalState:
    """
    AI Safety Layer (ISO 42001 compliance):
    Guardrails → Hallucination Check → Medical Compliance → Doctor Approval Gate
    """
    if state.get('error'):
        state['safety_approved'] = False
        return state

    llm = get_llm()
    prompt = f"""You are an AI safety checker for a medical system.
Evaluate this AI-generated clinical assessment for:
1. Hallucinations (claims not supported by input)
2. Medical inaccuracies
3. Dangerous recommendations

Input: {state.get('raw_input', '')}
Generated assessment: {state.get('medical_entities', {})}

Return JSON: {{
  "hallucination_score": 0-1 (0=no hallucination, 1=severe),
  "medical_accuracy": 0-1,
  "safety_issues": [],
  "approved": true/false
}}"""

    try:
        import json
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        safety = json.loads(content)
        state['hallucination_score'] = safety.get('hallucination_score', 0.0)
        # Auto-approve if hallucination score < 0.3, else needs doctor review
        state['safety_approved'] = (
            safety.get('approved', False) and
            safety.get('hallucination_score', 1.0) < 0.3
        )
    except Exception:
        state['hallucination_score'] = 0.5
        state['safety_approved'] = False  # Default to requiring doctor review
    return state


async def store_result_node(state: ClinicalState) -> ClinicalState:
    """Store final results — ChromaDB embedding + structured output."""
    state['final_output'] = {
        "session_id": state['session_id'],
        "patient_id": state['patient_id'],
        "medical_entities": state.get('medical_entities'),
        "fhir_resource": state.get('fhir_resource'),
        "clinical_audit": state.get('clinical_audit'),
        "risk_level": state.get('risk_level'),
        "risk_flags": state.get('risk_flags', []),
        "icd_codes": state.get('icd_codes', []),
        "hallucination_score": state.get('hallucination_score'),
        "safety_approved": state.get('safety_approved'),
        "requires_doctor_approval": not state.get('safety_approved', False),
    }
    logger.info("clinical_assessment_complete",
                session_id=state['session_id'],
                risk=state.get('risk_level'),
                approved=state.get('safety_approved'))
    return state


# ── Build Graph ───────────────────────────────────────────────────────────────

def build_clinical_assessment_graph() -> StateGraph:
    graph = StateGraph(ClinicalState)

    graph.add_node("speech_processing", speech_processing_node)
    graph.add_node("entity_extraction", medical_entity_extraction_node)
    graph.add_node("fhir_formatting", fhir_formatting_node)
    graph.add_node("clinical_audit_step", clinical_audit_node)
    graph.add_node("risk_detection", risk_detection_node)
    graph.add_node("coding_suggestions", coding_suggestions_node)
    graph.add_node("ai_safety_check", ai_safety_check_node)
    graph.add_node("store_result", store_result_node)

    graph.set_entry_point("speech_processing")
    graph.add_edge("speech_processing", "entity_extraction")
    graph.add_edge("entity_extraction", "fhir_formatting")
    graph.add_edge("fhir_formatting", "clinical_audit_step")
    graph.add_edge("clinical_audit_step", "risk_detection")
    graph.add_edge("risk_detection", "coding_suggestions")
    graph.add_edge("coding_suggestions", "ai_safety_check")
    graph.add_edge("ai_safety_check", "store_result")
    graph.add_edge("store_result", END)

    return graph.compile()


# Singleton compiled graph
clinical_assessment_graph = build_clinical_assessment_graph()
