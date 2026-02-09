"""Create in-app notifications for users."""

from sqlalchemy.orm import Session

from app.db_models import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str = "",
    notif_type: str = "info",
) -> Notification:
    """Create and persist an in-app notification for a user."""
    msg_truncated = (message or "")[:2048]  # avoid huge messages
    rec = Notification(
        user_id=user_id,
        title=(title or "Notification")[:255],
        message=msg_truncated,
        type=(notif_type or "info")[:50],
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
