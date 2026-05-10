"""
AI Service — Workflow Router
Run named LangGraph workflows by type
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from workflows.clinical_assessment import clinical_assessment_graph
import structlog
from uuid import uuid4

router = APIRouter()
logger = structlog.get_logger()

WORKFLOWS = {
    "clinical_assessment": clinical_assessment_graph,
}


class WorkflowRequest(BaseModel):
    workflow_name: str = Field(..., description="clinical_assessment | diagnosis | summary")
    patient_id: str
    input_text: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    metadata: Optional[dict] = {}


class WorkflowResponse(BaseModel):
    session_id: str
    workflow_name: str
    status: str
    result: dict
    requires_doctor_approval: bool = True


@router.post("/workflow", response_model=WorkflowResponse)
async def run_workflow(request: WorkflowRequest):
    """Run a LangGraph clinical AI workflow by name."""
    graph = WORKFLOWS.get(request.workflow_name)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown workflow: {request.workflow_name}. Available: {list(WORKFLOWS.keys())}"
        )

    session_id = request.session_id or str(uuid4())

    try:
        result = await graph.ainvoke({
            "raw_input": request.input_text,
            "patient_id": request.patient_id,
            "session_id": session_id,
        })
        final = result.get("final_output", result)
        logger.info("workflow_complete", name=request.workflow_name, session_id=session_id)

        return WorkflowResponse(
            session_id=session_id,
            workflow_name=request.workflow_name,
            status="completed" if not result.get("error") else "failed",
            result=final,
            requires_doctor_approval=final.get("requires_doctor_approval", True),
        )
    except Exception as e:
        logger.error("workflow_error", name=request.workflow_name, error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/workflow/list")
async def list_workflows():
    """List all available LangGraph workflows."""
    return {
        "workflows": [
            {"name": "clinical_assessment", "description": "Full 8-node clinical assessment pipeline"},
        ]
    }
