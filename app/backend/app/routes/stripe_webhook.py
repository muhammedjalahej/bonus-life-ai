"""Stripe webhook: update user subscription from Stripe events."""
import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.services import stripe_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe subscription events; verify signature and update User."""
    secret = stripe_service.get_webhook_secret()
    if not secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not set; rejecting webhook")
        raise HTTPException(status_code=503, detail="Webhook not configured")
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        import stripe as st
        event = st.Webhook.construct_event(body, sig, secret)
    except ValueError as e:
        logger.warning("Stripe webhook invalid payload: %s", e)
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        logger.warning("Stripe webhook signature verify failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle subscription lifecycle
    if event["type"] == "customer.subscription.created":
        sub = event["data"]["object"]
        user_id = (sub.get("metadata") or {}).get("user_id")
        if user_id:
            try:
                user_id_int = int(user_id)
            except (ValueError, TypeError):
                logger.warning("Stripe webhook: non-integer user_id in metadata: %s", user_id)
                return {"received": True}
            user = db.query(User).filter(User.id == user_id_int).first()
            if user:
                tier, status, period_end = stripe_service.parse_subscription_event(sub)
                user.stripe_subscription_id = sub.get("id")
                user.subscription_tier = tier
                user.subscription_status = status
                user.current_period_end = period_end
                db.commit()
                logger.info("Subscription created: user_id=%s tier=%s", user_id, tier)
    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        user = db.query(User).filter(User.stripe_subscription_id == sub.get("id")).first()
        if user:
            tier, status, period_end = stripe_service.parse_subscription_event(sub)
            user.subscription_tier = tier
            user.subscription_status = status
            user.current_period_end = period_end
            db.commit()
            logger.info("Subscription updated: user_id=%s tier=%s status=%s", user.id, tier, status)
    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user = db.query(User).filter(User.stripe_subscription_id == sub.get("id")).first()
        if user:
            user.stripe_subscription_id = None
            user.subscription_tier = "free"
            user.subscription_status = "canceled"
            user.current_period_end = None
            db.commit()
            logger.info("Subscription deleted: user_id=%s", user.id)

    return {"received": True}
