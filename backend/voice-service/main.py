"""
Clinova Voice Service — FastAPI
LiveKit + Deepgram STT + Cartesia TTS voice AI pipeline
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from routers import stt, tts, rooms, pipeline
from services.kafka_service import KafkaService

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🎙️ Clinova Voice Service starting up...")
    await KafkaService.initialize()
    logger.info("✅ Voice Service ready")
    yield
    await KafkaService.close()


app = FastAPI(
    title="Clinova Voice Service",
    description=(
        "Real-time voice AI pipeline for Clinova Healthcare Platform. "
        "LiveKit WebRTC rooms → Deepgram STT → LangGraph → Cartesia TTS. "
        "Supports doctor dictation, patient support bot, and medical voice summaries."
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

app.include_router(rooms.router,    prefix="/api/voice", tags=["rooms"])
app.include_router(stt.router,      prefix="/api/voice", tags=["speech-to-text"])
app.include_router(tts.router,      prefix="/api/voice", tags=["text-to-speech"])
app.include_router(pipeline.router, prefix="/api/voice", tags=["full-pipeline"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy", "service": "clinova-voice-service", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("VOICE_SERVICE_PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
