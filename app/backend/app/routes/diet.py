"""Diet plan generation endpoint."""

import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.models import DietPlanRequest, DietPlanResponse

logger = logging.getLogger(__name__)
router = APIRouter()

_meal_service = None


def init(meal_service):
    global _meal_service
    _meal_service = meal_service


@router.post("/diet-plan/generate", response_model=DietPlanResponse)
async def generate_diet_plan(request: DietPlanRequest, background_tasks: BackgroundTasks):
    """Generate personalized diet plan."""
    logger.info(f"[TARGET] Generating plan for {request.age}y/o {request.gender} - Goal: {request.goals}")
    try:
        result = await _meal_service.generate_plan(request)
        logger.info(f"[OK] Plan generated - Time: {result['generation_time']}s")
        return DietPlanResponse(**result)
    except Exception as e:
        logger.error(f"[ERROR] Plan generation failed: {e}")
        raise HTTPException(status_code=500, detail="Meal plan generation failed")
