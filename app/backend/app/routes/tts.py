"""
ElevenLabs Text-to-Speech: synthesize speech for the voice agent (e.g. greeting).
Set ELEVENLABS_API_KEY in the environment. Optional: ELEVENLABS_VOICE_ID (default female voice).
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tts"])

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
# Default: Bella (female). Override with ELEVENLABS_VOICE_ID; get IDs from GET /v1/voices
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
DEFAULT_MODEL = "eleven_multilingual_v2"


class TTSRequest(BaseModel):
    text: str
    voice_name: Optional[str] = None  # ignored for ElevenLabs; use env ELEVENLABS_VOICE_ID
    language_code: Optional[str] = None
    speaking_rate: Optional[float] = None  # ElevenLabs uses voice_settings; we keep for API compatibility


def _synthesize_sync(text: str, voice_id: str) -> bytes:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY is not set")

    url = f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    body = {
        "text": text,
        "model_id": os.getenv("ELEVENLABS_MODEL_ID", DEFAULT_MODEL),
    }
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, json=body, headers=headers)
    if resp.status_code != 200:
        logger.warning("ElevenLabs TTS error: %s %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail="TTS service error")
    return resp.content


@router.post("/tts")
def post_tts(req: TTSRequest) -> Response:
    """
    Synthesize speech using ElevenLabs (female voice by default).
    Set ELEVENLABS_API_KEY in the environment.
    Optional: ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID.
    """
    if not (req.text and req.text.strip()):
        raise HTTPException(status_code=400, detail="text is required")
    voice_id = (os.getenv("ELEVENLABS_VOICE_ID", "").strip() or DEFAULT_VOICE_ID)
    try:
        audio_bytes = _synthesize_sync(req.text.strip(), voice_id)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return Response(content=audio_bytes, media_type="audio/mpeg")
