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
        "turkish": [
            {"id": "prevention", "name": "Diyabet Önleme", "description": "Tip 2 diyabeti nasıl önleyebilirsiniz"},
            {"id": "symptoms", "name": "Belirtiler ve İşaretler", "description": "Diyabetin erken uyarı işaretleri"},
            {"id": "diet", "name": "Diyabet Diyeti", "description": "Yenmesi ve kaçınılması gereken yiyecekler"},
            {"id": "exercise", "name": "Egzersiz ve Aktivite", "description": "Fiziksel aktivite önerileri"},
            {"id": "monitoring", "name": "Kan Şekeri Takibi", "description": "Glikoz seviyelerini kontrol etme"},
            {"id": "treatment", "name": "Tedavi Seçenekleri", "description": "İlaçlar ve tedavi yöntemleri"},
            {"id": "complications", "name": "Komplikasyonlar", "description": "Uzun vadeli sağlık riskleri"},
            {"id": "management", "name": "Günlük Yönetim", "description": "Diyabetle yaşamak"},
        ],
    }
    return {
        "topics": topics_data.get(language, topics_data["english"]),
        "language": language,
        "timestamp": datetime.utcnow().isoformat(),
    }
