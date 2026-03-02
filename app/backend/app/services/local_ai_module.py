"""
Local AI module: one module for two features (health tip, scenario).
Uses a local LLM (Ollama) only — no external AI API. Full control over data and model.
"""
import os
import logging
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "90"))


def _call_ollama(prompt: str, system: Optional[str] = None) -> str:
    """Send prompt to local Ollama; return generated text. Raises on failure."""
    url = f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    if system:
        payload["system"] = system
    try:
        with httpx.Client(timeout=OLLAMA_TIMEOUT) as client:
            r = client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return (data.get("response") or "").strip()
    except Exception as e:
        logger.exception("Ollama call failed: %s", e)
        raise RuntimeError(
            "Service unavailable run " + OLLAMA_MODEL
        ) from e


# Day-of-week themes for "daily" feel (rotates so tips vary by day)
TIP_THEMES = [
    "diet and nutrition",
    "physical activity",
    "sleep and rest",
    "stress and mindfulness",
    "hydration and habits",
    "blood sugar awareness",
    "small daily wins",
]


def get_health_tip(language: str = "english") -> str:
    """Health tip of the day: date, day-of-week theme, one concrete action, disclaimer."""
    now = datetime.utcnow()
    today = now.strftime("%Y-%m-%d")
    day_name = now.strftime("%A")
    theme_index = now.weekday() % len(TIP_THEMES)
    theme = TIP_THEMES[theme_index]
    lang_instruction = "Respond in Turkish." if language == "turkish" else "Respond in English."
    system = (
        "You are a diabetes prevention and wellness advisor. "
        "Give exactly one concrete action the user can do today. "
        "Use 2-3 short sentences in simple language. "
        "End with a single disclaimer: 'This is not medical advice.' "
        "Do not give medical advice or diagnoses."
    )
    prompt = (
        f"Today is {day_name}, {today}. Focus for this tip: {theme}. "
        f"Generate one short, practical health tip for diabetes prevention or management. "
        f"Give one specific action. 2-3 sentences only. {lang_instruction}"
    )
    return _call_ollama(prompt, system=system)


def answer_scenario(
    scenario: str,
    assessment: Optional[dict] = None,
    language: str = "english",
) -> str:
    """Scenario explorer: user's 'what if' + optional assessment context, one response."""
    if not (scenario or "").strip():
        return "Please enter a scenario (e.g. What if I lower my glucose by 20?)."
    lang_instruction = "Respond in Turkish." if language == "turkish" else "Respond in English."
    context = ""
    if assessment:
        risk = assessment.get("risk_level") or assessment.get("risk_level_display", "unknown")
        prob = assessment.get("probability")
        if prob is not None:
            context = f" User's last assessment: risk level = {risk}, probability = {prob:.0%}."
        else:
            context = f" User's last assessment: risk level = {risk}."
    system = (
        "You are a diabetes educator. Answer in two short parts. "
        "Part 1: What might change (for their situation). "
        "Part 2: What could help (one or two practical steps). "
        "Use simple language, 3-4 sentences total. Do not add a disclaimer or 'medical advice' line."
    )
    prompt = (
        f"User asks: {scenario.strip()}.{context} "
        f"Reply in two parts only: (1) What might change (2) What could help. "
        f"{lang_instruction}"
    )
    return _call_ollama(prompt, system=system)
