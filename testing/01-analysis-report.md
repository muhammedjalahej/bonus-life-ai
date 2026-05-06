# Bonus Life AI — Full Codebase Analysis Report

**Date:** 2026-05-02  
**Scope:** Read-only audit. No files were modified.  
**Analyst:** Claude Code (Sonnet 4.6)

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Folder Structure](#2-folder-structure)
3. [Database Schema](#3-database-schema)
4. [All API Routes](#4-all-api-routes)
5. [Authentication Flow](#5-authentication-flow)
6. [ML / Scoring Logic](#6-ml--scoring-logic)
7. [Admin Flow](#7-admin-flow)
8. [Security Vulnerabilities](#8-security-vulnerabilities)
9. [Performance Bottlenecks](#9-performance-bottlenecks)
10. [Stability Risks](#10-stability-risks)
11. [Test Coverage](#11-test-coverage)
12. [Priority Issues Summary](#12-priority-issues-summary)

---

## 1. Tech Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | 0.115.0 |
| ASGI server | Uvicorn | 0.32.0 |
| Production server | Gunicorn | >=23.0.0 |
| Database ORM | SQLAlchemy | >=2.0.0 |
| Database engine | SQLite (file: `app/data/morelife.db`) | — |
| Auth / JWT | python-jose (HS256) | >=3.3.0 |
| Password hashing | passlib bcrypt | >=1.7.4 |
| Schema validation | Pydantic | 2.9.2 |
| HTTP client | httpx | 0.27.2 |

### AI / ML
| Component | Technology |
|-----------|-----------|
| Primary LLM | Groq API — llama-3.3-70b-versatile |
| Fallback LLM | Google Gemini API — gemini-2.5-pro |
| Diabetes/Heart/CKD scoring | XGBoost + scikit-learn + SHAP |
| Brain MRI classification | PyTorch + torchvision CNN |
| TTS | ElevenLabs API → gTTS fallback |
| Web search (JARVIS) | DuckDuckGo (`ddgs` package) |
| Symptom checker | scikit-learn |
| Meal photo analysis | Gemini Vision API |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Voice input | Web Speech API (SpeechRecognition) |
| Voice output | ElevenLabs TTS via backend + Web SpeechSynthesis fallback |
| Icons | lucide-react |
| Charts | Recharts |

### External Services
| Service | Purpose |
|---------|---------|
| Groq | LLM inference |
| Google Gemini | LLM fallback + meal photo analysis |
| ElevenLabs | Text-to-speech |
| Stripe | Subscription billing |
| OpenStreetMap (Overpass API) | Nearby hospital search |
| Outlook SMTP | Password reset emails |
| YouTube Data API v3 | Workout video search |

---

## 2. Folder Structure

```
Bonus Life Ai/
├── app/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── auth.py                   JWT utilities, get_current_user, require_admin
│   │   │   ├── database.py               SQLAlchemy engine + session factory
│   │   │   ├── db_models.py              13 ORM table definitions
│   │   │   ├── models.py                 Pydantic request/response schemas
│   │   │   ├── main.py                   FastAPI app, CORS, router mounts
│   │   │   ├── email_service.py          SMTP email (Outlook)
│   │   │   ├── routes/                   27 route files
│   │   │   │   ├── auth.py               register, login, forgot/reset-password
│   │   │   │   ├── admin_routes.py       admin CRUD, stats, bulk actions
│   │   │   │   ├── me_routes.py          user profile, subscriptions, 2FA
│   │   │   │   ├── assessment.py         diabetes assessment
│   │   │   │   ├── heart.py              heart disease assessment
│   │   │   │   ├── ckd.py                chronic kidney disease assessment
│   │   │   │   ├── brain_mri.py          brain MRI tumor classification
│   │   │   │   ├── diet.py               AI diet plan generation
│   │   │   │   ├── symptom_checker.py    symptom prediction
│   │   │   │   ├── meal_photo.py         meal photo nutritional analysis
│   │   │   │   ├── chat.py               health chatbot
│   │   │   │   ├── voice_chat.py         voice-based chat
│   │   │   │   ├── voice_command.py      voice command routing
│   │   │   │   ├── tts.py                ElevenLabs / gTTS synthesis
│   │   │   │   ├── agent.py              JARVIS AI agent endpoint
│   │   │   │   ├── hospitals.py          nearby hospital search
│   │   │   │   ├── reports.py            ECDSA report signing/verification
│   │   │   │   ├── webauthn_routes.py    passkey auth
│   │   │   │   ├── face_routes.py        face enrollment/login
│   │   │   │   ├── local_ai_routes.py    local LLM endpoints
│   │   │   │   ├── workout_videos.py     YouTube workout videos
│   │   │   │   ├── stripe_webhook.py     Stripe webhook handler
│   │   │   │   └── ...                   (topics, language, health, user, shared)
│   │   │   └── services/                 7 service modules
│   │   │       ├── jarvis_agent.py       JARVIS: web search + tab open routing
│   │   │       ├── brain_mri_service.py  CNN inference wrapper
│   │   │       ├── diet.py               diet plan LLM service
│   │   │       ├── gemini_service.py     Gemini API wrapper
│   │   │       ├── meal_photo.py         meal analysis service
│   │   │       ├── symptom_checker.py    ML symptom model
│   │   │       ├── voice_chat.py         voice chat logic
│   │   │       ├── local_ai_module.py    local LLM integration
│   │   │       ├── notification_service.py  notification push
│   │   │       └── stripe_service.py     Stripe checkout/portal
│   │   ├── .env                          API keys (all secrets in plaintext)
│   │   ├── requirements.txt
│   │   └── run.py / start_server.sh
│   ├── frontend/
│   │   └── BonusLife-frontend/
│   │       ├── src/
│   │       │   ├── App.jsx               router + protected routes
│   │       │   ├── pages/                23 page components
│   │       │   ├── components/           VoiceAgent, ProtectedRoute, UXSettings...
│   │       │   ├── layout/               Header, Footer
│   │       │   └── config/constants.js   API base URL
│   │       ├── package.json
│   │       └── vite.config.js
│   └── data/
│       └── morelife.db                   SQLite database (committed to repo)
└── testing/                              (this folder)
```

---

## 3. Database Schema

13 tables in SQLite at `app/data/morelife.db`.

### users
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| email | String UNIQUE | Stored lowercase |
| hashed_password | String | bcrypt |
| full_name | String | nullable |
| avatar_url | String | nullable |
| role | String | `user` or `admin` |
| is_active | Boolean | default True |
| created_at / updated_at | DateTime | |
| password_reset_token | String | nullable |
| password_reset_expires | DateTime | nullable |
| dietary_preference | String | nullable |
| allergies | String | nullable |
| calorie_goal | Integer | nullable |
| admin_notes | Text | set by admin |
| totp_secret | String | nullable, stored in plaintext |
| totp_enabled | Boolean | default False |
| onboarding_completed | Boolean | default False |
| stripe_customer_id | String | nullable |
| stripe_subscription_id | String | nullable |
| subscription_tier | String | `free`, `pro_monthly`, `pro_yearly` |
| subscription_status | String | nullable |
| current_period_end | DateTime | nullable |
| preferred_language | String | nullable |

### assessments (diabetes)
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| user_id | FK → users | |
| assessment_id | String UNIQUE | UUID |
| risk_level | String | |
| probability | Float | |
| executive_summary | Text | AI-generated |
| payload | JSON | full input + output |
| created_at | DateTime | |
| share_token | String UNIQUE nullable | for public share links |
| admin_hidden | Boolean | soft-delete flag |

### heart_assessments, ckd_assessments, brain_mri_analyses
Same structure as `assessments` with assessment-specific fields.

### diet_plan_records
Stores goal, overview, full JSON payload per user.

### meal_logs
| Column | Type |
|--------|------|
| meal_name | String |
| carb_level | String (`low/medium/high`) |
| healthier_swaps | String |

### passkey_credentials
| Column | Type | Notes |
|--------|------|-------|
| credential_id | String UNIQUE | WebAuthn credential |
| public_key | String | base64url encoded |
| sign_count | Integer | replay attack counter |

### face_enrollments
| Column | Type | Notes |
|--------|------|-------|
| user_id | FK UNIQUE | one face per user |
| embedding | JSON | 128-float face vector |
| enabled | Boolean | |

**Note:** Face embeddings are stored as raw JSON floats with no encryption at rest.

### audit_logs
Records admin actions: admin_id, action, target_type, target_id, target_label, details.

### announcements
title, message, is_active, expires_at, created_by (FK).

### notifications
Per-user notifications: title, message, type (`info/warning/success/reminder`), is_read.

### site_settings
Key-value pairs for feature flags: `maintenance_mode`, `allow_signups`, etc.

---

## 4. All API Routes

Base prefix: `/api/v1`

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Backend health check |
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/maintenance-status` | Maintenance mode check |
| POST | `/auth/forgot-password` | Send temp password via email |
| POST | `/auth/reset-password` | Set new password via token |
| GET | `/nearby-hospitals` | Hospital search (lat/lon/radius) |
| GET | `/announcements/active` | Active announcements |
| GET | `/shared/assessment/{token}` | View shared diabetes assessment |
| GET | `/shared/heart/{token}` | View shared heart assessment |
| GET | `/shared/ckd/{token}` | View shared CKD assessment |
| GET | `/reports/public-key` | ECDSA public key (PEM) |
| POST | `/reports/verify` | Verify report signature |
| GET | `/tts/voices` | List ElevenLabs voices |
| GET | `/voices` | Same as above |

### Authenticated (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user profile |
| POST | `/chat` | Health chatbot |
| POST | `/voice-chat` | Voice-based chat |
| POST | `/voice-command` | Voice command routing |
| POST | `/tts` | Text-to-speech synthesis |
| POST | `/agent` | JARVIS AI agent |
| POST | `/diabetes-assessment` | Run diabetes risk model |
| POST | `/heart-assessment` | Run heart disease model |
| POST | `/ckd-assessment` | Run CKD model |
| POST | `/brain-mri-analysis` | Run brain MRI CNN |
| POST | `/diet-plan/generate` | Generate AI diet plan |
| POST | `/symptom-checker/predict` | Predict from symptoms |
| GET | `/health-topics` | Health education content |
| GET | `/workout-videos` | YouTube workout search |
| POST | `/meal-photo/analyze` | Analyze meal photo |
| GET/POST | `/detect-language` | Language detection |
| GET/PATCH | `/users/me` | View/update profile |
| POST | `/users/me/avatar` | Upload avatar |
| POST | `/users/me/change-password` | Change password |
| GET | `/users/me/assessments` | List diabetes assessments |
| GET | `/users/me/heart-assessments` | List heart assessments |
| GET | `/users/me/ckd-assessments` | List CKD assessments |
| GET | `/users/me/brain-mri-analyses` | List brain MRI analyses |
| GET | `/users/me/diet-plans` | List diet plans |
| POST | `/users/me/diet-plans` | Save diet plan |
| GET | `/users/me/export` | Export all user data |
| POST | `/users/me/assessments/{id}/share` | Generate share link |
| DELETE | `/users/me/assessments/{id}/share` | Revoke share link |
| DELETE | `/users/me/assessments/{id}` | Delete assessment |
| POST/DELETE | `/users/me/heart-assessments/{id}/share` | Share/revoke |
| DELETE | `/users/me/heart-assessments/{id}` | Delete |
| POST/DELETE | `/users/me/ckd-assessments/{id}/share` | Share/revoke |
| DELETE | `/users/me/ckd-assessments/{id}` | Delete |
| DELETE | `/users/me/brain-mri-analyses/{id}` | Delete |
| DELETE | `/users/me/diet-plans/{id}` | Delete |
| POST | `/users/me/2fa/setup` | Generate TOTP secret |
| POST | `/users/me/2fa/verify` | Enable 2FA |
| POST | `/users/me/2fa/disable` | Disable 2FA |
| GET | `/users/me/notifications` | List notifications |
| POST | `/users/me/notifications/reminder` | Create reminder |
| POST | `/users/me/notifications/{id}/read` | Mark read |
| POST | `/users/me/notifications/read-all` | Mark all read |
| DELETE | `/users/me/notifications/{id}` | Delete notification |
| GET | `/users/me/subscription` | Subscription status |
| POST | `/users/me/subscription/confirm` | Confirm Stripe checkout |
| POST | `/users/me/subscription/sync` | Sync from Stripe |
| POST | `/users/me/checkout` | Create checkout session |
| POST | `/users/me/customer-portal` | Create customer portal |
| POST | `/reports/sign-assessment/{id}` | Sign diabetes report |
| POST | `/reports/sign-heart-assessment/{id}` | Sign heart report |
| POST | `/reports/sign-mri-assessment/{id}` | Sign MRI report |
| POST | `/reports/sign-ckd-assessment/{id}` | Sign CKD report |
| POST | `/webauthn/*` | Passkey registration/auth |
| POST | `/face-auth/*` | Face enrollment/login |
| GET/POST | `/local-ai/*` | Local LLM endpoints |

### Admin only (JWT + role=admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List all users (max 500) |
| POST | `/admin/users` | Create user |
| PATCH | `/admin/users/{id}` | Update role/active |
| DELETE | `/admin/users/{id}` | Delete user |
| POST | `/admin/users/bulk` | Bulk activate/deactivate/delete |
| GET | `/admin/users/{id}/profile` | Full user profile |
| POST | `/admin/users/{id}/reset-password` | Reset user password |
| PATCH | `/admin/users/{id}/notes` | Set admin notes |
| POST | `/admin/users/{id}/email` | Send email to user |
| POST | `/admin/users/bulk-email` | Bulk email users |
| GET | `/admin/stats` | Platform stats |
| GET | `/admin/stats/charts` | Time-series charts |
| GET/DELETE | `/admin/assessments` | List/soft-delete diabetes |
| DELETE | `/admin/assessments/{id}` | Soft-delete one |
| GET/DELETE | `/admin/heart-assessments` | Same for heart |
| GET/DELETE | `/admin/ckd-assessments` | Same for CKD |
| GET/DELETE | `/admin/brain-mri-analyses` | Same for MRI |
| GET/DELETE | `/admin/diet-plans` | Same for diet |
| GET | `/admin/subscriptions` | Subscription list |
| GET | `/admin/subscriptions/stats` | Subscription counts |
| GET | `/admin/audit-log` | View audit logs (max 100) |
| POST | `/admin/audit-log/clear` | Clear all audit logs |
| GET/POST/PATCH/DELETE | `/admin/announcements` | CRUD announcements |
| GET/PATCH | `/admin/settings` | Site feature flags |
| GET | `/admin/system-health` | Health check with API status |
| POST | `/webhooks/stripe` | Stripe event handler |

**Total routes:** ~80+

---

## 5. Authentication Flow

### JWT Authentication
- **Algorithm:** HS256
- **Secret key:** Read from `JWT_SECRET` env var. **Default fallback if env var missing:** `"morelife-dev-secret-change-in-production"` (hardcoded in `auth.py:25`)
- **Token expiry:** 7 days (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7`)
- **No refresh tokens.** Once issued, a token cannot be revoked until it expires.
- **No token blacklist.** Deactivating a user (`is_active=False`) does block re-use via `get_current_user`, but only while the user stays deactivated. The token remains cryptographically valid.

### Role system
Two roles: `user` and `admin`. All admin endpoints use `require_admin` dependency which checks `user.role == "admin"`.

### Additional auth methods
- **TOTP 2FA** — setup/verify/disable via `users/me/2fa/*`. TOTP secret stored in plaintext in `users.totp_secret` column.
- **WebAuthn (passkeys)** — credential stored in `passkey_credentials` table.
- **Face login** — 128-float embedding stored as JSON in `face_enrollments` table, no encryption.

### Password reset flow
1. `POST /auth/forgot-password` — generates a random temp password, immediately replaces the user's current password, emails it via SMTP.
2. No time-limited token link flow — the current password is destroyed before the user even receives the email. If the email fails to deliver, the account is locked out.

### Registration
- Email lowercased on store.
- No email verification step.
- No password complexity requirements enforced beyond minimum length of 6 (only on reset endpoint).

---

## 6. ML / Scoring Logic

### Diabetes Assessment
- **Model:** XGBoost trained on Pima Indians Diabetes dataset.
- **Features:** glucose, blood_pressure, weight, height (→ BMI), age, pregnancies, skin_thickness, insulin, diabetes_pedigree_function.
- **Output:** probability (float) + risk_level + SHAP feature importance.
- **LLM:** Groq llama generates executive_summary in the user's language.

### Heart Disease Assessment
- **Model:** XGBoost on Cleveland Heart Disease dataset (13 features including age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal).
- **Output:** same pattern as diabetes.

### Chronic Kidney Disease (CKD)
- **Model:** XGBoost / scikit-learn on 24 clinical features.
- **Output:** `CKD` or `No CKD` + confidence.

### Brain MRI
- **Model:** PyTorch CNN (pre-trained architecture, fine-tuned on MRI dataset).
- **Classes:** no tumor, glioma, meningioma, pituitary.
- **Input:** uploaded image file.
- **Service:** `app/services/brain_mri_service.py` loads model at startup.

### Symptom Checker
- **Model:** scikit-learn classifier.
- **Service:** `app/services/symptom_checker.py`.

### General Chat / Diet / JARVIS
- Groq API (primary) with Gemini fallback.
- JARVIS has an explicit "don't search" path for non-real-time queries to reduce latency.

---

## 7. Admin Flow

Admin access requires `role == "admin"` in the JWT. The only way to become admin is:
1. Direct database edit (`UPDATE users SET role='admin' WHERE email=...`)
2. Another admin uses `PATCH /admin/users/{id}` to set `role=admin`
3. Admin creates a user with `POST /admin/users` with `role=admin`

**Audit logging:** Most admin write operations write to the `audit_logs` table. However, audit logs can be cleared by any admin via `POST /admin/audit-log/clear` with no secondary confirmation or ownership check.

**Admin notes:** Admins can attach private notes to user accounts via `PATCH /admin/users/{id}/notes`. Notes are stored in `users.admin_notes` (plaintext).

**Email capabilities:** Admins can send arbitrary emails to individual users or bulk to any/all users. There is no template restriction or approval step.

**Soft delete:** Assessment records are hidden via `admin_hidden=True` flag, not physically deleted. Data is retained.

---

## 8. Security Vulnerabilities

Severity ratings: CRITICAL / HIGH / MEDIUM / LOW

---

### [CRITICAL] Default JWT Secret In Production Code

**File:** `app/backend/app/auth.py:25`
```python
SECRET_KEY = os.getenv("JWT_SECRET", "morelife-dev-secret-change-in-production")
```
The current `.env` file does **not** set `JWT_SECRET`. This means the backend is running with a publicly known default secret. Any attacker can forge valid admin JWTs by signing with `"morelife-dev-secret-change-in-production"`.

**Fix:** Add `JWT_SECRET=<random 64-char hex>` to `.env`. Rotate immediately if deployed.

---

### [CRITICAL] CORS Wildcard + Credentials Misconfiguration

**File:** `app/backend/app/main.py`
```python
allow_origins=["*"]
allow_credentials=True
```
The combination of `allow_origins=["*"]` with `allow_credentials=True` is both a security misconfiguration and technically rejected by the browser Fetch spec (browsers will refuse to send credentials to a wildcard origin). If the app works, credentials are likely being sent without the `withCredentials` flag, meaning CORS is bypassed in a different way. The correct fix is to whitelist specific origins.

**Fix:**
```python
allow_origins=["http://localhost:5173", "https://your-production-domain.com"]
allow_credentials=True
```

---

### [CRITICAL] All API Keys and Secrets Committed in .env

**File:** `app/backend/.env`  
The following production secrets are stored in plaintext in a file that appears to be tracked by git:
- `GROQ_API_KEY` — active Groq LLM key
- `GEMINI_API_KEY` — active Google Gemini key
- `ELEVENLABS_API_KEY` — active ElevenLabs key
- `STRIPE_SECRET_KEY` (test mode) — Stripe billing key
- `SMTP_PASSWORD` — Outlook account password
- `YOUTUBE_API_KEY` — YouTube Data API key

If this repository is ever made public or the `.env` is accidentally shared, all these services are compromised.

**Fix:** Add `.env` to `.gitignore`. Rotate all keys immediately if repo history is public. Use environment variable injection (CI/CD secrets, Docker secrets, or a vault) in production.

---

### [HIGH] No Rate Limiting on Any Endpoint

There is no rate limiting middleware on any route. This exposes:
- `POST /auth/login` — brute force password attacks
- `POST /auth/forgot-password` — SMTP spam / account lockout abuse
- `POST /diabetes-assessment`, `/heart-assessment`, etc. — free LLM inference abuse
- `POST /tts` — free ElevenLabs quota drain
- `POST /agent` — free Groq API quota drain

**Fix:** Add `slowapi` or similar rate limiting middleware. At minimum, rate-limit `/auth/login` to 5 attempts per minute per IP.

---

### [HIGH] No Input Validation on Health Assessment Endpoints

Assessment endpoints accept numeric inputs but perform no range validation. For example, `DiabetesAssessmentRequest` accepts `glucose` as a float with no bounds check. A user can submit `glucose=-999` or `glucose=99999`. The XGBoost model will produce a result, but the executive summary from the LLM may be nonsensical or harmful.

**Fix:** Add Pydantic `Field(ge=0, le=<max>)` validators to all assessment request models.

---

### [HIGH] JWT Tokens Not Revocable

Token expiry is 7 days. There is no blacklist, no refresh token pattern, and no session store. If a user's account is compromised:
1. Admin can deactivate the account via `PATCH /admin/users/{id}`.
2. `get_current_user` will reject the deactivated user on the next request.
3. **However:** re-activating the account (e.g., the user contacts support) immediately re-validates the old token for its remaining lifetime.

Similarly, if a user changes their password, their old tokens remain valid for up to 7 days.

**Fix:** Store a `token_version` integer on the user. Include it in the JWT payload. Increment on password change or explicit logout. `get_current_user` rejects tokens with a stale version.

---

### [HIGH] Face Embeddings Stored Unencrypted

**Table:** `face_enrollments.embedding`  
128-float face vectors are stored as raw JSON with no encryption. Face biometric data is sensitive personal data under GDPR / health data regulations. If the database file is leaked, all enrolled face vectors are exposed — these cannot be rotated like passwords.

**Fix:** Encrypt the embedding column at rest, or store a salted hash representation that cannot be reversed to reconstruct the original biometric.

---

### [HIGH] Password Reset Destroys Current Password Before Delivery

**File:** `app/backend/app/routes/auth.py:139-146`  
The forgot-password flow generates a temp password, **immediately overwrites the current hashed password**, then attempts to send an email. If the email fails (SMTP error, wrong address, spam filter), the user cannot log in at all — their original password is gone and the temp password was never received.

**Fix:** Use a time-limited token (store `password_reset_token` + `password_reset_expires`). Don't change the password until the user actually uses the token to set a new one. The `password_reset_token` and `password_reset_expires` columns already exist in the DB — they are just not used by the current flow.

---

### [MEDIUM] SQLite Database Committed to Git

**File:** `app/data/morelife.db`  
The binary SQLite database file is tracked by git (`M app/data/morelife.db` in git status). This means:
1. Every database state is stored in git history — including deleted user records, old health data.
2. If the repo is pushed to a remote, all user data is publicly accessible.

**Fix:** Add `app/data/*.db` to `.gitignore`. Use PostgreSQL or MySQL for any non-local deployment.

---

### [MEDIUM] Audit Log Clearable by Any Admin

**Endpoint:** `POST /admin/audit-log/clear`  
Any admin can permanently delete all audit logs. This defeats the purpose of audit logging — a rogue admin can cover their tracks.

**Fix:** Remove this endpoint, or restrict it to a super-admin role, or implement append-only audit logging.

---

### [MEDIUM] No Email Verification on Registration

Users can register with any email address. No verification step confirms ownership. This enables:
- Registering with someone else's email
- Fake accounts at scale
- Password reset emails sent to wrong addresses

**Fix:** Send a verification email on registration. Block API access for unverified accounts.

---

### [MEDIUM] Admin Bulk Email Has No Template Restriction

`POST /admin/users/bulk-email` allows sending arbitrary HTML/text to all users with no template, approval step, or audit record of the body. A compromised admin account can send phishing emails to all users.

**Fix:** Log the full email body in `audit_logs`. Consider requiring a template or secondary admin approval for bulk sends.

---

### [MEDIUM] No Password Complexity Enforcement at Registration

`RegisterRequest` requires `email` and `password` but has no minimum length or complexity validator beyond Pydantic `str`. A user can register with password `"a"`.

**Fix:** Add `Field(min_length=8)` and optionally a complexity check to `RegisterRequest.password`.

---

### [LOW] TOTP Secret Stored in Plaintext

`users.totp_secret` is stored unencrypted. If the DB is leaked, an attacker can reconstruct any user's TOTP codes.

**Fix:** Encrypt TOTP secrets using a server-side encryption key (e.g., Fernet).

---

### [LOW] `/auth/forgot-password` Leaks Account Existence via Timing

The endpoint returns the same message for registered and unregistered emails (good). However, the bcrypt hash operation only runs for existing accounts, creating a measurable timing difference that can reveal whether an email is registered.

**Fix:** Always perform a constant-time operation regardless of whether the user exists (e.g., always call `hash_password` and discard the result for missing users).

---

### [LOW] Brain MRI Results Returned Without Medical Disclaimer

The `/brain-mri-analysis` endpoint returns tumor classification (glioma, meningioma, pituitary) without any medical disclaimer in the API response. If this data is displayed directly, users may interpret it as a clinical diagnosis.

---

## 9. Performance Bottlenecks

### SQLite for Concurrent Writes
SQLite uses file-level write locking. Under concurrent requests (multiple users submitting assessments simultaneously), writes will serialize and may queue up. This is acceptable for very low traffic but will fail under load. The database is also committed to git, making it unsuitable for production deployment.

**Impact:** Medium. Adequate for local development and demo, not for production.  
**Fix:** Migrate to PostgreSQL. Update `DATABASE_URL` in environment.

### No Pagination on Most List Endpoints
- `GET /admin/users` returns max 500 users in a single query.
- `GET /users/me/assessments` returns max 50 records.
- `GET /admin/audit-log` returns max 100 records.

As data grows, these queries will become slow. There is no cursor-based pagination.

**Fix:** Implement keyset or offset pagination with `limit`/`offset` or `cursor` parameters.

### ML Model Loading
Brain MRI CNN (PyTorch) is loaded at service import time. The model weights are loaded once, but inference is synchronous. For a high-traffic endpoint, this blocks the event loop thread.

**Fix:** Run ML inference in a thread pool (`asyncio.to_thread`) or a separate inference worker.

### LLM Calls Are Synchronous in Some Paths
Some LLM calls use `asyncio.to_thread` (correctly). Others call Groq/Gemini synchronously within async request handlers. A slow Groq response will hold a FastAPI worker thread.

**Fix:** Audit all LLM service calls and ensure they use `asyncio.to_thread` or native async clients.

### No Caching
Identical assessment inputs, health topics, or workout video queries always hit external APIs. There is no in-memory or Redis caching layer.

**Fix:** Cache LLM responses for read-heavy endpoints (health topics, workout videos) with a TTL.

### DuckDuckGo Search Timeout
JARVIS agent uses a 3-second timeout on DDG search. If DDG is slow, the agent waits the full 3 seconds before falling back. Under load, all JARVIS requests that trigger search will tie up threads.

---

## 10. Stability Risks

### Single-File SQLite Database
`app/data/morelife.db` is a single binary file. There is no automated backup, no WAL mode explicitly configured, and no replication. A single corrupted write can destroy all data.

**Fix:** Enable SQLite WAL mode (`PRAGMA journal_mode=WAL`). Set up daily backups. For production: migrate to PostgreSQL.

### External API Dependency Chain
A typical assessment request touches: SQLite → XGBoost → Groq API → response. If Groq is down, the executive summary fails. There is no graceful degradation (return model result without LLM summary).

**Fix:** Make LLM summary optional. Return assessment results immediately and fetch summary asynchronously if possible.

### ElevenLabs Fallback Chain
TTS: ElevenLabs → gTTS (Google). gTTS requires network access to Google servers. If both are down or rate-limited, TTS fails with a 503. The frontend should handle TTS failure gracefully without breaking the voice agent.

### `uvicorn --reload` in Production
`RELOAD=True` is set in `.env`. The `--reload` flag is for development only. In production it adds a file watcher process that doubles memory usage and can cause unexpected restarts on file changes.

**Fix:** Set `RELOAD=False` in production. Use gunicorn with multiple uvicorn workers instead.

### No Health Check for External Dependencies
`GET /admin/system-health` exists but is admin-only. There is no public or automated health check that verifies Groq, ElevenLabs, and SMTP are reachable. Failures are only discovered when a request fails.

---

## 11. Test Coverage

**Zero automated tests detected.**

There is no `tests/` directory, no `pytest.ini`, no `test_*.py` files, and no test framework in `requirements.txt`. The entire application — including auth, ML scoring, payment flows, and medical data handling — has no unit or integration test coverage.

**Risk:** Any code change can silently break medical scoring logic, payment processing, or authentication without detection.

**Recommended test priorities:**
1. Auth flow (register, login, JWT decode, admin role check)
2. Assessment scoring (diabetes, heart, CKD — verify known inputs produce expected risk levels)
3. Password reset flow (verify temp password replaces current, email failure handling)
4. Admin role enforcement (verify non-admin users cannot access admin endpoints)
5. Stripe webhook handler (verify idempotent subscription state changes)

---

## 12. Priority Issues Summary

| # | Severity | Issue | File / Location | Effort to Fix |
|---|----------|-------|-----------------|--------------|
| 1 | CRITICAL | Default JWT secret hardcoded — forged admin tokens possible | `auth.py:25` | 5 min — add to `.env` |
| 2 | CRITICAL | `.env` with live API keys tracked by git | `app/backend/.env` | 30 min — gitignore + key rotation |
| 3 | CRITICAL | CORS `allow_origins=["*"]` + `allow_credentials=True` | `main.py` | 10 min — whitelist origins |
| 4 | HIGH | No rate limiting — login brute force / API quota drain | All routes | 2 hrs — add slowapi |
| 5 | HIGH | Password reset destroys password before email delivery | `auth.py:139` | 2 hrs — use token-link flow |
| 6 | HIGH | JWT tokens not revocable — 7-day window after compromise | `auth.py:27` | 4 hrs — add token_version |
| 7 | HIGH | Face biometric embeddings stored unencrypted | `db_models.py` | 4 hrs — encrypt column |
| 8 | HIGH | No input validation on assessment numeric fields | `models.py` | 2 hrs — add Pydantic Field validators |
| 9 | MEDIUM | SQLite database committed to git | `app/data/morelife.db` | 15 min — gitignore; migrate DB for prod |
| 10 | MEDIUM | Audit log clearable by any admin | `admin_routes.py` | 30 min — remove endpoint |
| 11 | MEDIUM | No email verification on registration | `auth.py` | 4 hrs — add verification flow |
| 12 | MEDIUM | No password complexity on registration | `models.py` | 15 min — add Field(min_length=8) |
| 13 | MEDIUM | `uvicorn --reload` enabled in prod `.env` | `.env:RELOAD=True` | 5 min — set RELOAD=False |
| 14 | LOW | TOTP secret stored in plaintext | `db_models.py` | 2 hrs — encrypt with Fernet |
| 15 | LOW | Zero automated test coverage | — | Ongoing |

---

*Report generated by read-only static analysis. No files were modified.*
