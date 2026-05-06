"""
GAP 10 — TOTP 2FA full lifecycle.

Tests cover: setup returns secret and URI, verify with valid code enables 2FA,
verify with invalid code returns 400, DB state after enable and disable, and
auth requirement on all 2FA endpoints.

Requires: pyotp (pip install pyotp)
"""

import pytest

try:
    import pyotp
    PYOTP_AVAILABLE = True
except ImportError:
    PYOTP_AVAILABLE = False


pytestmark = pytest.mark.skipif(
    not PYOTP_AVAILABLE,
    reason="pyotp not installed — install with: pip install pyotp",
)


# ─── Setup endpoint ───────────────────────────────────────────────────────────

def test_2fa_setup_returns_secret_and_uri(client, regular_user, auth_headers):
    r = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "secret" in data, "Setup response must contain 'secret'"
    assert "uri" in data, "Setup response must contain 'uri' (provisioning URI)"


def test_2fa_setup_uri_has_otpauth_prefix(client, regular_user, auth_headers):
    r = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    uri = r.json()["uri"]
    assert uri.startswith("otpauth://totp/"), (
        f"Provisioning URI must start with 'otpauth://totp/', got: {uri!r}"
    )


def test_2fa_setup_requires_auth(client):
    r = client.post("/api/v1/users/me/2fa/setup")
    assert r.status_code == 401


# ─── Verify endpoint ─────────────────────────────────────────────────────────

def test_2fa_verify_with_valid_code_returns_200(client, db, regular_user, auth_headers):
    r_setup = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    assert r_setup.status_code == 200
    secret = r_setup.json()["secret"]

    # Generate a valid TOTP code from the secret
    valid_code = pyotp.TOTP(secret).now()

    r_verify = client.post(
        "/api/v1/users/me/2fa/verify",
        json={"code": valid_code},
        headers=auth_headers,
    )
    assert r_verify.status_code == 200, (
        f"Valid TOTP code must return 200, got {r_verify.status_code}: {r_verify.text}"
    )


def test_2fa_verify_enables_totp_in_db(client, db, regular_user, auth_headers):
    r_setup = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    secret = r_setup.json()["secret"]
    valid_code = pyotp.TOTP(secret).now()

    client.post(
        "/api/v1/users/me/2fa/verify",
        json={"code": valid_code},
        headers=auth_headers,
    )

    db.refresh(regular_user)
    assert regular_user.totp_enabled is True, (
        "totp_enabled must be True in DB after successful verification"
    )
    assert regular_user.totp_secret is not None, (
        "totp_secret must be non-null after TOTP setup"
    )


def test_2fa_verify_with_invalid_code_returns_400(client, regular_user, auth_headers):
    client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)

    r_verify = client.post(
        "/api/v1/users/me/2fa/verify",
        json={"code": "000000"},
        headers=auth_headers,
    )
    assert r_verify.status_code in (400, 422), (
        f"Invalid TOTP code must return 400 or 422, got {r_verify.status_code}"
    )


def test_2fa_verify_requires_auth(client):
    r = client.post("/api/v1/users/me/2fa/verify", json={"code": "123456"})
    assert r.status_code == 401


# ─── Disable endpoint ────────────────────────────────────────────────────────

def test_2fa_disable_returns_200(client, db, regular_user, auth_headers):
    # Set up and enable first
    r_setup = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    secret = r_setup.json()["secret"]
    valid_code = pyotp.TOTP(secret).now()
    client.post("/api/v1/users/me/2fa/verify", json={"code": valid_code}, headers=auth_headers)

    r_disable = client.post("/api/v1/users/me/2fa/disable", headers=auth_headers)
    assert r_disable.status_code == 200


def test_2fa_disable_sets_totp_enabled_false_in_db(client, db, regular_user, auth_headers):
    # Set up and enable first
    r_setup = client.post("/api/v1/users/me/2fa/setup", headers=auth_headers)
    secret = r_setup.json()["secret"]
    valid_code = pyotp.TOTP(secret).now()
    client.post("/api/v1/users/me/2fa/verify", json={"code": valid_code}, headers=auth_headers)

    # Disable
    client.post("/api/v1/users/me/2fa/disable", headers=auth_headers)

    db.refresh(regular_user)
    assert regular_user.totp_enabled is False, (
        "totp_enabled must be False in DB after disable"
    )


def test_2fa_disable_requires_auth(client):
    r = client.post("/api/v1/users/me/2fa/disable")
    assert r.status_code == 401
