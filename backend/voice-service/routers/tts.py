"""
Voice Service — Cartesia TTS Router
Ultra-low latency text-to-speech for AI voice responses
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
import httpx, os, structlog

router = APIRouter()
logger = structlog.get_logger()

CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes"


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    voice_id: Optional[str] = None
    language: str = Field(default="en")
    output_format: str = Field(default="mp3_44100_128",
                               description="mp3_44100_128 | pcm_16000 | pcm_44100")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


@router.post("/tts/synthesize")
async def synthesize_speech(request: TTSRequest):
    """
    Convert text to speech using Cartesia's ultra-low latency TTS API.
    Used for AI doctor assistant voice responses and audit report reading.
    """
    api_key = os.getenv("CARTESIA_API_KEY", "")
    voice_id = request.voice_id or os.getenv("CARTESIA_VOICE_ID", "")

    if not api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Cartesia API key not configured")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                CARTESIA_API_URL,
                headers={
                    "X-API-Key": api_key,
                    "Cartesia-Version": "2024-06-10",
                    "Content-Type": "application/json",
                },
                json={
                    "model_id": "sonic-english",
                    "transcript": request.text,
                    "voice": {"mode": "id", "id": voice_id},
                    "output_format": {
                        "container": "mp3",
                        "encoding": "mp3",
                        "sample_rate": 44100,
                    },
                    "language": request.language,
                    "speed": request.speed,
                },
            )
            response.raise_for_status()

        logger.info("tts_synthesized", text_length=len(request.text))

        return StreamingResponse(
            iter([response.content]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"},
        )

    except httpx.HTTPStatusError as e:
        logger.error("cartesia_api_error", status=e.response.status_code, error=str(e))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Cartesia API error: {e.response.text}")
    except Exception as e:
        logger.error("tts_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
