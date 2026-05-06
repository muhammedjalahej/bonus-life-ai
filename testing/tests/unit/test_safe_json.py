"""
Unit tests for the _safe_json helper present in me_routes.py and admin_routes.py.
Tests both copies to confirm they share identical semantics.
"""

import pytest

from app.routes.me_routes import _safe_json as safe_json_me
from app.routes.admin_routes import _safe_json as safe_json_admin


@pytest.mark.parametrize("fn", [safe_json_me, safe_json_admin])
class TestSafeJson:

    def test_none_input_returns_none(self, fn):
        assert fn(None) is None

    def test_empty_string_returns_none(self, fn):
        assert fn("") is None

    def test_whitespace_string_returns_none(self, fn):
        assert fn("   ") is None

    def test_valid_object_parsed_correctly(self, fn):
        result = fn('{"key": "value", "num": 42}')
        assert result == {"key": "value", "num": 42}

    def test_valid_array_parsed_correctly(self, fn):
        result = fn('[1, 2, 3]')
        assert result == [1, 2, 3]

    def test_nested_json_works(self, fn):
        payload = '{"a": {"b": {"c": [1, 2]}}}'
        result = fn(payload)
        assert result["a"]["b"]["c"] == [1, 2]

    def test_malformed_json_returns_none_not_exception(self, fn):
        assert fn('{"key": bad}') is None

    def test_truncated_json_returns_none(self, fn):
        assert fn('{"key": "val') is None

    def test_just_braces_empty_object(self, fn):
        result = fn("{}")
        assert result == {}

    def test_boolean_json(self, fn):
        assert fn("true") is True
        assert fn("false") is False

    def test_number_json(self, fn):
        assert fn("42") == 42

    def test_invalid_type_raises_gracefully(self, fn):
        # Passing an integer (not a string) — should return None, not crash
        result = fn(12345)
        assert result is None
