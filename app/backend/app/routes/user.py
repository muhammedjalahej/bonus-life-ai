"""User profile endpoints."""

from datetime import datetime
from fastapi import APIRouter

router = APIRouter()

_ai_specialist = None


def init(ai_specialist):
    global _ai_specialist
    _ai_specialist = ai_specialist


@router.get("/user/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile and conversation history."""
    profile = _ai_specialist.get_user_profile(user_id)
    history = _ai_specialist.get_conversation_history(user_id)
    return {
        "user_id": user_id,
        "profile": profile,
        "conversation_history": history,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.delete("/user/{user_id}/conversation")
async def clear_conversation(user_id: str):
    """Clear user conversation history."""
    if user_id in _ai_specialist.conversation_memory:
        _ai_specialist.conversation_memory[user_id] = []
    return {"message": "Conversation history cleared", "user_id": user_id}
