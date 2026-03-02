"""
Single source of truth for voice-agent navigable routes.
Add or edit entries here to control full site coverage; no hardcoding in voice_command.py.
Used for rule-based matching, LLM prompt, and GET /voice-command/routes.
"""

# List of (path, keywords). Keywords are used for "open X", "go to X", or just "X".
# Path must start with /. Keywords are lowercase; first keyword is the short label.
VOICE_NAV_ROUTES = [
    ("/", ["home", "main page", "go home"]),
    ("/login", ["login", "sign in", "log in"]),
    ("/register", ["register", "sign up", "register page"]),
    ("/test", ["test", "risk assessment", "risk test", "diabetes test", "open test", "go to test", "assessment"]),
    ("/heart-test", ["heart test", "heart risk", "heart assessment", "heart disease"]),
    ("/chat", ["chat", "chatbot", "open chat", "go to chat"]),
    ("/voice-chat", ["voice chat", "voice"]),
    ("/diet-plan", ["diet", "diet plan", "meal plan"]),
    ("/symptom-checker", ["symptom checker", "symptoms", "symptom check"]),
    ("/hospitals", ["hospitals", "hospital", "find hospital", "nearest hospital", "find nearest hospital"]),
    ("/dashboard", ["dashboard", "my assessments", "past results", "assessments"]),
    ("/admin", ["admin", "admin panel"]),
    ("/studio", ["studio", "micro interaction", "micro interaction studio"]),
    ("/verify", ["verify", "verify report", "report verification"]),
    ("/meal-photo", ["meal photo", "meal analyzer", "photo analyzer", "analyze meal"]),
    ("/sport", ["sport", "workout", "workout videos", "exercise"]),
    ("/local-ai?section=scenario", ["what if", "open what if", "what if scenario", "open the what if", "scenario"]),
    ("/local-ai", ["local ai", "local ai tip", "health tip"]),
    ("/pricing", ["pricing", "plans", "subscription"]),
]


def get_nav_keywords_list():
    """Return list of (path, keywords) for rule-based matching (voice_command.py)."""
    return list(VOICE_NAV_ROUTES)


def get_routes_for_llm():
    """Return a single string of 'label path, ...' for the LLM system prompt."""
    parts = []
    for path, keywords in VOICE_NAV_ROUTES:
        label = path.strip("/").replace("-", " ") or "home"
        # Prefer first keyword as primary name
        primary = keywords[0] if keywords else label
        parts.append(f"{primary} {path}")
    return ", ".join(parts)


def get_routes_for_api():
    """Return list of {path, label, keywords} for GET /voice-command/routes."""
    out = []
    for path, keywords in VOICE_NAV_ROUTES:
        label = path.strip("/").replace("-", " ") or "home"
        primary = keywords[0] if keywords else label
        out.append({"path": path, "label": primary, "keywords": keywords})
    return out


def get_help_intro():
    """Short intro for voice help reply."""
    return (
        "You can say: Open home, Open assessment, Open chat, Open diet plan, Open symptom checker, "
        "Open hospitals, Open heart test, Open workout videos, Open meal photo, Open local AI, Open dashboard, "
        "or Open admin. You can also fill in values like Fill age 35 or Set weight 70, or clear a field. "
        "Say Continue or Back on forms, Print, Refresh, Scroll down or Scroll up, Log out, or say Thank you to stop."
    )
