"""AI Meal Photo Analyzer: vision-based meal identification and carb estimation.

Uses Groq LLaVA or similar vision model when GROQ_API_KEY is set.
Authors: Muhammed Jalahej, Yazen Emino
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Groq vision: use Llama 4 Scout (or Maverick). LLaVA was deprecated.
VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")


def _normalize_carb_level(text: str) -> str:
    """Map model output to low | medium | high."""
    t = (text or "").strip().lower()
    if "low" in t or "düşük" in t:
        return "low"
    if "high" in t or "yüksek" in t:
        return "high"
    return "medium"


def _parse_analysis_response(raw: str) -> Dict[str, Any]:
    """Extract meal_name, carb_level, healthier_swaps from LLM response."""
    meal_name = "Unknown meal"
    carb_level = "medium"
    healthier_swaps = ""

    # Try structured lines: Meal: ... Carb: ... Swaps: ...
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("meal:") or lower.startswith("meal name:"):
            meal_name = line.split(":", 1)[-1].strip() or meal_name
        elif "carb" in lower and ":" in line:
            part = line.split(":", 1)[-1].strip().lower()
            if "low" in part:
                carb_level = "low"
            elif "high" in part:
                carb_level = "high"
            else:
                carb_level = "medium"
        elif "swap" in lower or "alternative" in lower or "suggestion" in lower:
            healthier_swaps = line.split(":", 1)[-1].strip() or healthier_swaps

    if not healthier_swaps and "swap" in raw.lower():
        # Fallback: take a paragraph that mentions swap/suggestion
        for para in raw.split("\n\n"):
            if "swap" in para.lower() or "healthier" in para.lower():
                healthier_swaps = para.strip()[:500]
                break
    if not healthier_swaps:
        healthier_swaps = "Consider adding more vegetables and choosing whole grains when possible."

    return {
        "meal_name": meal_name[:255],
        "carb_level": _normalize_carb_level(carb_level),
        "healthier_swaps": healthier_swaps[:2000],
    }


async def analyze_meal_image(image_base64: str) -> Dict[str, Any]:
    """
    Analyze a meal photo: identify meal, estimate carb level, suggest healthier swaps.
    image_base64: base64-encoded image (no data URL prefix, or with data:image/...;base64,)
    """
    # Normalize: allow optional data URL prefix
    if "," in image_base64 and "base64," in image_base64:
        image_base64 = image_base64.split("base64,", 1)[-1].strip()
    if not image_base64:
        return {
            "meal_name": "No image",
            "carb_level": "medium",
            "healthier_swaps": "Please upload or take a photo of your meal.",
        }

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not api_key.startswith("gsk_"):
        logger.warning("GROQ_API_KEY not set; returning placeholder meal analysis")
        return {
            "meal_name": "Sample meal (add GROQ_API_KEY for real analysis)",
            "carb_level": "medium",
            "healthier_swaps": "Add vegetables and choose whole grains. Limit added sugars.",
        }

    try:
        import httpx

        data_uri = f"data:image/jpeg;base64,{image_base64}"
        prompt = (
            "Look at this meal photo. Reply in exactly this format:\n"
            "Meal: [short meal name]\n"
            "Carb level: [low / medium / high]\n"
            "Healthier swaps: [2-3 short suggestions for diabetes-friendly alternatives]"
        )
        payload = {
            "model": VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                }
            ],
            "max_tokens": 400,
            "temperature": 0.3,
            "max_completion_tokens": 1024,
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code != 200:
                logger.error(f"Groq vision API error: {r.status_code} {r.text}")
                return {
                    "meal_name": "Analysis unavailable",
                    "carb_level": "medium",
                    "healthier_swaps": "Vision API error. Please try again.",
                }
            data = r.json()
            text = (data.get("choices") or [{}])[0].get("message", {}).get("content") or ""
            out = _parse_analysis_response(text)
            return out
    except Exception as e:
        logger.exception(f"Meal photo analysis failed: {e}")
        return {
            "meal_name": "Analysis failed",
            "carb_level": "medium",
            "healthier_swaps": "Something went wrong. Please try another photo.",
        }
