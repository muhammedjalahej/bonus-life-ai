# Bonus Life AI — Test Plan

## 1. Framework & Setup

### Stack

| Tool | Purpose |
|------|---------|
| **pytest** | Test runner, fixtures, parametrize |
| **pytest-asyncio** | Async test support (`asyncio_mode = auto`) |
| **FastAPI TestClient** (Starlette) | In-process HTTP calls, no server needed |
| **SQLite temp file DB** | Isolated per-session database, discarded after run |
| **MagicMock / AsyncMock** | ML model and AI specialist stubs |
| **python-jose** | JWT encoding in security tests |
| **locust** | Distributed load testing |
| **requests** | CLI benchmark mode (optional) |
| **tabulate** | Benchmark output formatting (optional) |

### Install

```bash
# From the project root
pip install pytest pytest-asyncio fastapi[all] sqlalchemy python-jose[cryptography] bcrypt passlib pillow

# For load testing
pip install locust

# For benchmark table output (optional)
pip install tabulate requests
```

### Configuration

`testing/tests/pytest.ini` controls all pytest behaviour:

```ini
[pytest]
asyncio_mode = auto
filterwarnings =
    ignore::DeprecationWarning
    ignore::UserWarning
    ignore::pytest.PytestUnraisableExceptionWarning
log_cli = false
log_level = WARNING
```

### How the test app is built

The production `app/main.py` loads three ML models on startup (lifespan event).
The test suite does **not** import `main.py`. Instead, `conftest.py` builds a
minimal FastAPI instance with no lifespan, injects `MagicMock` objects directly
into each route module's globals (`_diabetes_model`, `_heart_model`, `_ckd_model`,
`_ai_specialist`), and overrides the `get_db` dependency to use a temp SQLite file.

This means:
- Tests start in milliseconds (no model loading).
- ML predictions are deterministic (`predict_proba` returns `[[0.3, 0.7]]`).
- The full HTTP → route → service → DB path is exercised.

---

## 2. Directory Layout

```
testing/
├── 01-analysis-report.md
├── 02-security-report.md
├── 03-performance-report.md
├── 04-stability-report.md
└── 05-test-plan.md          ← this file

testing/tests/
├── pytest.ini
├── conftest.py              ← shared fixtures for all suites
│
├── unit/
│   ├── test_auth_utils.py
│   ├── test_rate_limiter.py
│   ├── test_assessment_helpers.py
│   ├── test_ckd_helpers.py
│   ├── test_brain_mri_helpers.py
│   └── test_safe_json.py
│
├── integration/
│   ├── test_auth_db.py
│   ├── test_assessment_db.py
│   └── test_notification_service.py
│
├── api/
│   ├── test_auth_endpoints.py
│   ├── test_user_endpoints.py
│   ├── test_assessment_endpoints.py
│   ├── test_admin_endpoints.py
│   └── test_public_endpoints.py
│
├── regression/
│   ├── test_stability_regressions.py
│   └── test_security_regressions.py
│
├── edge-cases/
│   ├── test_input_boundaries.py
│   └── test_medical_extremes.py
│
├── security/
│   ├── test_auth_security.py
│   ├── test_rate_limiting.py
│   └── test_input_security.py
│
├── e2e/
│   ├── test_user_assessment_flow.py
│   └── test_admin_flow.py
│
└── performance/
    ├── locustfile.py
    └── benchmark.py
```

---

## 3. What Each File Covers

### `conftest.py`
Shared infrastructure used by every suite:
- Env vars (`DATABASE_URL`, `JWT_SECRET`) set before any app import.
- Session-scoped SQLite engine + `clear_tables` autouse fixture (runs after each test).
- `db` fixture (function-scoped SQLAlchemy session).
- Mock fixtures: `mock_diabetes_model`, `mock_heart_model`, `mock_ckd_model`, `mock_brain_mri`, `mock_ai`.
- `app` fixture (minimal FastAPI with mocks injected).
- `client` fixture (TestClient with `get_db` override).
- `reset_rate_limiter` autouse fixture (`_store.clear()` before/after each test).
- User fixtures: `regular_user`, `admin_user`, `inactive_user`, tokens, headers.
- Shared valid payload constants: `VALID_DIABETES`, `VALID_HEART`, `VALID_CKD`.

---

### Unit Tests

