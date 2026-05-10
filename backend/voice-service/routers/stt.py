"""
Voice Service — Deepgram Speech-to-Text Router
Real-time and batch clinical transcription
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import Optional
from deepgram import DeepgramClient, PrerecordedOptions, FileSource
import os, structlog

router = APIRouter()
logger = structlog.get_logger()


class TranscriptionResponse(BaseModel):
    transcript: str
    confidence: float
    words: list
    speaker_count: Optional[int] = None
    duration_seconds: Optional[float] = None


@router.post("/stt/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (wav, mp3, m4a, ogg)"),
    language: str = Form(default="en-US"),
    model: str = Form(default="nova-2-medical"),
    diarize: bool = Form(default=True, description="Speaker diarization"),
    smart_format: bool = Form(default=True),
):
    """
    Transcribe audio using Deepgram nova-2-medical model.
    Optimized for clinical dictation and doctor-patient conversations.
    """
    api_key = os.getenv("DEEPGRAM_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Deepgram API key not configured")

    try:
        client = DeepgramClient(api_key)
        audio_data = await audio.read()

        options = PrerecordedOptions(
            model=model,
            language=language,
            smart_format=smart_format,
            diarize=diarize,
            punctuate=True,
            utterances=True,
            numerals=True,
        )

        response = await client.listen.asyncprerecorded.v("1").transcribe_file(
            {"buffer": audio_data, "mimetype": audio.content_type},
            options,
        )

        result = response.results.channels[0].alternatives[0]
        words = [
            {"word": w.word, "start": w.start, "end": w.end, "confidence": w.confidence}
            for w in (result.words or [])
        ]

        speaker_count = None
        if diarize and response.results.utterances:
            speakers = {u.speaker for u in response.results.utterances}
            speaker_count = len(speakers)

        logger.info("transcription_complete",
                    transcript_length=len(result.transcript),
                    confidence=result.confidence)

        return TranscriptionResponse(
            transcript=result.transcript,
            confidence=result.confidence,
            words=words,
            speaker_count=speaker_count,
            duration_seconds=response.metadata.duration if response.metadata else None,
        )

    except Exception as e:
        logger.error("transcription_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
