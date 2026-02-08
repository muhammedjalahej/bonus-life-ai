"""Health topics endpoint."""

from datetime import datetime
from fastapi import APIRouter

router = APIRouter()


@router.get("/health-topics")
async def get_health_topics(language: str = "english"):
    """Get common diabetes-related health topics."""
    topics_data = {
        "english": [
            {"id": "prevention", "name": "Diabetes Prevention", "description": "How to prevent type 2 diabetes"},
            {"id": "symptoms", "name": "Symptoms & Signs", "description": "Early warning signs of diabetes"},
            {"id": "diet", "name": "Diabetes Diet", "description": "Foods to eat and avoid"},
            {"id": "exercise", "name": "Exercise & Activity", "description": "Physical activity recommendations"},
            {"id": "monitoring", "name": "Blood Sugar Monitoring", "description": "How to check glucose levels"},
            {"id": "treatment", "name": "Treatment Options", "description": "Medications and therapies"},
            {"id": "complications", "name": "Complications", "description": "Long-term health risks"},
            {"id": "management", "name": "Daily Management", "description": "Living with diabetes"},
        ],
        "swahili": [
            {"id": "prevention", "name": "Kuzuia Kisukari", "description": "Jinsi ya kuzuia kisukari aina ya 2"},
            {"id": "symptoms", "name": "Dalili na Ishara", "description": "Ishara za mapema za kisukari"},
            {"id": "diet", "name": "Lishe ya Kisukari", "description": "Vyakula vya kula na kuepuka"},
            {"id": "exercise", "name": "Mazoezi na Shughuli", "description": "Mapendekezo ya shughuli za mwili"},
            {"id": "monitoring", "name": "Kufuatilia Sukari ya Damu", "description": "Jinsi ya kukagua viwango vya glukosi"},
            {"id": "treatment", "name": "Chaguo za Matibabu", "description": "Dawa na tiba mbalimbali"},
            {"id": "complications", "name": "Matatizo", "description": "Hatari za kiafya za muda mrefu"},
            {"id": "management", "name": "Usimamizi wa Kila Siku", "description": "Kuishi na kisukari"},
        ],
    }
    return {
        "topics": topics_data.get(language, topics_data["english"]),
        "language": language,
        "timestamp": datetime.utcnow().isoformat(),
    }
