"""
Shared pytest fixtures for the Bonus Life AI backend test suite.

Env vars are set at module load time so they take effect before any
app.* imports happen. All ML models and external API clients are
replaced with lightweight mock objects — tests never hit real APIs.
Each test gets a fresh DB state via the clear_tables autouse fixture.
"""

import os
import sys
import tempfile

# ── Must be set BEFORE any app.* imports ─────────────────────────────────────
_tmp_fd, _TEST_DB_PATH = tempfile.mkstemp(suffix=".test.db")
os.close(_tmp_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ["JWT_SECRET"] = "test-jwt-secret-not-for-production-aabb1122"
os.environ.setdefault("GROQ_API_KEY", "gsk_test_key")
os.environ.setdefault("GEMINI_API_KEY", "test_gemini_key")
os.environ.setdefault("ELEVENLABS_API_KEY", "test_tts_key")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_xxx")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("SMTP_HOST", "localhost")
os.environ.setdefault("SMTP_USER", "")
os.environ.setdefault("SMTP_PASSWORD", "")

# Add backend to sys.path so `from app.xxx import ...` works
_BACKEND = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "app", "backend")
)
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
# ─────────────────────────────────────────────────────────────────────────────

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.db_models import User
from app.auth import hash_password, create_access_token


# ── Database engine (session-scoped — created once for the whole test run) ────

@pytest.fixture(scope="session")
def engine():
    from app.database import engine as _app_engine
    Base.metadata.create_all(bind=_app_engine)
    yield _app_engine


@pytest.fixture(autouse=True)
def clear_tables(engine):
    """Delete all rows from every table after each test for full isolation."""
    yield
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        for tbl in reversed(Base.metadata.sorted_tables):
            conn.execute(tbl.delete())
        conn.execute(text("PRAGMA foreign_keys=ON"))
        conn.commit()


@pytest.fixture
def db(engine):
    """Fresh SQLAlchemy session per test."""
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()


# ── Mock ML services ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def mock_ai():
    mock = MagicMock()
    mock.generate_medical_response = AsyncMock(
        return_value={"success": True, "response": "Mock AI assessment response."}
    )
    return mock


@pytest.fixture(scope="session")
def mock_diabetes_model():
    mock = MagicMock()
    mock.predict.return_value = (
        "High Risk", 0.78, {"Glucose": 0.45, "BMI": 0.32, "Age": 0.12}
    )
    # Returning None prevents a truthy MagicMock from being embedded in the JSON payload
    mock.explain.return_value = None
    return mock


@pytest.fixture(scope="session")
def mock_heart_model():
    mock = MagicMock()
    mock.predict.return_value = (
        "High Risk", 0.82, {"age": 0.30, "chol": 0.20, "thalach": 0.15}
    )
    return mock


@pytest.fixture(scope="session")
def mock_ckd_model():
    mock = MagicMock()
    mock.predict.return_value = (
        "CKD", 0.91, {"serum_creatinine": 0.40, "hemoglobin": 0.25}
    )
    return mock


@pytest.fixture(scope="session")
def mock_brain_mri():
    mock = MagicMock()
    mock.predict.return_value = {
        "tumor_class": "no tumor",
        "confidence": 0.95,
        "all_probabilities": {
            "no tumor": 0.95, "glioma": 0.02, "meningioma": 0.02, "pituitary": 0.01,
        },
        "tumor_description": "No tumor detected.",
        "severity": "none",
        "model_available": True,
    }
    return mock


# ── Minimal FastAPI test application ─────────────────────────────────────────

