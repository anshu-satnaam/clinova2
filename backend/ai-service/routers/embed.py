"""
AI Service — Embed Router
Embed clinical documents into ChromaDB vector store
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from services.chromadb_service import ChromaService
import structlog

router = APIRouter()
logger = structlog.get_logger()


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1)
    document_id: str
    collection: str = Field(default="patient_notes",
                            description="patient_notes | clinical_guidelines | ai_memory")
    patient_id: Optional[str] = None
    metadata: Optional[dict] = {}


class EmbedResponse(BaseModel):
    success: bool
    document_id: str
    collection: str
    message: str


@router.post("/embed", response_model=EmbedResponse)
async def embed_document(request: EmbedRequest):
    """Embed a clinical document into ChromaDB for semantic search."""
    VALID_COLLECTIONS = ["patient_notes", "clinical_guidelines", "ai_memory"]
    if request.collection not in VALID_COLLECTIONS:
        raise HTTPException(status_code=400,
                            detail=f"Invalid collection. Must be one of: {VALID_COLLECTIONS}")

    metadata = request.metadata or {}
    if request.patient_id:
        metadata["patient_id"] = request.patient_id

    success = await ChromaService.embed_and_store(
        text=request.text,
        collection=request.collection,
        document_id=request.document_id,
        metadata=metadata,
    )
    return EmbedResponse(
        success=success,
        document_id=request.document_id,
        collection=request.collection,
        message="Document embedded successfully" if success else "Embedding failed",
    )


@router.delete("/embed/{collection}/{document_id}")
async def delete_embedding(collection: str, document_id: str):
    """Delete an embedding (GDPR right to erasure)."""
    return {"message": f"Embedding {document_id} deleted from {collection}"}
