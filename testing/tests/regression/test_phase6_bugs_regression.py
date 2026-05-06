"""
GAP 1 — Regression tests for Phase 6 bugs Bug F-A and Bug F-B.

Bug F-A: verify_password raises on corrupted hash instead of returning False.
Bug F-B: Deleting a User via the ORM does not cascade-delete child assessment records.

These tests ensure neither bug can silently re-appear.
"""

import pytest
from app.auth import verify_password
from app.db_models import User, Assessment, HeartAssessment, CKDAssessment
from app.auth import hash_password


# ─── Bug F-A: verify_password with corrupted / missing hash ──────────────────

def test_verify_password_corrupted_hash_returns_false():
    """Corrupted hash string must not raise — must return False."""
    result = verify_password("anypassword", "not-a-bcrypt-hash")
    assert result is False


def test_verify_password_empty_hash_returns_false():
    """Empty hash string must return False, not raise."""
    result = verify_password("anypassword", "")
    assert result is False


def test_verify_password_none_hash_returns_false():
    """None hash must return False, not raise."""
    result = verify_password("anypassword", None)
    assert result is False


def test_verify_password_correct_hash_still_works():
    """Sanity check: a correctly hashed password still verifies as True."""
    hashed = hash_password("correct_password")
    assert verify_password("correct_password", hashed) is True


def test_verify_password_wrong_password_returns_false():
    """Sanity check: wrong password against a correct hash returns False."""
    hashed = hash_password("correct_password")
    assert verify_password("wrong_password", hashed) is False


def test_login_with_corrupted_hash_returns_401_not_500(client, db):
    """
    HTTP-level regression: a user with a corrupted stored hash triggers 401 on
    login, not a 500 internal server error.
    """
    # Insert user with a deliberately corrupted hash directly into the DB
    user = User(
        email="corrupt@example.com",
        hashed_password="corrupted",
        full_name="Corrupt User",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()

    r = client.post(
        "/api/v1/auth/login",
        json={"email": "corrupt@example.com", "password": "somepassword"},
    )
    assert r.status_code == 401, (
        f"Expected 401 for corrupted hash, got {r.status_code}. "
        "Bug F-A regression: verify_password must not raise on bad hash."
    )


# ─── Bug F-B: ORM cascade delete removes all child records ───────────────────

def test_delete_user_cascades_to_all_assessment_tables(db):
    """
    Deleting a user via db.delete(user) must remove all child assessment
    records from all three assessment tables. No IntegrityError, no orphans.

    Bug F-B regression: cascade="all, delete-orphan" was missing from
    several User relationships in db_models.py.
    """
    import uuid

    # 1. Create the user
    user = User(
        email="cascadetest@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="Cascade Test",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id

    # 2. Create one record in each child table
    diabetes_rec = Assessment(
        user_id=user_id,
        assessment_id=str(uuid.uuid4()),
        risk_level="High",
        probability=0.75,
        executive_summary="test",
        payload="{}",
    )
    heart_rec = HeartAssessment(
        user_id=user_id,
        assessment_id=str(uuid.uuid4()),
        risk_level="High",
        probability=0.80,
        executive_summary="test",
        payload="{}",
    )
    ckd_rec = CKDAssessment(
        user_id=user_id,
        assessment_id=str(uuid.uuid4()),
        prediction="CKD",
        confidence=0.90,
        executive_summary="test",
        payload="{}",
    )
    db.add_all([diabetes_rec, heart_rec, ckd_rec])
    db.commit()

    # Confirm they exist before delete
    assert db.query(Assessment).filter_by(user_id=user_id).count() == 1
    assert db.query(HeartAssessment).filter_by(user_id=user_id).count() == 1
    assert db.query(CKDAssessment).filter_by(user_id=user_id).count() == 1

    # 3. Delete the user — must not raise
    db.delete(user)
    db.commit()

    # 4. All child rows must be gone
    assert db.query(Assessment).filter_by(user_id=user_id).count() == 0, (
        "Bug F-B: Assessment rows were not cascade-deleted when user was deleted."
    )
    assert db.query(HeartAssessment).filter_by(user_id=user_id).count() == 0, (
        "Bug F-B: HeartAssessment rows were not cascade-deleted when user was deleted."
    )
    assert db.query(CKDAssessment).filter_by(user_id=user_id).count() == 0, (
        "Bug F-B: CKDAssessment rows were not cascade-deleted when user was deleted."
    )


def test_delete_user_with_no_children_does_not_raise(db):
    """Deleting a user with no child records must work cleanly."""
    user = User(
        email="nochildren@example.com",
        hashed_password=hash_password("Password123!"),
        full_name="No Children",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Must not raise any exception
    db.delete(user)
    db.commit()

    assert db.query(User).filter_by(email="nochildren@example.com").first() is None
