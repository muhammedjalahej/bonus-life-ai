"""
Signed assessment reports: sign payload hash (ECDSA P-256), verify via public API.
Authors: Bonus Life AI
"""

import json
import hashlib
import base64
import uuid
import logging
from datetime import datetime

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric import utils as asym_utils
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from app.database import get_db
from app.db_models import Assessment, HeartAssessment
from app.auth import get_current_user
from app.db_models import User
from app.report_signing import get_public_key_pem, sign_digest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


class VerifyBody(BaseModel):
    payload_hash: str = ""
    signature_b64: str = ""


def _canonical_payload(assessment: Assessment) -> dict:
    """Build stable dict for hashing (sorted keys, safe subset)."""
    payload_raw = assessment.payload
    try:
        payload_parsed = json.loads(payload_raw) if payload_raw else {}
    except Exception:
        payload_parsed = {}
    return {
        "assessment_db_id": assessment.id,
        "assessment_uuid": assessment.assessment_id or "",
        "created_at": (assessment.created_at.isoformat() if assessment.created_at else ""),
        "risk_level": assessment.risk_level or "",
        "probability": float(assessment.probability) if assessment.probability is not None else 0.0,
        "executive_summary": (assessment.executive_summary or "")[:2000],
        "payload": payload_parsed,
    }


def _canonical_json(payload: dict) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


@router.post("/sign-assessment/{assessment_db_id}")
def sign_assessment(
    assessment_db_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sign an assessment for the current user; returns report_id, payload_hash, signature_b64."""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_db_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assessment")

    payload = _canonical_payload(assessment)
    canonical = _canonical_json(payload)
    digest = hashlib.sha256(canonical.encode("utf-8")).digest()
    payload_hash_hex = digest.hex()

    sig_der = sign_digest(digest)
    signature_b64 = base64.b64encode(sig_der).decode("ascii")

    report_id = str(uuid.uuid4())
    issued_at = datetime.utcnow().isoformat() + "Z"

    return {
        "report_id": report_id,
        "issued_at": issued_at,
        "assessment_db_id": assessment_db_id,
        "payload_hash": payload_hash_hex,
        "signature_b64": signature_b64,
        "alg": "ES256",
    }


def _canonical_payload_heart(heart_assessment: HeartAssessment) -> dict:
    """Build stable dict for hashing (heart assessment)."""
    payload_raw = heart_assessment.payload
    try:
        payload_parsed = json.loads(payload_raw) if payload_raw else {}
    except Exception:
        payload_parsed = {}
    return {
        "assessment_db_id": heart_assessment.id,
        "assessment_uuid": heart_assessment.assessment_id or "",
        "created_at": (heart_assessment.created_at.isoformat() if heart_assessment.created_at else ""),
        "risk_level": heart_assessment.risk_level or "",
        "probability": float(heart_assessment.probability) if heart_assessment.probability is not None else 0.0,
        "executive_summary": (heart_assessment.executive_summary or "")[:2000],
        "payload": payload_parsed,
    }


@router.post("/sign-heart-assessment/{heart_assessment_db_id}")
def sign_heart_assessment(
    heart_assessment_db_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sign a heart assessment for the current user; returns report_id, payload_hash, signature_b64."""
    heart_assessment = db.query(HeartAssessment).filter(HeartAssessment.id == heart_assessment_db_id).first()
    if not heart_assessment:
        raise HTTPException(status_code=404, detail="Heart assessment not found")
    if heart_assessment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assessment")

    payload = _canonical_payload_heart(heart_assessment)
    canonical = _canonical_json(payload)
    digest = hashlib.sha256(canonical.encode("utf-8")).digest()
    payload_hash_hex = digest.hex()

    sig_der = sign_digest(digest)
    signature_b64 = base64.b64encode(sig_der).decode("ascii")

    report_id = str(uuid.uuid4())
    issued_at = datetime.utcnow().isoformat() + "Z"

    return {
        "report_id": report_id,
        "issued_at": issued_at,
        "assessment_db_id": heart_assessment_db_id,
        "payload_hash": payload_hash_hex,
        "signature_b64": signature_b64,
        "alg": "ES256",
    }


@router.get("/public-key")
def get_public_key():
    """Public endpoint: return PEM of the key used for report signatures."""
    pem = get_public_key_pem()
    return {"public_key_pem": pem, "alg": "ES256"}


def _verify_signature(payload_hash_hex: str, signature_b64: str) -> bool:
    try:
        digest = bytes.fromhex(payload_hash_hex)
        if len(digest) != 32:
            return False
        sig_der = base64.b64decode(signature_b64)
        pem = get_public_key_pem()
        public_key = load_pem_public_key(pem.encode("utf-8"))
        public_key.verify(sig_der, digest, ec.ECDSA(asym_utils.Prehashed(hashes.SHA256())))
        return True
    except Exception as e:
        logger.debug("Verify failed: %s", e)
        return False


@router.post("/verify")
def verify_report(body: VerifyBody):
    """Public endpoint: verify payload_hash + signature_b64; returns { valid: true/false }."""
    if not body.payload_hash or not body.signature_b64:
        return {"valid": False, "error": "payload_hash and signature_b64 required"}
    valid = _verify_signature(body.payload_hash, body.signature_b64)
    return {"valid": valid}
