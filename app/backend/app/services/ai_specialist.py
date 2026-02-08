"""AI Diabetes Specialist services using Groq LLM.

Authors: Muhammed Jalahej, Yazen Emino
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any, List

from groq import Groq

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# AIDiabetesSpecialist  (used by chat, assessment, user-profile endpoints)
# ---------------------------------------------------------------------------
class AIDiabetesSpecialist:
    def __init__(self):
        self.client = None
        self.conversation_memory: Dict[str, list] = {}
        self.user_profiles: Dict[str, dict] = {}
        self.initialize_llm()

    def initialize_llm(self):
        try:
            groq_api_key = os.getenv("GROQ_API_KEY")
            if groq_api_key and groq_api_key.startswith("gsk_"):
                self.client = Groq(api_key=groq_api_key)
                model_name = os.getenv("LLM_MODEL_NAME", "openai/gpt-oss-20b")
                logger.info(f"[START] AI Diabetes Specialist LLM initialized with model: {model_name}")
            else:
                logger.error("[ERROR] Invalid or missing Groq API key")
                self.client = None
        except Exception as e:
            logger.error(f"[ERROR] Failed to initialize Groq LLM: {e}")
            self.client = None

    # -- prompt -----------------------------------------------------------
    def create_medical_prompt(self, message: str, language: str, user_context: Dict = None) -> str:
        prompt = (
            "You are More Life AI, an expert diabetes specialist and health advisor. "
            "Provide accurate, helpful medical information about diabetes prevention, management, and treatment.\n\n"
            f'USER QUESTION: "{message}"\n'
            f"LANGUAGE: {language}\n\n"
            "RESPONSE REQUIREMENTS:\n"
            "1. Provide medically accurate information about diabetes\n"
            "2. Focus on prevention strategies and healthy lifestyle\n"
            "3. Be specific and practical in recommendations\n"
            "4. Use clear, understandable language\n"
            "5. Include both immediate actions and long-term strategies\n"
            "6. When discussing diet, consider cultural context and local foods\n"
            "7. Always recommend consulting healthcare professionals for personal medical advice\n\n"
            "FORMAT:\n"
            "- Start with a clear, empathetic response to the question\n"
            "- Provide structured, actionable advice\n"
            "- Use emojis sparingly for readability\n"
            "- End with encouragement and next steps\n\n"
            "IMPORTANT: Always emphasize that you are an AI assistant and users should consult "
            "healthcare providers for personal medical advice.\n"
        )
        return prompt

    # -- generate ---------------------------------------------------------
    async def generate_medical_response(self, message: str, language: str = "english", user_id: str = "default") -> Dict[str, Any]:
        try:
            if not self.client:
                logger.error("LLM client not available")
                if language == "turkish":
                    return {
                        "success": False,
                        "response": "Üzgünüz, yapay zeka uzmanımız şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin veya acil tıbbi konularda bir sağlık kuruluşuna başvurun.",
                        "model": "unavailable",
                    }
                return {
                    "success": False,
                    "response": "I apologize, but our AI specialist is currently unavailable. Please try again later or consult with a healthcare provider for immediate medical advice.",
                    "model": "unavailable",
                }

            user_profile = self.get_user_profile(user_id)
            system_prompt = self.create_medical_prompt(message, language, user_profile.get("user_context", {}))

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ]
            history = self.get_conversation_history(user_id)
            for msg in history[-3:]:
                messages.insert(1, {"role": msg["role"], "content": msg["content"]})

            response = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL_NAME", "openai/gpt-oss-20b"),
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            llm_response = response.choices[0].message.content

            self.add_to_conversation(user_id, "user", message)
            self.add_to_conversation(user_id, "assistant", llm_response)
            self.update_user_profile(user_id, message, llm_response)

            return {"success": True, "response": llm_response, "model": os.getenv("LLM_MODEL_NAME", "openai/gpt-oss-20b")}
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            if language == "turkish":
                return {
                    "success": False,
                    "response": "Teknik bir sorun yaşanıyor. Lütfen kısa süre sonra tekrar deneyin veya acil tıbbi sorularınız için bir sağlık kuruluşuna başvurun.",
                    "model": "error",
                }
            return {
                "success": False,
                "response": "I apologize, but I'm experiencing technical difficulties. Please try again shortly or consult with a healthcare provider for urgent medical questions.",
                "model": "error",
            }

    # -- user profiles ----------------------------------------------------
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                "user_id": user_id,
                "created_at": datetime.utcnow(),
                "last_activity": datetime.utcnow(),
                "preferred_language": "english",
                "conversation_count": 0,
                "topics_discussed": [],
                "user_context": {},
            }
        return self.user_profiles[user_id]

    def update_user_profile(self, user_id: str, message: str, response: str):
        profile = self.get_user_profile(user_id)
        profile["last_activity"] = datetime.utcnow()
        profile["conversation_count"] += 1
        msg_lower = message.lower()
        topic_kw = {
            "nutrition": ["chakula", "kula", "diet", "food", "meal"],
            "exercise": ["mazoezi", "exercise", "activity", "workout"],
            "prevention": ["kuzuia", "prevent", "risk", "hatari"],
            "treatment": ["dawa", "medicine", "treatment", "tibabu"],
        }
        for topic, kws in topic_kw.items():
            if any(w in msg_lower for w in kws) and topic not in profile["topics_discussed"]:
                profile["topics_discussed"].append(topic)

    # -- conversation memory ----------------------------------------------
    def get_conversation_history(self, user_id: str, max_messages: int = 6) -> List[Dict]:
        if user_id in self.conversation_memory:
            return self.conversation_memory[user_id][-max_messages:]
        return []

    def add_to_conversation(self, user_id: str, role: str, content: str):
        if user_id not in self.conversation_memory:
            self.conversation_memory[user_id] = []
        self.conversation_memory[user_id].append(
            {"role": role, "content": content, "timestamp": datetime.utcnow().isoformat()}
        )
        if len(self.conversation_memory[user_id]) > 20:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-20:]


# ---------------------------------------------------------------------------
# GPTOSSDiabetesSpecialist  (used by voice-chat endpoints)
# ---------------------------------------------------------------------------
class GPTOSSDiabetesSpecialist:
    def __init__(self):
        self.client = None
        self.conversation_memory: Dict[str, list] = {}
        self.initialize_groq_client()

    def initialize_groq_client(self):
        try:
            groq_api_key = os.getenv("GROQ_API_KEY")
            if not groq_api_key:
                logger.error("[ERROR] GROQ_API_KEY not found")
                self.client = None
                return
            if not groq_api_key.startswith("gsk_"):
                logger.error("[ERROR] Invalid Groq API key format")
                self.client = None
                return
            self.client = Groq(api_key=groq_api_key)
            model_name = os.getenv("LLM_MODEL_NAME", "openai/gpt-oss-20b")
            test_response = self.client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "Say 'GPT-OSS-20B Diabetes Specialist Ready'"}],
                max_tokens=20,
                temperature=0.1,
            )
            logger.info(f"[OK] GPT-OSS-20B test: {test_response.choices[0].message.content}")
        except Exception as e:
            logger.warning(f"[WARN] GPT-OSS-20B init failed (non-fatal): {e}")
            self.client = None

    def create_diabetes_prompt(self, message: str, language: str, context: Dict = None) -> List[Dict]:
        if language == "turkish":
            system_content = (
                "Sen More Life AI'ın diyabet konusunda uzman yapay zeka asistanısın. "
                "Tüm yanıtlarını Türkçe, tıbben doğru ve anlaşılır biçimde ver. "
                "Diyabet önleme, belirtiler, tedavi ve yaşam tarzı hakkında ayrıntılı bilgi sun. "
                "Önemli: Yanıtlarında bir yapay zeka asistanı olduğunu belirt."
            )
        else:
            system_content = (
                "You are More Life AI, an expert diabetes specialist. "
                "Provide medically accurate, evidence-based information. "
                "Give specific, actionable advice. "
                "Always state that you are an AI assistant."
            )
        messages = [{"role": "system", "content": system_content}]
        if context and "user_id" in context:
            history = self.get_conversation_history(context["user_id"])
            for msg in history[-3:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})
        return messages

    async def generate_diabetes_response(self, message: str, language: str = "english", user_id: str = "default") -> Dict[str, Any]:
        self.add_to_conversation(user_id, "user", message)
        if not self.client:
            fb = self._get_enhanced_fallback(message, language)
            self.add_to_conversation(user_id, "assistant", fb)
            return {"success": False, "response": fb, "model": "enhanced_fallback", "status": "fallback"}
        try:
            model_name = os.getenv("LLM_MODEL_NAME", "openai/gpt-oss-20b")
            temperature = float(os.getenv("LLM_TEMPERATURE", 0.6))
            msgs = self.create_diabetes_prompt(message, language, {"user_id": user_id})
            response = self.client.chat.completions.create(
                model=model_name, messages=msgs, temperature=temperature, max_tokens=1500
            )
            llm_resp = response.choices[0].message.content
            self.add_to_conversation(user_id, "assistant", llm_resp)
            return {"success": True, "response": llm_resp, "model": model_name, "status": "success"}
        except Exception as e:
            logger.error(f"GPT-OSS-20B call failed: {e}")
            fb = self._get_enhanced_fallback(message, language)
            self.add_to_conversation(user_id, "assistant", fb)
            return {"success": False, "response": fb, "model": "error_fallback", "status": "error"}

    def _get_enhanced_fallback(self, message: str, language: str) -> str:
        if language == "turkish":
            return (
                "**Yapay Zeka Diyabet Asistanı**\n\n"
                "Tip 2 diyabetin yaygın belirtileri:\n"
                "- Aşırı susama ve sık idrara çıkma\n"
                "- Aşırı açlık ve nedensiz kilo kaybı\n"
                "- Yorgunluk ve bulanık görme\n\n"
                "Kesin tanı ve tedavi için lütfen bir sağlık kuruluşuna başvurun."
            )
        return (
            "**AI Diabetes Specialist**\n\n"
            "Common symptoms of Type 2 Diabetes:\n"
            "- Increased thirst and frequent urination\n"
            "- Extreme hunger and fatigue\n"
            "- Blurred vision and slow-healing sores\n\n"
            "Please consult a healthcare provider for personalized advice."
        )

    def get_conversation_history(self, user_id: str) -> List[Dict]:
        return [{"role": m["role"], "content": m["content"]} for m in self.conversation_memory.get(user_id, [])]

    def add_to_conversation(self, user_id: str, role: str, content: str):
        if user_id not in self.conversation_memory:
            self.conversation_memory[user_id] = []
        self.conversation_memory[user_id].append(
            {"role": role, "content": content, "timestamp": datetime.utcnow().isoformat()}
        )
        if len(self.conversation_memory[user_id]) > 10:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-10:]
