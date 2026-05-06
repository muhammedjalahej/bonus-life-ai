"""JARVIS agent endpoint: POST /api/v1/agent"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.jarvis_agent import run_jarvis

router = APIRouter(tags=["agent"])


class AgentRequest(BaseModel):
    text: str
    history: List[Dict[str, Any]] = []


@router.post("/agent")
async def agent_endpoint(req: AgentRequest):
    """Run JARVIS AI agent: web search, open tabs, answer general questions."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="text is required")
    return await run_jarvis(text, history=req.history)
