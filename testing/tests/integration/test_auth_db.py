"""Integration tests: User ORM model, DB constraints, password hashing."""

import pytest
from sqlalchemy.exc import IntegrityError

from app.db_models import User
from app.auth import hash_password, verify_password


def test_create_user_basic(db):
    user = User(
        email="alice@example.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Alice",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.id is not None
    assert user.email == "alice@example.com"


def test_retrieve_user_by_email(db):
    db.add(User(email="bob@example.com", hashed_password=hash_password("pw"), role="user"))
    db.commit()
    found = db.query(User).filter(User.email == "bob@example.com").first()
    assert found is not None
    assert found.email == "bob@example.com"


def test_email_stored_as_given_case(db):
    db.add(User(email="CamelCase@Example.com", hashed_password="hash", role="user"))
    db.commit()
    found = db.query(User).filter(User.email == "CamelCase@Example.com").first()
    assert found is not None


def test_duplicate_email_raises_integrity_error(db):
    db.add(User(email="dup@example.com", hashed_password="h1", role="user"))
    db.commit()
    db.add(User(email="dup@example.com", hashed_password="h2", role="user"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_password_stored_as_hash_not_plaintext(db):
    pw = "mypassword"
    user = User(email="hashed@example.com", hashed_password=hash_password(pw), role="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.hashed_password != pw
    assert verify_password(pw, user.hashed_password)


def test_default_is_active_true(db):
    user = User(email="active@example.com", hashed_password="h", role="user")
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.is_active is True


def test_default_role_is_user(db):
    user = User(email="default@example.com", hashed_password="h")
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.role == "user"


def test_admin_role_stored(db):
    user = User(email="admin@example.com", hashed_password="h", role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    assert user.role == "admin"


def test_deactivated_user_can_be_found_by_flag(db):
    user = User(email="off@example.com", hashed_password="h", role="user", is_active=False)
    db.add(user)
    db.commit()
    found = db.query(User).filter(User.email == "off@example.com").first()
    assert found.is_active is False


def test_multiple_users_independent(db):
    for i in range(5):
        db.add(User(email=f"u{i}@example.com", hashed_password="h", role="user"))
    db.commit()
    count = db.query(User).count()
    assert count == 5
