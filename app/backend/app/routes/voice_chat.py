"""Voice chat endpoints."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from app.models import VoiceChatRequest, VoiceChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()

_voice_service = None
_gpt_oss_specialist = None


def init(voice_service, gpt_oss_specialist):
    global _voice_service, _gpt_oss_specialist
    _voice_service = voice_service
    _gpt_oss_specialist = gpt_oss_specialist


@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat_assistant(request: VoiceChatRequest):
    """Voice chat endpoint for diabetes concerns."""
    try:
        logger.info(f"Voice chat request from {request.user_id}, language: {request.language}")
        audio_bytes = _voice_service.decode_audio(request.audio_data)
        transcribed_text, confidence = await _voice_service.transcribe_audio(audio_bytes, request.language)
        logger.info(f"Transcribed text: {transcribed_text}")

        llm_result = await _gpt_oss_specialist.generate_diabetes_response(
            message=transcribed_text, language=request.language, user_id=request.user_id
        )

        return VoiceChatResponse(
            text_input=transcribed_text,
            ai_response=llm_result["response"],
            timestamp=datetime.utcnow().isoformat(),
            language=request.language,
            confidence=confidence,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice chat error: {e}")
        raise HTTPException(status_code=500, detail="Voice chat service is temporarily unavailable.")


@router.post("/voice-chat/test")
async def voice_chat_test(request: Request):
    """Test voice chat without actual audio processing."""
    try:
        form_data = await request.form()
        text = form_data.get("text", "")
        language = form_data.get("language", "english")
        user_id = form_data.get("user_id", "default")

        logger.info(f"Voice chat test: {text}")
        if not text:
            raise HTTPException(status_code=400, detail="Text input is required")

        llm_result = await _gpt_oss_specialist.generate_diabetes_response(
            message=text, language=language, user_id=user_id
        )

        return VoiceChatResponse(
            text_input=text,
            ai_response=llm_result["response"],
            timestamp=datetime.utcnow().isoformat(),
            language=language,
            confidence=0.95,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice chat test error: {e}")
        raise HTTPException(status_code=500, detail="Voice chat test failed")
