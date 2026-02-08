"""Language detection service.

Authors: Muhammed Jalahej, Yazen Emino
"""

import logging

logger = logging.getLogger(__name__)


class LanguageProcessor:
    """Detect language from input text using keyword analysis."""

    LANGUAGE_KEYWORDS = {
        "turkish": [
            "merhaba", "nasıl", "diyabet", "şeker", "sağlık", "tedavi", "doktor",
            "hastalık", "belirti", "ilaç", "kan", "tansiyon", "beslenme", "egzersiz",
        ],
        "english": ["the", "and", "for", "with", "about", "health", "diabetes", "sugar"],
    }

    @staticmethod
    def detect_language(text: str) -> str:
        if not text:
            return "english"
        text_lower = text.lower()
        scores = {}
        for lang, keywords in LanguageProcessor.LANGUAGE_KEYWORDS.items():
            scores[lang] = sum(1 for kw in keywords if kw in text_lower)
        detected = max(scores.items(), key=lambda x: x[1])[0]
        return detected if scores[detected] > 0 else "english"


def calculate_detection_confidence(text: str, detected_language: str) -> float:
    """Return a 0-1 confidence score for the detected language."""
    if len(text) < 5:
        return 0.5
    extra_keywords = {
        "turkish": ["ve", "bir", "için", "ile", "ama", "da", "de", "bu", "ne"],
    }
    text_lower = text.lower()
    matches = 0
    if detected_language in extra_keywords:
        for kw in extra_keywords[detected_language]:
            if kw in text_lower:
                matches += 1
    base = min(1.0, matches * 0.2)
    length_boost = min(0.3, len(text) * 0.01)
    return min(1.0, base + length_boost)
