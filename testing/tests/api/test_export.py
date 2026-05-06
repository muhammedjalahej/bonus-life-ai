"""
GAP 7 — Data export schema validation.

Tests cover: auth requirement, empty-assessments case, schema shape,
cross-user isolation, and correct item count after assessments are run.

Note: the export endpoint returns a 'profile' key (not 'user') per the
implementation in me_routes.py. Tests validate the actual API contract.
"""

import pytest

VALID_DIABETES = {
    "glucose": 120.0, "blood_pressure": 80.0, "weight": 75.0,
    "height": 170.0, "age": 35, "pregnancies": 0, "skin_thickness": 20.0,
    "insulin": 80.0, "diabetes_pedigree_function": 0.5, "language": "english",
}
VALID_HEART = {
    "age": 55, "sex": 1, "cp": 1, "trestbps": 130, "chol": 250, "fbs": 0,
    "restecg": 0, "thalach": 150, "exang": 0, "oldpeak": 1.0,
    "slope": 1, "ca": 0, "thal": 3, "language": "english",
}


def test_export_requires_auth(client):
    r = client.get("/api/v1/users/me/export")
    assert r.status_code == 401


def test_export_empty_assessments_returns_empty_list(client, regular_user, auth_headers):
    """A user with no assessments must get an empty assessments list, not null or 500."""
    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "assessments" in data
    assert data["assessments"] == []


def test_export_profile_contains_email(client, regular_user, auth_headers):
    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    # The API uses 'profile' key (per me_routes.py implementation)
    assert "profile" in data
    assert "email" in data["profile"]
    assert data["profile"]["email"] == regular_user.email


def test_export_profile_contains_created_at(client, regular_user, auth_headers):
    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    data = r.json()
    assert "created_at" in data["profile"]
    assert data["profile"]["created_at"] is not None


def test_export_assessments_list_has_one_item_after_diabetes(client, regular_user, auth_headers):
    """After running one diabetes assessment, the export must contain exactly 1 item."""
    client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=auth_headers)

    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["assessments"]) == 1


def test_export_assessment_item_contains_required_fields(client, regular_user, auth_headers):
    """Each assessment entry must have assessment_id, risk_level, and created_at."""
    client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=auth_headers)

    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    item = r.json()["assessments"][0]
    assert "assessment_id" in item
    assert "risk_level" in item
    assert "created_at" in item


def test_export_does_not_include_other_users_data(client, db, regular_user, auth_headers, admin_user, admin_headers):
    """User A's export must not contain User B's assessments."""
    # Run an assessment as admin_user
    client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=admin_headers)

    # Run an assessment as regular_user
    client.post("/api/v1/diabetes-assessment", json=VALID_DIABETES, headers=auth_headers)

    # Export as regular_user — should have exactly 1 assessment (their own)
    r = client.get("/api/v1/users/me/export", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["assessments"]) == 1
    assert data["profile"]["email"] == regular_user.email
