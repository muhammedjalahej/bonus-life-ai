# Passkey & Face Login

## Backend

- **Passkey (WebAuthn):** Uses `webauthn` (PyPI). Tables: `passkey_credentials`.
- **Face login:** Tables: `face_enrollments`. Embeddings are stored as JSON; no extra Python deps.

### Optional env (production)

In `.env` you can set:

- `WEBAUTHN_RP_ID` – Relying Party ID (default: `localhost`). In production use your domain, e.g. `bonuslife.ai`.
- `WEBAUTHN_ORIGIN` – Full origin of the frontend (default: `http://localhost:5173`). In production e.g. `https://app.bonuslife.ai`.
- `WEBAUTHN_RP_NAME` – Display name (default: `Bonus Life AI`).

For local dev, defaults are fine.

### DB

New tables `passkey_credentials` and `face_enrollments` are created automatically on startup via `Base.metadata.create_all`. Restart the backend once after pulling to ensure they exist.

## Frontend

- **Passkey:** Login page shows “Continue with passkey” when the browser supports it. Users enable a passkey in **Dashboard → Profile → Login options**.
- **Face:** “Sign in with your face” and “Set up face login” require the **face-api.js** models in `public/models/`. See `app/frontend/BonusLife-frontend/public/models/README.md` for how to add them.
