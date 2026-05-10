"""
Voice Service — LiveKit Room Management
Create and manage WebRTC rooms for telehealth sessions
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from livekit import api
import os, structlog
from uuid import uuid4

router = APIRouter()
logger = structlog.get_logger()


class CreateRoomRequest(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    appointment_id: Optional[str] = None
    room_name: Optional[str] = None
    max_participants: int = Field(default=10, ge=2, le=50)
    empty_timeout: int = Field(default=300, description="Seconds to keep empty room alive")


class JoinRoomRequest(BaseModel):
    room_name: str
    participant_identity: str
    participant_name: str
    role: str = Field(default="patient", description="patient | doctor | nurse")


class RoomResponse(BaseModel):
    room_name: str
    token: str
    livekit_url: str
    participant_identity: str


@router.post("/rooms/create", response_model=RoomResponse)
async def create_room(request: CreateRoomRequest):
    """
    Create a LiveKit room for a telehealth session.
    Returns a token for the initiating participant.
    """
    room_name = request.room_name or f"clinova-{request.patient_id}-{uuid4().hex[:8]}"
    livekit_url = os.getenv("LIVEKIT_URL", "wss://localhost:7880")
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")

    try:
        # Create room via LiveKit API
        room_service = api.RoomServiceClient(livekit_url, api_key, api_secret)
        await room_service.create_room(
            api.CreateRoomRequest(
                name=room_name,
                empty_timeout=request.empty_timeout,
                max_participants=request.max_participants,
            )
        )

        # Generate access token for the patient
        token = api.AccessToken(api_key, api_secret)
        token.with_identity(f"patient-{request.patient_id}")
        token.with_name("Patient")
        token.with_grants(api.VideoGrants(room_join=True, room=room_name))
        jwt_token = token.to_jwt()

        logger.info("room_created", room=room_name, patient=request.patient_id)

        return RoomResponse(
            room_name=room_name,
            token=jwt_token,
            livekit_url=livekit_url,
            participant_identity=f"patient-{request.patient_id}",
        )
    except Exception as e:
        logger.error("room_creation_failed", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/rooms/join", response_model=RoomResponse)
async def join_room(request: JoinRoomRequest):
    """Generate a LiveKit token for joining an existing room."""
    livekit_url = os.getenv("LIVEKIT_URL", "wss://localhost:7880")
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")

    try:
        token = api.AccessToken(api_key, api_secret)
        token.with_identity(request.participant_identity)
        token.with_name(request.participant_name)

        # Doctors can publish and subscribe; patients can subscribe + publish audio
        grants = api.VideoGrants(
            room_join=True,
            room=request.room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=request.role == "doctor",
        )
        token.with_grants(grants)
        jwt_token = token.to_jwt()

        return RoomResponse(
            room_name=request.room_name,
            token=jwt_token,
            livekit_url=livekit_url,
            participant_identity=request.participant_identity,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/rooms/{room_name}")
async def delete_room(room_name: str):
    """End a LiveKit room session."""
    livekit_url = os.getenv("LIVEKIT_URL", "wss://localhost:7880")
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")

    try:
        room_service = api.RoomServiceClient(livekit_url, api_key, api_secret)
        await room_service.delete_room(api.DeleteRoomRequest(room=room_name))
        return {"message": f"Room {room_name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
