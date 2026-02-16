"""
Voice command intent parsing for Bonus Life AI.
User speaks -> frontend sends transcript -> this endpoint returns structured command (navigate, fill_field, print).
Works without Groq API key using rule-based fallback.
"""

import os
import json
import logging
import re
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])


class VoiceCommandRequest(BaseModel):
    text: str


class VoiceCommandResponse(BaseModel):
    action: str  # single action (used when actions is empty)
    payload: dict
    reply: Optional[str] = None
    actions: Optional[List[dict]] = None  # when set, run these in order (each: action, payload, reply)


# --- Rule-based fallback (no API key required) ---
NAVIGATE_KEYWORDS = [
    ("/", ["home", "main page", "go home"]),
    ("/login", ["login", "sign in", "log in"]),
    ("/register", ["register", "sign up", "register page"]),
    ("/test", ["test", "risk assessment", "risk test", "diabetes test", "open test", "go to test", "assessment"]),
    ("/chat", ["chat", "chatbot", "open chat", "go to chat"]),
    ("/voice-chat", ["voice chat", "voice"]),
    ("/diet-plan", ["diet", "diet plan", "meal plan"]),
    ("/emergency", ["emergency", "emergency check"]),
    ("/hospitals", ["hospitals", "hospital", "find hospital", "nearest hospital", "find nearest hospital"]),
    ("/dashboard", ["dashboard"]),
    ("/admin", ["admin", "admin panel"]),
]

FILL_FIELD_PATTERN = re.compile(
    r"(?:fill|set|enter|type)\s+(?:my\s+)?(age|weight|height|pregnancies|glucose|blood\s*pressure|skin\s*thickness|insulin|pedigree|diabetes\s*pedigree)\s*(?:to\s+)?(\d+(?:\.\d+)?)",
    re.I,
)
# Also: "age 35", "weight 70" (number after field name)
FILL_FIELD_SHORT = re.compile(
    r"\b(age|weight|height|pregnancies|glucose|blood\s*pressure|skin\s*thickness|insulin|pedigree|diabetes\s*pedigree)\s+(\d+(?:\.\d+)?)\b",
    re.I,
)
# Natural speech: "number of pregnancy one", "pregnancies one", "set the number of pregnancies to one"
FILL_FIELD_NATURAL = re.compile(
    r"(?:set\s+(?:the\s+)?(?:number\s+of\s+)?(?:pregnancy|pregnancies)\s+to\s+|(?:number\s+of\s+)?(?:pregnancy|pregnancies)\s+(?:is\s+)?)(one|two|three|four|five|six|seven|eight|nine|zero|\d+)",
    re.I,
)
# Word numbers for any field: "age thirty five", "weight seventy"
WORD_NUMBERS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15",
    "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19",
    "twenty": "20", "thirty": "30", "forty": "40", "fifty": "50", "sixty": "60",
    "seventy": "70", "eighty": "80", "ninety": "90", "hundred": "100",
}


def _normalize_field(f: str) -> str:
    f = f.lower().replace(" ", "_")
    if f in ("blood_pressure",):  # already correct
        return "blood_pressure"
    if "pedigree" in f or f == "diabetes_pedigree":
        return "diabetes_pedigree_function"
    if f == "skin_thickness":
        return "skin_thickness"
    if f == "pregnancy":
        return "pregnancies"
    return f


def _word_to_number(w: str) -> str:
    """Convert word number to digit string; supports 'thirty five' -> 35 style in caller."""
    w = w.strip().lower()
    if w in WORD_NUMBERS:
        return WORD_NUMBERS[w]
    if w.isdigit():
        return w
    return ""


# Human-readable labels for TTS/replies (no code names like blood_pressure)
FIELD_LABELS = {
    "blood_pressure": "blood pressure",
    "skin_thickness": "skin thickness",
    "diabetes_pedigree_function": "diabetes pedigree",
    "pregnancies": "pregnancies",
    "age": "age",
    "weight": "weight",
    "height": "height",
    "glucose": "glucose",
    "insulin": "insulin",
}


def _field_label(field: str) -> str:
    return FIELD_LABELS.get(field, field.replace("_", " "))


