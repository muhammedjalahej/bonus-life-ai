"""Voice chat transcription service."""

import io
import base64
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class VoiceChatService:
    """Handle voice input decoding and transcription (browser-based)."""

    def __init__(self):
        logger.info("[OK] Voice recognition service initialized (browser-based)")

    def decode_audio(self, base64_audio: str) -> io.BytesIO:
        try:
            if base64_audio.startswith("data:audio"):
                base64_audio = base64_audio.split(",")[1]
            audio_bytes = base64.b64decode(base64_audio)
            return io.BytesIO(audio_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Audio decoding failed: {str(e)}")

    async def transcribe_audio(self, audio_data: io.BytesIO, language: str = "en") -> tuple:
        """Transcribe audio. Currently uses a mock; replace with real STT in production."""
        try:
            return await self._transcribe_with_google_speech(audio_data, language)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    async def _transcribe_with_google_speech(self, audio_data: io.BytesIO, language: str) -> tuple:
        lang_map = {
            "english": "en-US", "swahili": "sw-KE",
            "spanish": "es-ES", "french": "fr-FR",
        }
        mock_responses = {
            "en-US": "I'm concerned about diabetes in my family",
            "sw-KE": "Nina wasiwasi kuhusu kisukari katika familia yangu",
            "es-ES": "Estoy preocupado por la diabetes en mi familia",
            "fr-FR": "Je suis preoccupe par le diabete dans ma famille",
        }
        recognition_language = lang_map.get(language.lower(), "en-US")
        transcribed_text = mock_responses.get(recognition_language, "I have questions about diabetes")
        return transcribed_text, 0.85
