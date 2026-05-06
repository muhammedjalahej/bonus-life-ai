# Stability Audit Report — Bonus Life AI Backend

**Engineer role:** Senior Software Engineer — Reliability  
**Audit date:** 2026-05-03  
**Scope:** Backend only (`app/backend/`). No security re-work, no performance re-work.  
**Input:** `testing/01-analysis-report.md` (full codebase analysis)  
**Rules:** Preserve all existing correct business logic · Minimal, safe changes · No redesign

---

## Summary

| # | Severity | Finding | File | Fix Applied |
|---|----------|---------|------|-------------|
| 1 | High | `get_current_user` crashes with 500 on non-integer JWT `sub` | `auth.py` | Yes |
| 2 | High | Stripe webhook crashes with unhandled 500 on non-integer `user_id` metadata | `routes/stripe_webhook.py` | Yes |
| 3 | High | DB save failure in assessment handlers loses the computed result | `routes/assessment.py`, `heart.py`, `ckd.py` | Yes |
| 4 | Medium | Corrupted JSON payload crashes list and shared-view endpoints with 500 | `routes/me_routes.py`, `routes/admin_routes.py` | Yes |
| 5 | Medium | PIL image decode failure returns 500 instead of 400 for bad uploads | `routes/brain_mri.py` | Yes |
| 6 | Medium | Invalid `expires_at` date string silently ignored — announcement created without expiry | `routes/admin_routes.py` | Yes |
| 7 | Medium | Expired announcements still returned by `/announcements/active` | `routes/admin_routes.py` | Yes |
| 8 | Low | `upload_avatar` leaves orphaned file on disk when DB commit fails | `routes/me_routes.py` | Yes |
| 9 | Low | DB health check uses wrong SQLAlchemy pattern — may falsely report DB as down | `routes/admin_routes.py` | Yes |

---

## Applied Fixes

---

### Fix 1 — `get_current_user` crashes with 500 on malformed JWT subject
**File:** `app/backend/app/auth.py`  
**Severity:** High

**Bug:** `get_current_user` calls `int(payload["sub"])` with no exception handling. If the JWT `sub` field contains a non-integer value (malformed or tampered token), Python raises `ValueError`. FastAPI catches unhandled exceptions and returns 500. The correct response is 401 — it is an authentication failure, not a server error.

The companion function `get_current_user_optional` already handled this correctly with a `try/except (ValueError, TypeError)` block. The optional variant and the required variant had inconsistent behaviour for the same malformed input.

**Fix:**
```python
# Before
user_id = int(payload["sub"])

# After
try:
    user_id = int(payload["sub"])
except (ValueError, TypeError):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
```

**Behaviour preserved:** Valid tokens still authenticate correctly. `int("123")` still works. Only malformed tokens now return 401 instead of 500.

---

### Fix 2 — Stripe webhook crashes with 500 on non-integer `user_id` in metadata
**File:** `app/backend/app/routes/stripe_webhook.py`  
**Severity:** High

**Bug:** The webhook handler's signature verification is inside a `try/except`, but the subscription event processing is outside it. When a `customer.subscription.created` event arrives, the handler calls `int(user_id)` on the Stripe metadata `user_id` field with no guard. If the metadata is missing, malformed, or accidentally set to a non-integer string, this raises `ValueError`, which becomes an unhandled 500.

Stripe treats 5xx responses as transient failures and retries the webhook repeatedly (up to 72 hours). This would cause an infinite retry storm for the affected event.

**Fix:**
```python
# Before
user = db.query(User).filter(User.id == int(user_id)).first()

# After
try:
    user_id_int = int(user_id)
except (ValueError, TypeError):
    logger.warning("Stripe webhook: non-integer user_id in metadata: %s", user_id)
    return {"received": True}
user = db.query(User).filter(User.id == user_id_int).first()
```

**Behaviour preserved:** Valid integer `user_id` values continue to work. Invalid metadata is logged and the webhook returns 200 (`{"received": True}`) which tells Stripe the event was acknowledged — preventing infinite retries.