@pytest.fixture(scope="session")
def app(mock_ai, mock_diabetes_model, mock_heart_model, mock_ckd_model, mock_brain_mri):
    """
    Minimal FastAPI app without a lifespan so no ML models are loaded at
    startup.  Mock objects are injected directly into each route module's
    module-level globals.
    """
    import app.routes.assessment as _ra
    import app.routes.heart as _rh
    import app.routes.ckd as _rc
    import app.routes.brain_mri as _rb

    _ra._ai_specialist = mock_ai
    _ra._diabetes_model = mock_diabetes_model
    _rh._ai_specialist = mock_ai
    _rh._heart_model = mock_heart_model
    _rc._ai_specialist = mock_ai
    _rc._ckd_model = mock_ckd_model
    _rb._ai_specialist = mock_ai
    _rb._brain_mri_service = mock_brain_mri

    from app.routes import auth as auth_routes
    from app.routes import me_routes
    from app.routes import assessment as assess_routes
    from app.routes import heart as heart_routes
    from app.routes import ckd as ckd_routes
    from app.routes import brain_mri as mri_routes
    from app.routes import admin_routes

    test_app = FastAPI()
    test_app.include_router(auth_routes.router, prefix="/api/v1")
    test_app.include_router(me_routes.router, prefix="/api/v1")
    test_app.include_router(assess_routes.router, prefix="/api/v1")
    test_app.include_router(heart_routes.router, prefix="/api/v1")
    test_app.include_router(ckd_routes.router, prefix="/api/v1")
    test_app.include_router(mri_routes.router, prefix="/api/v1")
    test_app.include_router(admin_routes.router, prefix="/api/v1")
    test_app.include_router(admin_routes.public_router, prefix="/api/v1")

    return test_app


@pytest.fixture
def client(app, db):
    """Function-scoped TestClient with the test DB session injected."""
    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


# ── Rate-limiter reset (prevents tests from hitting limits set by prior tests) -

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.rate_limit import _store
    _store.clear()
    yield
    _store.clear()


# ── User / token helpers ──────────────────────────────────────────────────────

@pytest.fixture
def regular_user(db):
    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Test User",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db):
    user = User(
        email="admin@example.com",
        hashed_password=hash_password("AdminPass123!"),
        full_name="Admin User",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def inactive_user(db):
    user = User(
        email="inactive@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Inactive User",
        role="user",
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_token(regular_user):
    return create_access_token({"sub": str(regular_user.id), "role": "user"})


@pytest.fixture
def admin_token(admin_user):
    return create_access_token({"sub": str(admin_user.id), "role": "admin"})


@pytest.fixture
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Canonical valid request bodies ───────────────────────────────────────────

VALID_DIABETES = {
    "glucose": 120.0,
    "blood_pressure": 80.0,
    "weight": 75.0,
    "height": 170.0,
    "age": 35,
    "pregnancies": 0,
    "skin_thickness": 20.0,
    "insulin": 80.0,
    "diabetes_pedigree_function": 0.5,
    "language": "english",
}

VALID_HEART = {
    "age": 55,
    "sex": 1,
    "cp": 1,
    "trestbps": 130,
    "chol": 250,
    "fbs": 0,
    "restecg": 0,
    "thalach": 150,
    "exang": 0,
    "oldpeak": 1.0,
    "slope": 1,
    "ca": 0,
    "thal": 3,
    "language": "english",
}

VALID_CKD = {
    "age": 45.0,
    "blood_pressure": 80.0,
    "specific_gravity": 1.020,
    "albumin": 0,
    "sugar": 0,
    "red_blood_cells": 0,
    "pus_cell": 0,
    "pus_cell_clumps": 0,
    "bacteria": 0,
    "blood_glucose_random": 120.0,
    "blood_urea": 25.0,
    "serum_creatinine": 1.0,
    "sodium": 140.0,
    "potassium": 4.5,
    "hemoglobin": 13.0,
    "packed_cell_volume": 40.0,
    "white_blood_cell_count": 7800.0,
    "red_blood_cell_count": 5.0,
    "hypertension": 0,
    "diabetes_mellitus": 0,
    "coronary_artery_disease": 0,
    "appetite": 1,
    "pedal_edema": 0,
    "anemia": 0,
    "language": "english",
}
