"""
AI Service — Search Router
Semantic search over ChromaDB clinical embeddings
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from services.chromadb_service import ChromaService
import structlog

router = APIRouter()
logger = structlog.get_logger()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    collection: str = Field(default="patient_notes")
    n_results: int = Field(default=5, ge=1, le=20)
    patient_id: Optional[str] = None
    min_relevance: float = Field(default=0.5, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    text: str
    metadata: dict
    relevance_score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int
    collection: str


@router.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """
    Semantic search over clinical notes, guidelines, or AI memory.
    Uses sentence-transformers embeddings + ChromaDB cosine similarity.
    """
    where_filter = {}
    if request.patient_id:
        where_filter["patient_id"] = request.patient_id

    docs = await ChromaService.search(
        query=request.query,
        collection=request.collection,
        n_results=request.n_results,
        where=where_filter if where_filter else None,
    )

    # Filter by minimum relevance (1 - distance = similarity)
    results = [
        SearchResult(
            text=doc["text"],
            metadata=doc["metadata"],
            relevance_score=round(1 - doc["distance"], 4),
        )
        for doc in docs
        if (1 - doc["distance"]) >= request.min_relevance
    ]

    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results),
        collection=request.collection,
    )