---

### Fix 3 — DB save failure in assessment handlers loses the computed result
**Files:** `app/backend/app/routes/assessment.py`, `heart.py`, `ckd.py`  
**Severity:** High

**Bug:** In all three assessment handlers, the DB save (`db.add(rec)`, `db.commit()`) and the `return AssessmentResponse(...)` were both inside the same outer `try/except Exception` block. If `db.commit()` raises any exception (e.g. `IntegrityError` on a duplicate UUID — extremely rare but possible, or any transient DB error), the entire handler returns 500. The ML model inference and LLM summary generation had already succeeded. The user loses their result and must re-run the entire expensive pipeline.

**Fix:** Split the handler into two phases:
1. Computation phase (model inference + LLM) — inside the original try/except. If this fails, return 500.
2. DB save phase — in its own isolated try/except. If this fails, log the error and rollback, but **still return the result to the user**.

```python
# Computation phase (unchanged)
try:
    ... model inference, LLM call, build response dicts ...
    assessment_id = str(uuid.uuid4())
except Exception as e:
    logger.error(...)
    raise HTTPException(status_code=500, ...)

# DB save phase — isolated; failure doesn't discard the result
if current_user:
    try:
        rec = Assessment(...)
        db.add(rec)
        db.commit()
        create_notification(...)
    except Exception as db_err:
        logger.error(f"Failed to save assessment to DB: {db_err}")
        db.rollback()

return AssessmentResponse(...)  # always returned on successful computation
```

**Behaviour preserved:** Successful assessments return the full result as before. If DB save fails, the result is still returned and the error is logged — the user sees their assessment even if it wasn't persisted. The `brain_mri.py` handler already had this separation (LLM failure was isolated); the fix brings the other handlers in line.

---

### Fix 4 — Corrupted JSON payload crashes list and shared-view endpoints
**Files:** `app/backend/app/routes/me_routes.py`, `app/backend/app/routes/admin_routes.py`  
**Severity:** Medium

**Bug:** Multiple endpoints call `json.loads(r.payload) if r.payload else None` directly in list comprehensions. If any single row in the database has a corrupted JSON payload (truncated write, manual DB edit, encoding issue), `json.loads()` raises `json.JSONDecodeError`. This crashes the **entire list response** with 500, making all of a user's history inaccessible — even all the valid records. Similarly, the public shared-view endpoints (`/shared/assessment/{token}`, etc.) would 500 on any shared record with a corrupted payload.

**Affected endpoints:**
- `GET /users/me/assessments`
- `GET /users/me/heart-assessments`
- `GET /users/me/ckd-assessments`
- `GET /users/me/brain-mri-analyses`
- `GET /users/me/diet-plans`
- `GET /users/me/export`
- `GET /shared/assessment/{token}`
- `GET /shared/heart/{token}`
- `GET /shared/ckd/{token}`

**Fix:** Added a `_safe_json()` helper to both files and replaced all bare `json.loads()` calls:

```python
def _safe_json(s):
    """Parse a JSON string, returning None on any error."""
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        return None
```

**Behaviour preserved:** Valid JSON payloads are returned exactly as before. Corrupted payloads return `null` in the `payload` field instead of crashing — the rest of the record (risk_level, probability, executive_summary, created_at) is still returned correctly.

---

### Fix 5 — PIL image decode failure returns 500 instead of 400
**File:** `app/backend/app/routes/brain_mri.py`  
**Severity:** Medium

**Bug:** When a user uploads a file that is not a valid image (wrong format, corrupted bytes, empty file accidentally bypassing the size check), PIL raises `UnidentifiedImageError` or `OSError` inside `brain_mri_service.predict()`. The service re-raises the exception. The route handler's outer `except Exception` catches it and returns 500 "Brain MRI analysis service temporarily unavailable" — implying a server-side problem. This is a user error (bad input), not a server error, and should be a 400.