def _parse_voice_command_rules(text: str) -> dict:
    """Rule-based parsing when Groq is not available. No API key needed."""
    t = text.strip().lower()
    if not t:
        return {"action": "unknown", "payload": {}, "reply": None}

    # Help
    if re.search(r"\b(what can I say|help|commands|voice help)\b", t):
        reply = (
            "Here are some things you can say: Go home, Open assessment, Open chat, or Open diet. "
            "You can fill in values like Fill age 35 or Set weight 70, or clear a field like Clear blood pressure. "
            "Say Continue or Back on forms, Print, Log out, Refresh, or Scroll down and Scroll up. "
            "Say Thank you when you're done to stop listening."
        )
        return {"action": "help", "payload": {"message": reply}, "reply": reply}

    # App actions: logout, refresh, scroll
    if re.search(r"\b(log out|logout|sign out|sign out)\b", t):
        return {"action": "logout", "payload": {}, "reply": "I'll log you out. Say yes to confirm."}
    if re.search(r"\b(refresh|reload|reload page)\b", t):
        return {"action": "refresh", "payload": {}, "reply": "Refreshing the page for you."}
    if re.search(r"\b(scroll down|scroll down page)\b", t):
        return {"action": "scroll_down", "payload": {}, "reply": "Scrolling down."}
    if re.search(r"\b(scroll up|scroll up page)\b", t):
        return {"action": "scroll_up", "payload": {}, "reply": "Scrolling up."}

    # Clear field: "clear blood pressure", "delete age", "reset weight"
    clear_pat = re.compile(
        r"\b(?:clear|delete|reset|remove)\s+(?:the\s+)?(age|weight|height|pregnancies|glucose|blood\s*pressure|skin\s*thickness|insulin|pedigree|diabetes\s*pedigree)\b",
        re.I,
    )
    m = clear_pat.search(t)
    if m:
        field = _normalize_field(m.group(1))
        return {"action": "clear_field", "payload": {"field": field}, "reply": f"Done. I've cleared {_field_label(field)}."}

    # Print
    if re.search(r"\bprint\b", t) or "print pdf" in t or "print page" in t:
        return {"action": "print", "payload": {}, "reply": "Printing the page for you."}

    # Form: continue / next / back (e.g. on risk assessment)
    if re.search(r"\b(continue|next|next step|go to next|analyze)\b", t):
        return {"action": "form_next", "payload": {}, "reply": "Okay, moving to the next step."}
    if re.search(r"\b(back|go back|previous|previous step)\b", t):
        return {"action": "form_back", "payload": {}, "reply": "Going back a step."}

    # Navigate: "open X", "go to X", "X page", or just "X"
    for path, keywords in NAVIGATE_KEYWORDS:
        for kw in keywords:
            if kw in t or f"open {kw}" in t or f"go to {kw}" in t or f"go {kw}" in t:
                label = "home" if path == "/" else path.strip("/").replace("-", " ") or "page"
                return {"action": "navigate", "payload": {"path": path}, "reply": f"Sure, opening {label}."}

    # Fill field: "number of pregnancy one", "pregnancies one"
    m = FILL_FIELD_NATURAL.search(t)
    if m:
        raw = m.group(1).strip().lower()
        value = _word_to_number(raw) if not raw.isdigit() else raw
        if value != "":
            return {"action": "fill_field", "payload": {"field": "pregnancies", "value": value}, "reply": f"Got it. {_field_label('pregnancies').title()} set to {value}."}

    # Fill field: "fill age 35", "set weight 70", "age 35"
    for pattern in (FILL_FIELD_PATTERN, FILL_FIELD_SHORT):
        m = pattern.search(t)
        if m:
            field = _normalize_field(m.group(1))
            value = m.group(2)
            return {"action": "fill_field", "payload": {"field": field, "value": value}, "reply": f"Got it. {_field_label(field).title()} set to {value}."}

    # Fill field with word numbers: "age thirty five", "weight seventy", "age 35"
    for field_name in ["age", "weight", "height", "glucose", "blood pressure", "skin thickness", "insulin", "pregnancies"]:
        key = field_name.replace(" ", r"\s*")
        # Match "field word" or "field word word" or "field 123"
        pat = re.compile(r"\b" + key + r"\s+([a-z]+(?:\s+[a-z]+)?|\d+(?:\.\d+)?)\b", re.I)
        m = pat.search(t)
        if m:
            raw = m.group(1).strip().lower()
            if raw.replace(".", "").isdigit():
                value = raw
            else:
                parts = raw.split()
                if len(parts) == 1:
                    value = _word_to_number(parts[0])
                elif len(parts) == 2 and parts[0] in WORD_NUMBERS and parts[1] in WORD_NUMBERS:
                    v0, v1 = _word_to_number(parts[0]), _word_to_number(parts[1])
                    if v0 and v1:
                        value = str(int(v0) + int(v1))  # thirty five -> 35
                    else:
                        value = _word_to_number(parts[0]) or _word_to_number(parts[1])
                else:
                    value = _word_to_number(parts[0]) if parts else ""
            if value != "":
                fn = _normalize_field(field_name)
                return {"action": "fill_field", "payload": {"field": fn, "value": value}, "reply": f"Got it. {_field_label(fn).title()} set to {value}."}

    logger.info("Voice unknown: %s", text)
    return {"action": "unknown", "payload": {}, "reply": None}