#### `unit/test_auth_utils.py` (16 tests)
`hash_password`, `verify_password`, `create_access_token`, `decode_token`.
Wrong secret → raises. Expired token → raises. Garbage string → raises. Non-integer `sub` → handled.

#### `unit/test_rate_limiter.py` (9 tests)
`check_rate_limit` allows up to N calls then blocks. Window expiry resets the counter.
Independent keys do not interfere. `limit=1` edge case.

#### `unit/test_assessment_helpers.py` (22 tests)
`_identify_risk_factors` in `routes/assessment.py`:
glucose thresholds (normal / pre-diabetic / diabetic), BMI categories (underweight / normal / overweight / obese), blood-pressure stages, age risk factor.
`_calculate_metabolic_age` — never below 20.
`_calculate_health_score` — always in [0, 100].
`_generate_lifestyle_recommendations` — returns a list, never empty.

#### `unit/test_ckd_helpers.py` (14 tests)
CKD `_identify_risk_factors`: creatinine levels, urea, hemoglobin, hypertension flag, diabetes flag.
`_lifestyle_recommendations`: returns list, renal-diet tip present for high creatinine.

#### `unit/test_brain_mri_helpers.py` (8 tests)
`_build_recommendations` for each tumor class (glioma, meningioma, pituitary, no_tumor).
High-severity label. Moderate-severity label. No-tumor path returns safe message.

#### `unit/test_safe_json.py` (12 tests)
`_safe_json` from both `me_routes` and `admin_routes`.
None → `{}`. Empty string → `{}`. Valid object/array. Nested structure. Malformed JSON → `{}`. Truncated JSON → `{}`. Integer input → `{}`.

---

### Integration Tests

#### `integration/test_auth_db.py` (10 tests)
ORM layer: create user, retrieve by email, duplicate email raises `IntegrityError`, password stored as bcrypt hash (never plaintext), `is_active` defaults True, `role` defaults `"user"`, admin role stored correctly.

#### `integration/test_assessment_db.py` (8 tests)
`Assessment` ORM: record created, FK links to `User.id`, `share_token` / `admin_hidden` defaults, multiple records per user, JSON payload round-trip, `assessment_id` is a unique UUID string, cascade delete removes child records.

#### `integration/test_notification_service.py` (7 tests)
`create_notification(db, user_id, title, message, notif_type)`:
Record created and persisted, `is_read` defaults False, `notif_type` stored correctly, multiple notifications per user independent, long `message` truncated at 2048 chars, long `title` truncated at 255 chars.

---

### API / Endpoint Tests

#### `api/test_auth_endpoints.py` (18 tests)
`POST /api/v1/auth/register` — valid, duplicate email (409), password too short (422), missing fields (422).
`POST /api/v1/auth/login` — valid (200 + token), wrong password (401), inactive user (403), nonexistent user (401), email case-insensitive.
`GET /api/v1/auth/me` — no token (401), valid token (200), invalid token (401).
`POST /api/v1/auth/forgot-password` — known and unknown email both return 200 (no enumeration).
`POST /api/v1/auth/reset-password` — valid token resets password, invalid token (400), expired token (400), short new password (422).

#### `api/test_user_endpoints.py` (14 tests)
`GET /api/v1/users/me` — returns profile fields.
`PATCH /api/v1/users/me` — updates `full_name` and `preferred_language`, changes persist.
`GET /api/v1/users/me/assessments` — empty list initially, populated after assessment.
`GET /api/v1/users/me/heart-assessments` — same pattern.
`GET /api/v1/users/me/ckd-assessments` — same pattern.
`GET /api/v1/users/me/diet-plans` — returns list.
`POST /api/v1/users/me/change-password` — valid (200), wrong current password (400), new password too short (422).
`GET /api/v1/users/me/notifications` — returns list.

#### `api/test_assessment_endpoints.py` (15 tests)
`POST /api/v1/diabetes-assessment` — anonymous (200), authenticated (200 + `assessment_id`).
Response shape: `prediction`, `confidence`, `risk_analysis`, `recommendations`, `timestamp`, `assessment_id`.
`POST /api/v1/heart-assessment` — anonymous and authenticated.
`POST /api/v1/ckd-assessment` — anonymous and authenticated.
Missing required field → 422. Wrong type → 422.
`DELETE /api/v1/users/me/assessments/{id}` — deletes record, subsequent GET returns empty list.