**Fix:** Added an early PIL format validation before calling the inference service. Uses `Image.verify()` on the raw bytes, which is a lightweight header-only check:

```python
try:
    import io as _io
    from PIL import Image as _PIL_Val
    _PIL_Val.open(_io.BytesIO(image_bytes)).verify()
except ImportError:
    pass  # PIL not installed; let the service handle it
except Exception:
    raise HTTPException(
        status_code=400,
        detail="Invalid or unreadable image file. Please upload a valid JPG or PNG.",
    )
```

The `except HTTPException: raise` guard that already existed in the handler ensures this 400 propagates correctly past the outer `except Exception`.

**Behaviour preserved:** Valid images pass `verify()` and proceed to inference as before. Invalid uploads get a clear 400 error instead of a misleading 500. If PIL is not installed (edge case), the guard falls through and the service handles it.

---

### Fix 6 — Invalid `expires_at` date string silently ignored on announcement creation
**File:** `app/backend/app/routes/admin_routes.py`  
**Severity:** Medium

**Bug:** `admin_create_announcement` and `admin_update_announcement` both wrapped the `datetime.fromisoformat()` call in `try/except` with a bare `pass` or `ann.expires_at = None` on failure. If an admin submits `expires_at: "next tuesday"` or any non-ISO string, the announcement was created successfully — but with no expiry date, silently discarding the admin's intent. No validation error was returned.

For the update endpoint this was worse: updating with an invalid date would silently null out an existing valid expiry date.

**Fix:**
```python
# Before
try:
    expires_dt = datetime.fromisoformat(...)
except Exception:
    pass  # silently ignored

# After
try:
    expires_dt = datetime.fromisoformat(...)
except Exception:
    raise HTTPException(
        status_code=400,
        detail="Invalid expires_at format. Use ISO 8601, e.g. 2025-12-31T23:59:00Z",
    )
```

**Behaviour preserved:** Valid ISO 8601 strings (with or without `Z` suffix) continue to work. `null`/empty `expires_at` (no expiry) continues to work. Only invalid format strings now return 400 instead of silently misbehaving.

---

### Fix 7 — Expired announcements still returned by `/announcements/active`
**File:** `app/backend/app/routes/admin_routes.py`  
**Severity:** Medium

**Bug:** `GET /announcements/active` filtered on `is_active == True` but ignored the `expires_at` column entirely. An announcement with `is_active=True` and `expires_at` in the past would continue to appear on the frontend indefinitely. The admin would have to manually set `is_active=False` or delete it — the expiry field had no functional effect on the public endpoint.

**Fix:**
```python
# Before
rows = db.query(Announcement).filter(Announcement.is_active == True)

# After
now = datetime.utcnow()
rows = (
    db.query(Announcement)
    .filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now),
    )
)
```

**Behaviour preserved:** Announcements with no expiry (`expires_at IS NULL`) continue to appear. Announcements where `expires_at > now` appear. Only announcements where `expires_at <= now` are now correctly hidden. This is the intended semantics of the `expires_at` field.

---

### Fix 8 — `upload_avatar` leaves orphaned file on disk when DB commit fails
**File:** `app/backend/app/routes/me_routes.py`  
**Severity:** Low

**Bug:** The avatar upload handler wrote the file to disk before the DB commit. If `db.commit()` failed (e.g. DB locked, constraint error), the file remained on disk permanently. On each retry, a new file was written, but none of them were referenced in the database. Over time this leaks storage.

**Fix:**
```python
try:
    user.avatar_url = avatar_path
    db.commit()
    db.refresh(user)
except Exception as db_err:
    logger.error(f"Failed to update avatar_url in DB for user {user.id}: {db_err}")
    try:
        filepath.unlink(missing_ok=True)
    except Exception:
        pass
    raise HTTPException(status_code=500, detail="Failed to save avatar. Please try again.")
```

