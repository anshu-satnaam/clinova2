"""
Clinova Audit Service — FastAPI
HIPAA + ISO 42001 compliant audit trail logging
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from routers import audit
from services.kafka_service import KafkaConsumerService

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("📋 Clinova Audit Service starting up...")
    await KafkaConsumerService.start()
    logger.info("✅ Audit Service ready — consuming Kafka events")
    yield
    await KafkaConsumerService.stop()


app = FastAPI(
    title="Clinova Audit Service",
    description=(
        "HIPAA and ISO 42001 compliant audit logging service for Clinova. "
        "Consumes Kafka events and persists all PHI access, AI decisions, "
        "voice session logs and authentication events."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit.router, prefix="/api/audit", tags=["audit"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy", "service": "clinova-audit-service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("AUDIT_SERVICE_PORT", 8004))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
