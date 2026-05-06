"""Integration tests: Assessment ORM records, FK constraints, cascades."""

import json
import uuid

import pytest

from app.db_models import User, Assessment, HeartAssessment, CKDAssessment
from app.auth import hash_password


@pytest.fixture
def user(db):
    u = User(email="assess@example.com", hashed_password=hash_password("pw"), role="user")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_create_assessment_record(db, user):
    rec = Assessment(
        user_id=user.id,
        assessment_id=str(uuid.uuid4()),
        risk_level="Low Risk",
        probability=0.15,
        executive_summary="All clear.",
        payload=json.dumps({"glucose": 90}),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    assert rec.id is not None
    assert rec.risk_level == "Low Risk"


def test_assessment_linked_to_user(db, user):
    rec = Assessment(
        user_id=user.id, assessment_id=str(uuid.uuid4()),
        risk_level="High Risk", probability=0.82,
    )
    db.add(rec)
    db.commit()
    found = db.query(Assessment).filter(Assessment.user_id == user.id).first()
    assert found is not None
    assert found.user_id == user.id


def test_share_token_default_is_none(db, user):
    rec = Assessment(user_id=user.id, assessment_id=str(uuid.uuid4()), risk_level="Low Risk", probability=0.1)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    assert rec.share_token is None


def test_admin_hidden_default_is_false(db, user):
    rec = Assessment(user_id=user.id, assessment_id=str(uuid.uuid4()), risk_level="Low Risk", probability=0.1)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    assert rec.admin_hidden is False


def test_multiple_assessments_per_user(db, user):
    for _ in range(3):
        db.add(Assessment(user_id=user.id, assessment_id=str(uuid.uuid4()), risk_level="Low Risk", probability=0.1))
    db.commit()
    count = db.query(Assessment).filter(Assessment.user_id == user.id).count()
    assert count == 3


def test_payload_stored_as_json_string(db, user):
    data = {"glucose": 120, "bmi": 25.3}
    rec = Assessment(user_id=user.id, assessment_id=str(uuid.uuid4()),
                     risk_level="Low Risk", probability=0.1, payload=json.dumps(data))
    db.add(rec)
    db.commit()
    db.refresh(rec)
    parsed = json.loads(rec.payload)
    assert parsed["glucose"] == 120


def test_assessment_id_must_be_unique(db, user):
    from sqlalchemy.exc import IntegrityError
    aid = str(uuid.uuid4())
    db.add(Assessment(user_id=user.id, assessment_id=aid, risk_level="Low Risk", probability=0.1))
    db.commit()
    db.add(Assessment(user_id=user.id, assessment_id=aid, risk_level="Low Risk", probability=0.2))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_deleting_user_cascades_to_assessments(db):
    """ON DELETE CASCADE must remove assessments when the user is deleted."""
    u = User(email="cascade@example.com", hashed_password="h", role="user")
    db.add(u)
    db.commit()
    db.refresh(u)
    for _ in range(2):
        db.add(Assessment(user_id=u.id, assessment_id=str(uuid.uuid4()), risk_level="Low Risk", probability=0.1))
    db.commit()
    db.delete(u)
    db.commit()
    remaining = db.query(Assessment).filter(Assessment.user_id == u.id).count()
    assert remaining == 0
