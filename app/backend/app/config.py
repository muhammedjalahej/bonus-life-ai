"""Settings from .env. — Yazen"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Bonus Life AI"
    MODEL_PATH: str = "./data/best_model.pkl"
    GROQ_API_KEY: str
    LLM_MODEL_NAME: str
    LLM_TEMPERATURE: float = 0.6
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
