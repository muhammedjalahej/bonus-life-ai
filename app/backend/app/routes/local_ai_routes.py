"""
Local AI features: 2 endpoints served by one AI module (local LLM only, no external API).
- Health tip of the day
- Scenario explorer ("What if...?")
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.local_ai_module import get_health_tip, answer_scenario

logger = logging.getLogger(__name__)
router = APIRouter(tags=["local-ai"])


class ScenarioRequest(BaseModel):
    scenario: str
    assessment: Optional[dict] = None


@router.get("/health-tip")
def local_ai_health_tip(
    language: str = Query("english", description="english or turkish"),
):
    """Get today's health tip from the local AI module (theme varies by day of week)."""
    try:
        text = get_health_tip(language=language)
        return {"tip": text, "source": "local_llm"}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/scenario")
def local_ai_scenario(body: ScenarioRequest, language: str = Query("english")):
    """Answer a 'what if' scenario using the local AI module (optional: user's last assessment)."""
    try:
        text = answer_scenario(
            scenario=body.scenario,
            assessment=body.assessment,
            language=language,
        )
        return {"scenario": body.scenario, "answer": text, "source": "local_llm"}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
