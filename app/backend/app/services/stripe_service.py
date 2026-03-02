"""
Stripe subscription service: checkout, portal, webhook handling.
No feature gating – all tools stay free; Pro = early access to future features.
"""
import os
import logging
from datetime import datetime
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

def _get_price_ids():
    """Read price IDs from env on each call so .env changes take effect after restart."""
    return (
        os.getenv("STRIPE_PRICE_ID_PRO_MONTHLY"),
        os.getenv("STRIPE_PRICE_ID_PRO_YEARLY"),
    )

stripe = None
if STRIPE_SECRET:
    try:
        import stripe as _stripe
        _stripe.api_key = STRIPE_SECRET
        stripe = _stripe
    except ImportError:
        logger.warning("stripe package not installed; subscription endpoints will return 503")


def is_configured() -> bool:
    return bool(stripe and STRIPE_SECRET)


def get_webhook_secret() -> Optional[str]:
    return STRIPE_WEBHOOK_SECRET or None


def _tier_from_price_id(price_id: str) -> str:
    monthly, yearly = _get_price_ids()
    if price_id == yearly:
        return "pro_yearly"
    if price_id == monthly:
        return "pro_monthly"
    return "free"


def create_or_get_customer(email: str, name: str, existing_customer_id: Optional[str] = None) -> Optional[str]:
    """Create Stripe customer or return existing id."""
    if not stripe:
        return None
    if existing_customer_id:
        try:
            stripe.Customer.retrieve(existing_customer_id)
            return existing_customer_id
        except Exception:
            pass
    try:
        customer = stripe.Customer.create(email=email, name=name or email)
        return customer.id
    except Exception as e:
        logger.exception("Stripe Customer.create failed: %s", e)
        return None


def create_checkout_session(
    customer_id: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
    user_id: int,
) -> Tuple[Optional[str], Optional[str]]:
    """Create Stripe Checkout Session for subscription. Returns (session_url, error_message)."""
    if not stripe or not price_id:
        return None, "Stripe or price_id not configured"
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user_id)},
            subscription_data={"metadata": {"user_id": str(user_id)}},
        )
        return session.url, None
    except Exception as e:
        logger.exception("Stripe checkout.Session.create failed: %s", e)
        err_msg = str(e)
        if hasattr(e, "user_message") and e.user_message:
            err_msg = e.user_message
        return None, err_msg or "Stripe request failed"


def create_portal_session(customer_id: str, return_url: str) -> Optional[str]:
    """Create Stripe Customer Portal session; returns URL or None."""
    if not stripe:
        return None
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url
    except Exception as e:
        logger.exception("Stripe billing_portal.Session.create failed: %s", e)
        return None


def parse_subscription_event(subscription) -> Tuple[str, str, Optional[datetime]]:
    """Return (tier, status, current_period_end) from Stripe subscription object."""
    status = (subscription.get("status") or "").lower()
    tier = "free"
    period_end = None
    items = subscription.get("items") or {}
    data = items.get("data") or []
    if data:
        price = (data[0].get("price") or {})
        price_id = price.get("id") or ""
        tier = _tier_from_price_id(price_id)
    if subscription.get("current_period_end"):
        try:
            period_end = datetime.utcfromtimestamp(subscription["current_period_end"])
        except Exception:
            pass
    return tier, status, period_end


def get_price_id(plan: str) -> Optional[str]:
    """Return Stripe price_id for plan: pro_monthly | pro_yearly."""
    monthly, yearly = _get_price_ids()
    if plan == "pro_yearly":
        return yearly
    if plan == "pro_monthly":
        return monthly
    return None


def confirm_checkout_session(session_id: str) -> Optional[Tuple[str, str, Optional[datetime], Optional[str], Optional[str], Optional[str]]]:
    """
    Retrieve Checkout Session by id (after success redirect).
    Returns (tier, status, current_period_end, stripe_subscription_id, stripe_customer_id, metadata_user_id) or None.
    """
    if not stripe or not session_id:
        return None
    try:
        session = stripe.checkout.Session.retrieve(
            session_id,
            expand=["subscription"],
        )
        if not session or session.get("mode") != "subscription":
            return None
        metadata = session.get("metadata") or {}
        metadata_user_id = metadata.get("user_id") if isinstance(metadata, dict) else None
        sub = session.get("subscription")
        if not sub:
            return None
        if isinstance(sub, str):
            sub = stripe.Subscription.retrieve(sub)
        tier, status, period_end = parse_subscription_event(sub)
        sub_id = sub.get("id") if isinstance(sub, dict) else getattr(sub, "id", None)
        customer_id = session.get("customer")
        if isinstance(customer_id, dict):
            customer_id = customer_id.get("id")
        return (tier, status, period_end, sub_id, customer_id, metadata_user_id)
    except Exception as e:
        logger.exception("Stripe confirm_checkout_session failed: %s", e)
        return None


def fetch_subscription_for_user(stripe_subscription_id: Optional[str], stripe_customer_id: Optional[str]) -> Optional[Tuple[str, str, Optional[datetime], Optional[str]]]:
    """
    Fetch subscription from Stripe by sub_id or by customer_id (first active subscription).
    Returns (tier, status, period_end, sub_id) or None.
    """
    if not stripe:
        return None
    sub = None
    try:
        if stripe_subscription_id:
            sub = stripe.Subscription.retrieve(stripe_subscription_id)
        elif stripe_customer_id:
            subs = stripe.Subscription.list(customer=stripe_customer_id, status="active", limit=1)
            data = subs.get("data") if isinstance(subs, dict) else (getattr(subs, "data", None) or [])
            if data:
                sub = data[0]
        if not sub:
            return None
        tier, status, period_end = parse_subscription_event(sub)
        sub_id = sub.get("id") if isinstance(sub, dict) else getattr(sub, "id", None)
        return (tier, status, period_end, sub_id)
    except Exception as e:
        logger.exception("Stripe fetch_subscription_for_user failed: %s", e)
        return None
