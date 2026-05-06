"""Unit tests for app/auth.py — pure function logic, no HTTP, no DB."""

import time
from datetime import timedelta

import pytest

from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)


# ── hash_password ─────────────────────────────────────────────────────────────

def test_hash_password_returns_string():
    result = hash_password("secret123")
    assert isinstance(result, str)
    assert len(result) > 20


def test_hash_password_is_not_plaintext():
    pw = "mysecret"
    assert hash_password(pw) != pw


def test_hash_password_salted_differently_each_time():
    pw = "samepassword"
    h1 = hash_password(pw)
    h2 = hash_password(pw)
    assert h1 != h2, "bcrypt should produce different hashes due to random salt"


# ── verify_password ───────────────────────────────────────────────────────────

def test_verify_password_correct():
    pw = "correcthorsebattery"
    assert verify_password(pw, hash_password(pw)) is True


def test_verify_password_wrong():
    assert verify_password("wrongpass", hash_password("rightpass")) is False


def test_verify_password_empty_against_hash():
    assert verify_password("", hash_password("notempty")) is False


def test_verify_password_wrong_hash_format():
    assert verify_password("anything", "notahash") is False


# ── create_access_token ───────────────────────────────────────────────────────

def test_create_access_token_returns_string():
    token = create_access_token({"sub": "42", "role": "user"})
    assert isinstance(token, str)
    assert len(token) > 20


def test_create_access_token_custom_expiry():
    token = create_access_token({"sub": "1"}, expires_delta=timedelta(minutes=5))
    payload = decode_token(token)
    assert payload is not None
    assert "exp" in payload


def test_create_access_token_payload_contains_sub():
    token = create_access_token({"sub": "99"})
    payload = decode_token(token)
    assert payload["sub"] == "99"


# ── decode_token ──────────────────────────────────────────────────────────────

def test_decode_valid_token():
    token = create_access_token({"sub": "5", "role": "admin"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "5"
    assert payload["role"] == "admin"


def test_decode_garbage_returns_none():
    assert decode_token("not.a.valid.jwt") is None


def test_decode_empty_string_returns_none():
    assert decode_token("") is None


def test_decode_expired_token_returns_none():
    expired = create_access_token(
        {"sub": "1"}, expires_delta=timedelta(seconds=-1)
    )
    assert decode_token(expired) is None


def test_decode_wrong_secret_returns_none():
    """Token signed with a different secret must be rejected."""
    from jose import jwt
    wrong_token = jwt.encode(
        {"sub": "1", "exp": int(time.time()) + 3600},
        "completely-wrong-secret",
        algorithm="HS256",
    )
    assert decode_token(wrong_token) is None
