"""
Clinova FHIR Service — FastAPI
HL7 v2 → FHIR R4 conversion and storage
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from routers import patients, observations, conditions, medications
from services.kafka_service import KafkaService

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🏥 Clinova FHIR Service starting up...")
    await KafkaService.initialize()
    logger.info("✅ FHIR Service ready")
    yield
    await KafkaService.close()


app = FastAPI(
    title="Clinova FHIR Service",
    description=(
        "FHIR R4 compliant service for Clinova Healthcare Platform. "
        "Implements Patient, Observation, Condition and MedicationRequest resources. "
        "Supports HL7 v2 message ingestion and FHIR JSON conversion."
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

app.include_router(patients.router,     prefix="/fhir/R4", tags=["Patient"])
app.include_router(observations.router, prefix="/fhir/R4", tags=["Observation"])
app.include_router(conditions.router,   prefix="/fhir/R4", tags=["Condition"])
app.include_router(medications.router,  prefix="/fhir/R4", tags=["MedicationRequest"])

@app.get("/")
async def root():
    return {"status": "online", "service": "Clinova FHIR Service"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy", "service": "clinova-fhir-service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", os.getenv("FHIR_SERVICE_PORT", 8002)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