**Behaviour preserved:** Successful uploads work identically. On DB failure, the file is cleaned up and the user gets a clear 500 with a retry message. `missing_ok=True` ensures cleanup doesn't itself crash if the file was somehow already removed.

---

### Fix 9 — Admin system health check uses wrong SQLAlchemy execution pattern
**File:** `app/backend/app/routes/admin_routes.py`  
**Severity:** Low

**Bug:** The DB liveness check used `db.execute(func.count(User.id)).scalar()`. `db.execute()` on a `Session` object expects a SQL expression construct (a `select()` statement), not a bare column expression. In SQLAlchemy 2.x this raises `TypeError`, which is caught by the `except Exception` guard — setting `db_ok = False`. The admin system health page would always show the database as "down" even when it was fully operational.

The rest of the codebase uses `db.query(Model).scalar()` consistently (ORM style, valid in both SQLAlchemy 1.x and 2.x).

**Fix:**
```python
# Before
db.execute(func.count(User.id)).scalar()

# After
db.query(func.count(User.id)).scalar()
```

**Behaviour preserved:** Same query semantics. Uses the same pattern as every other COUNT query in the file. If the DB is actually down, `db.query()` raises an exception and `db_ok` is correctly set to `False`.

---

## Documented-Only Findings (Not Applied)

### Finding A — `brain_mri_service.py` re-raises raw exceptions from inference
**Severity:** Low  
**Location:** `services/brain_mri_service.py:predict()`

The `predict()` method catches exceptions from model inference and re-raises them. Fix 5 above handles this at the route level for image decode failures. For model inference errors (GPU OOM, tensor shape mismatch), the re-raise is appropriate — these are genuine server errors that should surface as 500. No change needed.

---

### Finding B — `diet.py` route: `DietPlanResponse(**result)` on an incomplete fallback dict
**Severity:** Low  
**Location:** `routes/diet.py`

If `_meal_service.generate_plan()` somehow returns a dict missing required keys, `DietPlanResponse(**result)` raises a Pydantic `ValidationError` which is caught by the outer `except Exception` and becomes 500 "Meal plan generation failed". In practice, `generate_plan()` always falls back to a template that includes all keys. Not applied — the fallback paths are complete and the outer handler correctly returns 500 if anything slips through.

---

### Finding C — `admin_delete_user` doesn't pre-delete all child tables
**Severity:** Low (mitigated)  
**Location:** `routes/admin_routes.py:admin_delete_user()`

`admin_delete_user` manually deletes `assessments` and `diet_plan_records` before deleting the user, but not `heart_assessments`, `ckd_assessments`, `brain_mri_analyses`, `meal_logs`, `notifications`, etc. Before the performance fix (which enabled `PRAGMA foreign_keys=ON`), this left orphaned rows in those tables. With `PRAGMA foreign_keys=ON` now in place (added in the performance audit), the database's `ON DELETE CASCADE` constraints handle all child tables automatically. Not applied separately — the performance fix already resolves this.

---

## Files Changed

| File | Change |
|------|--------|
| `app/backend/app/auth.py` | `try/except` around `int(payload["sub"])` in `get_current_user` |
| `app/backend/app/routes/stripe_webhook.py` | `try/except` around `int(user_id)` in subscription.created handler |
| `app/backend/app/routes/assessment.py` | Isolated DB save phase; computation result returned even if save fails |
| `app/backend/app/routes/heart.py` | Isolated DB save phase; computation result returned even if save fails |
| `app/backend/app/routes/ckd.py` | Isolated DB save phase; computation result returned even if save fails |
| `app/backend/app/routes/me_routes.py` | `_safe_json()` helper; replaced all bare `json.loads()` on payload columns; orphan file cleanup in avatar upload |
| `app/backend/app/routes/admin_routes.py` | `_safe_json()` helper; invalid date → 400 in create/update announcement; expired announcement filter; DB health check pattern fix |
| `app/backend/app/routes/brain_mri.py` | PIL `verify()` before inference — image format errors return 400 not 500 |