#### `api/test_admin_endpoints.py` (22 tests)
RBAC: no token → 401, regular user → 403, admin user → 200 (for all admin routes).
`GET /api/v1/admin/system-health` — `services.Database` is `true`.
`POST /api/v1/admin/users` — creates user, response contains `user.id`.
`PATCH /api/v1/admin/users/{id}` — updates `is_active`.
`DELETE /api/v1/admin/users/{id}` — removes user.
Announcements CRUD: create / list / update / delete. Invalid `expires_at` → 400.
`PATCH /api/v1/admin/settings` — valid key (200), invalid key (400).
`GET /api/v1/admin/audit-log` — returns list.

#### `api/test_public_endpoints.py` (11 tests)
`GET /api/v1/auth/maintenance-status` — returns `{"maintenance_mode": false}` by default.
`GET /api/v1/announcements/active` — only active, non-expired announcements returned.
Inactive announcement excluded. Expired (`expires_at` in past) excluded. Future expiry included.
`GET /api/v1/shared/assessments/{token}` — invalid token → 404, valid token → 200.
Shared view does not expose private fields (`user_id`, `email`).

---

### Regression Tests

#### `regression/test_stability_regressions.py` (11 tests)
One test per fix from `04-stability-report.md`:
- **Fix 1** — Non-integer JWT `sub` returns 401, not 500.
- **Fix 2** — Stripe webhook integer guard verified via source inspection.
- **Fix 3** — DB save failure still returns assessment result (isolated save).
- **Fix 4** — Corrupted JSON in stored payload returns `{}`, not 500.
- **Fix 5** — PIL `Image.verify()` call present; invalid image → 400 (`skipif` PIL absent).
- **Fix 6** — Invalid `expires_at` on announcement creation → 400.
- **Fix 7** — Expired announcements excluded from `/announcements/active`.
- **Fix 7b** — Announcement with no `expires_at` always appears.
- **Fix 8** — Avatar cleanup logic present in source (old file removed on update).
- **Fix 9** — `admin_system_health` returns `{"services": {"Database": true}}`.

#### `regression/test_security_regressions.py` (11 tests)
One test per finding from `02-security-report.md`:
- **SEC-01** — `JWT_SECRET` default-value warning present in `auth.py` source.
- **SEC-03** — `forgot-password` does not change the password; token stored in DB; token cleared after use.
- **SEC-04** — 11th login attempt → 429. 11th register attempt → 429.
- **SEC-05** — Password under 8 chars rejected at registration and at change-password.
- **SEC-06** — TOTP uses `TOTPVerifyRequest` body model (not query param).
- **SEC-07** — Error response for unauthenticated request does not contain `"path"` key.
- **SEC-08** — Unknown settings key → 400. Known key (`allow_signups`) → 200.

---

### Edge-Case Tests

#### `edge-cases/test_input_boundaries.py` (24 tests)
Pydantic `Field(ge=x, le=y)` boundaries enforced:
- `glucose`: 0 (valid), 500 (valid), 501 (422), -0.1 (422).
- `age`: 1 (valid), 120 (valid), 121 (422), 0 (422).
- `weight` / `height`: minimum valid values.
- Heart: `trestbps` 80 (valid) / 79 (422), `chol` 100 (valid) / 99 (422) / 600 (valid), `thalach` 60 (valid), `sex` 2 (422).
- CKD: `serum_creatinine` 0.1 (valid) / 0.09 (422) / 20.0 (valid), `specific_gravity` bounds.
- Password: 8 chars (valid), 7 chars (422), 128 chars (valid), 129 chars (422).

#### `edge-cases/test_medical_extremes.py` (14 tests)
Extreme but valid clinical values do not crash the server:
- Zero glucose → prediction still returned.
- Max glucose (500) → response has `executive_summary` and `timestamp`.
- Infant age (1) and elderly age (120).
- All maximum risk-factor values → multiple high-severity factors identified.
- All normal values → "No significant" risk factor.
- Extreme cholesterol, creatinine, hemoglobin all return 200.
- `assessment_id` is always a valid UUID string.

---

### Security Tests

