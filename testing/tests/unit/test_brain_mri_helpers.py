"""Unit tests for _build_recommendations in app/routes/brain_mri.py."""

import pytest

from app.routes.brain_mri import _build_recommendations


# ── no tumor ─────────────────────────────────────────────────────────────────

def test_no_tumor_immediate_message_is_reassuring():
    rec = _build_recommendations("no tumor", "none")
    assert "No tumor detected" in rec["immediate"] or "routine" in rec["immediate"].lower()


def test_no_tumor_has_lifestyle_key():
    rec = _build_recommendations("no tumor", "none")
    assert "lifestyle" in rec
    assert isinstance(rec["lifestyle"], list)


def test_no_tumor_lifestyle_not_empty():
    rec = _build_recommendations("no tumor", "none")
    assert len(rec["lifestyle"]) > 0


# ── high severity ─────────────────────────────────────────────────────────────

def test_high_severity_immediate_is_urgent():
    rec = _build_recommendations("glioma", "high")
    assert "prompt" in rec["immediate"].lower() or "delay" in rec["immediate"].lower() or "specialist" in rec["immediate"].lower()


def test_high_severity_has_immediate_and_lifestyle():
    rec = _build_recommendations("meningioma", "high")
    assert "immediate" in rec
    assert "lifestyle" in rec


def test_high_severity_lifestyle_is_list():
    rec = _build_recommendations("pituitary", "high")
    assert isinstance(rec["lifestyle"], list)
    assert len(rec["lifestyle"]) >= 2


# ── non-high severity ─────────────────────────────────────────────────────────

def test_moderate_severity_suggests_appointment():
    rec = _build_recommendations("meningioma", "moderate")
    assert "appointment" in rec["immediate"].lower() or "neurologist" in rec["immediate"].lower()


def test_return_shape_always_has_required_keys():
    for tumor_class in ("no tumor", "glioma", "meningioma", "pituitary"):
        for severity in ("none", "low", "moderate", "high"):
            rec = _build_recommendations(tumor_class, severity)
            assert "immediate" in rec
            assert "lifestyle" in rec
