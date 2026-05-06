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
# Default voice for the voice agent (used when ELEVENLABS_VOICE_ID is not set and frontend sends no voice_id).
DEFAULT_VOICE_ID = "wWWn96OtTHu1sn8SRGEr"
# If your voice returns 404, we try this premade voice (Bella - usually available on all plans).
FALLBACK_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
# eleven_multilingual_v2 works on all plans.
DEFAULT_MODEL = "eleven_multilingual_v2"
FALLBACK_MODEL = "eleven_multilingual_v2"


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None  # ElevenLabs voice_id; overrides ELEVENLABS_VOICE_ID if set
    voice_name: Optional[str] = None  # ignored for ElevenLabs; use voice_id or env ELEVENLABS_VOICE_ID
    language_code: Optional[str] = None
    speaking_rate: Optional[float] = None  # ElevenLabs uses voice_settings; we keep for API compatibility


def _get_api_key() -> str:
    key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise ValueError("ELEVENLABS_API_KEY is not set. Add it to app/backend/.env (see .env.example).")
    return key


def _synthesize_sync(text: str, voice_id: str, model_id: str) -> bytes:
    api_key = _get_api_key()
    url = f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    body = {"text": text, "model_id": model_id}
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(url, json=body, headers=headers)
    if resp.status_code != 200:
        err_msg = resp.text[:500] if resp.text else "No response body"
        logger.warning("ElevenLabs TTS error: %s %s", resp.status_code, err_msg)
        # Pass through ElevenLabs error so you can see 401/404/etc.
        raise HTTPException(status_code=502, detail=f"ElevenLabs {resp.status_code}: {err_msg}")
    return resp.content


def list_voices():
    """
    List voices available in your ElevenLabs account. Use a voice_id from here in ELEVENLABS_VOICE_ID.
    Called from main.py at GET /api/v1/tts/voices.
    """
    try:
        api_key = _get_api_key()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    url = f"{ELEVENLABS_BASE}/voices"
    headers = {"xi-api-key": api_key}
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, headers=headers)
    if resp.status_code != 200:
        err = resp.text[:300] if resp.text else "Unknown"
        raise HTTPException(status_code=502, detail=f"ElevenLabs {resp.status_code}: {err}")
    data = resp.json()
    voices = data.get("voices", [])
    return {
        "message": "Use one of these voice_id values in .env as ELEVENLABS_VOICE_ID=...",
        "voices": [{"voice_id": v.get("voice_id"), "name": v.get("name")} for v in voices],
    }


@router.get("/voices")
def get_voices():
    """List ElevenLabs voices. Also at GET /api/v1/tts/voices."""
    return list_voices()


@router.get("/tts/voices")
def get_tts_voices_route():
    """List ElevenLabs voices (same as /api/v1/voices)."""
    return list_voices()


def _gtts_synthesize(text: str) -> bytes:
    """Google TTS fallback — free, no API key, natural voice."""
    try:
        from gtts import gTTS
        import io
        tts = gTTS(text=text, lang="en", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"gTTS failed: {e}")


@router.post("/tts")
def post_tts(req: TTSRequest) -> Response:
    """
    Synthesize speech. Tries ElevenLabs first; falls back to Google TTS (free) on any error.
    Set ELEVENLABS_API_KEY in .env for premium voice. gTTS works with no keys.
    """
    if not (req.text and req.text.strip()):
        raise HTTPException(status_code=400, detail="text is required")

    text = req.text.strip()
    voice_id = (req.voice_id and req.voice_id.strip()) or (os.getenv("ELEVENLABS_VOICE_ID", "").strip()) or DEFAULT_VOICE_ID
    model_id = os.getenv("ELEVENLABS_MODEL_ID", "").strip() or DEFAULT_MODEL

    # Try ElevenLabs if key is configured
    api_key_present = bool(os.getenv("ELEVENLABS_API_KEY", "").strip())
    if api_key_present:
        try:
            audio_bytes = _synthesize_sync(text, voice_id, model_id)
            return Response(content=audio_bytes, media_type="audio/mpeg")
        except Exception as e:
            logger.warning("ElevenLabs failed (%s), falling back to gTTS", e)

    # Fallback: Google TTS (free, no API key)
    logger.info("Using gTTS fallback for TTS")
    audio_bytes = _gtts_synthesize(text)
    return Response(content=audio_bytes, media_type="audio/mpeg")
