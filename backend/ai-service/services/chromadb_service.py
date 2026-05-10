"""
AI Service — ChromaDB Service
Vector embeddings for patient notes, clinical guidelines, AI memory
"""
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import Optional, List, Dict, Any
import os, structlog

logger = structlog.get_logger()


class ChromaService:
    _client: Optional[chromadb.AsyncHttpClient] = None
    _embedder: Optional[SentenceTransformer] = None
    _collections: Dict[str, Any] = {}

    COLLECTIONS = ["patient_notes", "clinical_guidelines", "ai_memory"]

    @classmethod
    async def initialize(cls):
        """Initialize ChromaDB client and create collections."""
        host = os.getenv("CHROMA_HOST", "localhost")
        port = int(os.getenv("CHROMA_PORT", "8000"))

        try:
            cls._client = await chromadb.AsyncHttpClient(host=host, port=port)
            cls._embedder = SentenceTransformer("all-MiniLM-L6-v2")

            for collection_name in cls.COLLECTIONS:
                cls._collections[collection_name] = await cls._client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
            logger.info("chromadb_initialized", collections=cls.COLLECTIONS)
        except Exception as e:
            logger.error("chromadb_init_failed", error=str(e))

    @classmethod
    async def embed_and_store(
        cls,
        text: str,
        collection: str,
        document_id: str,
        metadata: Optional[Dict] = None,
    ) -> bool:
        """Embed text and store in ChromaDB collection."""
        if collection not in cls._collections:
            logger.error("unknown_collection", collection=collection)
            return False
        try:
            embedding = cls._embedder.encode(text).tolist()
            await cls._collections[collection].upsert(
                ids=[document_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[metadata or {}],
            )
            logger.info("document_embedded", collection=collection, doc_id=document_id)
            return True
        except Exception as e:
            logger.error("embed_failed", error=str(e))
            return False

    @classmethod
    async def search(
        cls,
        query: str,
        collection: str,
        n_results: int = 5,
        where: Optional[Dict] = None,
    ) -> List[Dict]:
        """Semantic search in a ChromaDB collection."""
        if collection not in cls._collections:
            return []
        try:
            embedding = cls._embedder.encode(query).tolist()
            results = await cls._collections[collection].query(
                query_embeddings=[embedding],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"],
            )
            docs = []
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
