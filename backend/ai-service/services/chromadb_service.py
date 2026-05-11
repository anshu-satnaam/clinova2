"""
AI Service — ChromaDB Service
Vector embeddings for patient notes, clinical guidelines, AI memory
"""
import chromadb
from chromadb.config import Settings
from typing import Optional, List, Dict, Any
import os, structlog

logger = structlog.get_logger()


class ChromaService:
    _client: Optional[chromadb.AsyncHttpClient] = None
    _collections: Dict[str, Any] = {}

    COLLECTIONS = ["patient_notes", "clinical_guidelines", "ai_memory"]

    @classmethod
    async def initialize(cls):
        """Initialize ChromaDB client."""
        host = os.getenv("CHROMA_HOST", "clinova-chroma")
        port = int(os.getenv("CHROMA_PORT", "10000"))

        try:
            cls._client = await chromadb.AsyncHttpClient(host=host, port=port)
            # Pre-create collections
            for collection_name in cls.COLLECTIONS:
                cls._collections[collection_name] = await cls._client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
            logger.info("chromadb_initialized", collections=cls.COLLECTIONS)
        except Exception as e:
            logger.error("chromadb_init_failed", error=str(e))
            cls._client = None

    @classmethod
    async def embed_and_store(cls, text: str, collection: str, document_id: str, metadata: Optional[Dict] = None) -> bool:
        """Store text (Chroma handles embedding on server side if configured, or we skip for now)."""
        if not cls._client or collection not in cls._collections:
            return False
        try:
            # We use Chroma's default embedding function (server-side) to save local RAM
            await cls._collections[collection].upsert(
                ids=[document_id],
                documents=[text],
                metadatas=[metadata or {}],
            )
            return True
        except Exception as e:
            logger.error("embed_failed", error=str(e))
            return False

    @classmethod
    async def search(cls, query: str, collection: str, n_results: int = 5, where: Optional[Dict] = None) -> List[Dict]:
        """Search in ChromaDB."""
        if collection not in cls._collections:
            return []
        try:
            results = await cls._collections[collection].query(
                query_texts=[query],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
            docs = []
            if results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    docs.append({
                        "text": doc,
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i],
                    })
            return docs
        except Exception as e:
            logger.error("search_failed", error=str(e))
            return []

    @classmethod
    async def delete_patient_data(cls, patient_id: str):
        """GDPR/DPDP: Delete all patient embeddings."""
        for collection in cls._collections.values():
            try:
                await collection.delete(where={"patient_id": patient_id})
                logger.info("patient_data_deleted", patient_id=patient_id)
            except Exception as e:
                logger.error("delete_failed", patient_id=patient_id, error=str(e))
