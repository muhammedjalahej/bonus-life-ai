"""Integration tests for app/services/notification_service.py."""

import pytest

from app.db_models import User, Notification
from app.auth import hash_password
from app.services.notification_service import create_notification


@pytest.fixture
def user(db):
    u = User(email="notif@example.com", hashed_password=hash_password("pw"), role="user")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_create_notification_returns_record(db, user):
    rec = create_notification(db, user.id, "Test title", "Test message", "info")
    assert rec.id is not None
    assert rec.title == "Test title"


def test_notification_is_unread_by_default(db, user):
    rec = create_notification(db, user.id, "Title", "Body", "info")
    assert rec.is_read is False


def test_notification_type_stored(db, user):
    rec = create_notification(db, user.id, "Alert", "Something happened", "warning")
    assert rec.type == "warning"


def test_notification_persisted_in_db(db, user):
    create_notification(db, user.id, "Saved", "", "success")
    found = db.query(Notification).filter(Notification.user_id == user.id).first()
    assert found is not None
    assert found.title == "Saved"


def test_multiple_notifications_per_user(db, user):
    for i in range(3):
        create_notification(db, user.id, f"Notif {i}", "", "info")
    count = db.query(Notification).filter(Notification.user_id == user.id).count()
    assert count == 3


def test_long_message_is_truncated_to_2048(db, user):
    long_msg = "x" * 3000
    rec = create_notification(db, user.id, "Title", long_msg, "info")
    assert len(rec.message) <= 2048


def test_long_title_is_truncated_to_255(db, user):
    long_title = "T" * 300
    rec = create_notification(db, user.id, long_title, "", "info")
    assert len(rec.title) <= 255