# Valid app routes and form fields for the LLM (when Groq is used)
ROUTES_LIST = (
    "home /, login /login, register /register, test or risk assessment /test, "
    "chat or chatbot /chat, voice chat /voice-chat, diet plan /diet-plan, "
    "emergency /emergency, dashboard /dashboard, admin /admin"
)
FIELDS_LIST = (
    "age, weight, height, pregnancies, glucose, blood_pressure, skin_thickness, "
    "insulin, diabetes_pedigree_function (or pedigree)"
)

SYSTEM_PROMPT = f"""You are a voice command parser for Bonus Life AI (diabetes health app).
The user speaks; you return exactly one JSON object with no markdown, no code block, no extra text.

Allowed actions:
- "navigate": go to a page. payload: {{ "path": "<path>" }}
- "fill_field": set one form field on the risk assessment page. payload: {{ "field": "<field>", "value": "<value>" }}
- "print": trigger print/PDF. payload: {{}}
- "unknown": could not understand. payload: {{}}

Valid paths (use exactly these): {ROUTES_LIST}
Valid fields for fill_field (use exactly these keys): {FIELDS_LIST}

Rules:
- Map synonyms to the path: "chatbot", "open chat", "go to chat" -> path "/chat". "risk assessment", "diabetes test", "test" -> path "/test".
- For numbers, put the value as string in payload.value (e.g. "35", "70").
- Return only valid JSON: {{ "action": "...", "payload": {{ ... }}, "reply": "short confirmation for TTS or null" }}
"""


def _parse_voice_command(text: str) -> dict:
    """Parse with rule-based first (no key needed). If Groq key is set, try Groq and fall back to rules on fail."""
    rules_result = _parse_voice_command_rules(text)
    if rules_result["action"] != "unknown":
        return rules_result

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not api_key.strip().startswith("gsk_"):
        return rules_result

    try:
        from groq import Groq
    except ImportError:
        return rules_result

    try:
        client = Groq(api_key=api_key)
        model = os.getenv("LLM_MODEL_NAME", "llama-3.1-8b-instant")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"User said: \"{text}\""},
            ],
            temperature=0.1,
            max_tokens=256,
        )
        content = (response.choices[0].message.content or "").strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        data = json.loads(content)
        action = data.get("action", "unknown")
        payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
        reply = data.get("reply")
        if action != "unknown":
            return {"action": action, "payload": payload, "reply": reply}
    except Exception as e:
        logger.debug(f"Voice command Groq fallback: {e}")
    return rules_result


@router.post("/voice-command", response_model=VoiceCommandResponse)
def post_voice_command(body: VoiceCommandRequest) -> VoiceCommandResponse:
    """Parse spoken (or typed) command. Supports multi-action via ' and ' (e.g. open assessment and fill age 35)."""
    text = (body.text or "").strip()
    if not text:
        return VoiceCommandResponse(action="unknown", payload={}, reply=None)

    # Multi-action: "open assessment and fill age 35 and weight 70"
    if " and " in text:
        parts = [p.strip() for p in text.split(" and ") if p.strip()]
        actions = []
        for part in parts:
            r = _parse_voice_command_rules(part)
            if r["action"] != "unknown":
                actions.append({"action": r["action"], "payload": r.get("payload", {}), "reply": r.get("reply")})
        if len(actions) >= 2:
            return VoiceCommandResponse(action="multi", payload={}, reply=None, actions=actions)

    result = _parse_voice_command(text)
    return VoiceCommandResponse(
        action=result["action"],
        payload=result["payload"],
        reply=result.get("reply"),
        actions=None,
    )