#### `security/test_auth_security.py` (14 tests + parametrize)
- Wrong JWT secret → 401.
- `alg: none` (algorithm confusion) → 401.
- Expired token → 401.
- No token → 401.
- Malformed token → 401.
- Non-integer `sub` in JWT → 401 (not 500).
- Token with `role: admin` claim but DB user has `role: user` → 403 (DB is authoritative).
- Deactivated user token → 401.
- Regular user attempting all admin endpoints → 403 (parametrized over 6 routes).

#### `security/test_rate_limiting.py` (8 tests)
Login: 10 attempts allowed, 11th → 429 with `"Too many requests"` in `detail`.
Register: 10 attempts allowed, 11th → 429.
Forgot-password: 3 attempts allowed, 4th → 429.
Rate-limit keys are per-endpoint: hitting login limit does not affect forgot-password.
`_store` cleared by autouse fixture between tests to prevent pollution.

#### `security/test_input_security.py` (12 tests)
SQL injection string in email → 401 or 422, never 500.
`'; DROP TABLE users; --` in register email → never 500.
`<script>` tag in `full_name` stored literally (XSS stored as text, not executed).
300-char email → never 500.
1000-char `full_name` → never 500.
Unknown settings key injection → 400.
Known settings key still works → 200.
Empty Bearer token → 401. Missing `Authorization` header → 401. `Basic` scheme → 401.
Assessment probability always in [0.0, 1.0].
Regular user cannot access `/admin/assessments` → 403.
Error response does not include `"path"` field.

---

### E2E Tests

#### `e2e/test_user_assessment_flow.py` (5 flows)
Complete user journeys through the API:
1. Register → login → diabetes assessment → view history (1 record) → delete → history empty.
2. Register → heart assessment → generate share link → access shared view publicly (no auth).
3. Register → run diabetes + heart assessments → verify both in history → export user data.
4. Register → update `full_name` + `preferred_language` → verify persisted → change password → login with new password.
5. Register → submit CKD with high-risk indicators (`serum_creatinine=3.5`, hypertension+diabetes) → verify in CKD history.

#### `e2e/test_admin_flow.py` (5 flows)
Complete admin management journeys:
1. Create user → list users (appears) → deactivate → login blocked (403) → reactivate → delete.
2. Create announcement → appears publicly → deactivate → no longer public → delete → not in admin list.
3. System health check (`Database: true`) + audit log is a list.
4. Create user → run assessment as that user → admin sees it → admin soft-deletes → no longer in admin list.
5. Disable signups → registration blocked (403/503) → re-enable → registration succeeds.

---

### Performance Tests

#### `performance/locustfile.py`
Locust load test with three concurrent user classes:

| Class | Behaviour | Weight |
|-------|-----------|--------|
| `UserBehavior` | register → diabetes/heart/ckd assessments → view history → profile | 6 |
| `AdminBehavior` | login as admin → stats → list users → system health | 1 |
| `ReadOnlyBehavior` | active announcements → maintenance status | 3 |

#### `performance/benchmark.py`
Dual-mode latency benchmark:
- **pytest mode** — uses TestClient (no server), runs 20 iterations per endpoint, asserts p95 < 500 ms and success rate ≥ 90%.
- **CLI mode** — calls a live server, prints p50/p95/p99/mean table.

Endpoints covered: diabetes assessment, heart assessment, CKD assessment, assessment history, announcements, admin stats, admin users list, auth/register.

---

## 4. Running Tests

### Run the full suite

```bash
cd testing/tests
pytest . -v
```

### Run with coverage

```bash
cd testing/tests
pytest . --cov=app --cov-report=term-missing -v
```

### Run a single suite

```bash
# Unit tests only
pytest unit/ -v

# Integration tests only
pytest integration/ -v

# API endpoint tests only
pytest api/ -v

# Regression tests only
pytest regression/ -v

# Edge-case tests only
pytest edge-cases/ -v

# Security tests only
pytest security/ -v
```

### Run E2E tests

```bash
cd testing/tests
pytest e2e/ -v
```

E2E tests run against the same in-process TestClient as all other suites — no
live server is required. They exercise full multi-step user journeys end-to-end.

### Run a single file

```bash
pytest security/test_auth_security.py -v
pytest regression/test_stability_regressions.py -v
```

### Run a single test by name

```bash
pytest -k "test_login_blocks_on_11th_attempt" -v
pytest -k "test_e2e_register_login_assess_view_delete" -v
```

---

## 5. Running Performance / Load Tests

### Locust (interactive UI)

