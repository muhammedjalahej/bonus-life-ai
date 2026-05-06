"""
GAP 3 — Token revocation behavior documentation (SEC-10).

SEC-10 is a known remaining risk: JWT tokens are not invalidated when a user
changes their password. This file contains:

  1. An xfail test that DOCUMENTS the known gap (it is expected to fail today
     because the fix is not yet implemented). When the fix is shipped, this
     test will start passing and must be converted to a plain passing test.

  2. Passing tests that prove the INTERIM MITIGATION works: admin deactivating
     a user account immediately blocks the token, and re-activating restores it.

See 06-final-report.md section "SEC-10" for the recommended fix:
  Add token_version column to User table.
"""

import pytest


# ─── Known failing behavior (xfail — documents SEC-10) ───────────────────────

@pytest.mark.xfail(
    strict=True,
    reason=(
        "SEC-10 known remaining risk: JWT tokens are not invalidated after "
        "password change. Fix requires adding token_version column to User "
        "table and embedding the version in every JWT. See 06-final-report.md."
    ),
)
def test_token_is_invalidated_after_password_change(client, regular_user, auth_headers):
    """
    KNOWN FAILING TEST — documents SEC-10.

    After a password change the old JWT should be rejected with 401.
    Today it is NOT rejected — the token remains valid for its full 7-day
    lifetime. This test is marked xfail(strict=True) so it appears in CI
    output as a clearly documented known gap rather than a silently missing
    test.

    When the token_version fix is implemented this test will start passing;
    at that point remove the xfail marker.
    """
    # Change the password using the current token
    r_change = client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "Password123!", "new_password": "NewPassword1!"},
        headers=auth_headers,
    )
    assert r_change.status_code == 200

    # The old token should now be rejected — but currently it is NOT (SEC-10)
    r_me = client.get("/api/v1/auth/me", headers=auth_headers)
    # This assertion intentionally FAILS today to document the known risk:
    assert r_me.status_code == 401


# ─── Working interim mitigation: is_active check ─────────────────────────────

def test_deactivated_user_token_is_immediately_rejected(client, db, regular_user, auth_headers, admin_user, admin_headers):
    """
    Interim mitigation for SEC-10: deactivating a user via the admin panel
    immediately blocks all requests from that user's existing tokens.
    """
    # Confirm the token works before deactivation
    r_before = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r_before.status_code == 200

    # Admin deactivates the user
    r_deactivate = client.patch(
        f"/api/v1/admin/users/{regular_user.id}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert r_deactivate.status_code == 200

    # The old token must now be rejected
    r_after = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r_after.status_code in (401, 403), (
        "Token for a deactivated user must be rejected (401 or 403). "
        "This is the interim mitigation for SEC-10."
    )


def test_reactivated_user_token_is_accepted_again(client, db, regular_user, auth_headers, admin_user, admin_headers):
    """
    After re-activation, the same JWT is accepted again. This confirms the
    is_active DB check is being evaluated on every request.
    """
    # Deactivate
    client.patch(
        f"/api/v1/admin/users/{regular_user.id}",
        json={"is_active": False},
        headers=admin_headers,
    )

    # Re-activate
    r_reactivate = client.patch(
        f"/api/v1/admin/users/{regular_user.id}",
        json={"is_active": True},
        headers=admin_headers,
    )
    assert r_reactivate.status_code == 200

    # Token must be accepted again
    r_after = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r_after.status_code == 200, (
        "Token for a re-activated user must be accepted again."
    )