```bash
cd testing/tests/performance
locust -f locustfile.py --host http://localhost:8001
# Open http://localhost:8089 → set users=50, spawn-rate=5 → Start
```

### Locust (headless / CI)

```bash
locust -f locustfile.py \
  --host http://localhost:8001 \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --headless \
  --csv=results/load_test
```

Output CSVs: `results/load_test_stats.csv`, `results/load_test_failures.csv`.

### Benchmark (pytest, no server)

```bash
cd testing/tests/performance
pytest benchmark.py -v -s

# Increase iterations
BENCH_RUNS=50 pytest benchmark.py -v -s

# Tighten latency threshold
BENCH_P95_MAX_MS=300 pytest benchmark.py -v -s
```

### Benchmark (CLI, against live server)

```bash
pip install requests tabulate
python testing/tests/performance/benchmark.py --host http://localhost:8001 --runs 100
```

### Manual performance checklist (no tool required)

If locust cannot be installed, run this manual checklist instead:

1. **Assessment throughput** — `ab -n 100 -c 10 -p diabetes.json -T application/json http://localhost:8001/api/v1/diabetes-assessment`
2. **DB read latency** — `time curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/users/me/assessments`
3. **Admin dashboard** — `time curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8001/api/v1/admin/stats`
4. Check `PRAGMA journal_mode` returns `wal` (confirms WAL mode active).
5. Run `EXPLAIN QUERY PLAN SELECT ... FROM assessments WHERE user_id = ?` and confirm index is used.

---

## 6. CI Integration

```yaml
# .github/workflows/test.yml (example)
- name: Run tests
  run: |
    pip install pytest pytest-asyncio fastapi sqlalchemy python-jose[cryptography] bcrypt passlib pillow
    cd testing/tests
    pytest . -v --tb=short

- name: Load test (optional, on schedule)
  run: |
    pip install locust
    locust -f testing/tests/performance/locustfile.py \
      --host http://localhost:8001 \
      --users 20 --spawn-rate 2 --run-time 60s --headless
```

---

## 7. Known Coverage Gaps

The following areas are not covered by this test suite and represent known gaps:

### Not tested

| Area | Reason / Notes |
|------|---------------|
| **Brain MRI file upload** (actual inference) | Requires a real ML model and valid DICOM/image file; mocked at the route level |
| **Diet Plan generation** (AI content) | `_ai_specialist` is mocked; the GPT/Claude call itself is not exercised |
| **Workout video scraping** (YouTube) | External dependency; not testable in isolation without VCR cassettes |
| **TOTP flow** (enable/verify/disable) | Requires `pyotp`; the body-param regression is covered but the full TOTP lifecycle is not |
| **Stripe webhook** (payment events) | Requires Stripe test keys and signed payloads; only the integer guard regression is covered via source inspection |
| **Password reset email delivery** | SMTP is mocked; actual email content and deliverability are not verified |
| **WebSocket / real-time notifications** | No WebSocket client in test suite |
| **Avatar file storage** | File system side-effects not verified; only cleanup logic is inspected via source |
| **Multi-language AI responses** | Arabic/French language paths not exercised (mocked response is English) |
| **Database migration correctness** | Alembic migrations not run in tests; `Base.metadata.create_all` is used instead |
| **Concurrent write safety** | Locust covers concurrent HTTP load, but SQLite WAL correctness under concurrent writes is not unit-tested |
| **Token refresh** | No refresh-token endpoint exists currently; if added, tests will be needed |

### Partially covered

| Area | What is tested | What is missing |
|------|---------------|-----------------|
| **Share link** | Share token generation and 404 on invalid token | Expiry of share links; sharing of CKD/diabetes results |
| **Announcements** | Full CRUD, active filter, expiry filter | Pagination; ordering |
| **Admin audit log** | Exists and returns a list | Content correctness (which actions are logged) |
| **Export** | Endpoint returns 200 with `user` or `assessments` key | Full schema of exported data; CSV vs JSON format |
| **Notifications** | Creation and persistence | Mark-as-read; filtering by type |

### Performance gaps

- No sustained-soak test (> 5 minutes under load).
- No memory-leak detection under repeated model inference.
- No test for DB connection pool exhaustion under high concurrency.
- p99 thresholds in `benchmark.py` are uncalibrated — set against mocked ML inference; real-model p99 will be higher.
