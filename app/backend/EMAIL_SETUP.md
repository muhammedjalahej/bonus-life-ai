# Forgot-password email setup

To receive password reset emails (e.g. to your Hotmail or Gmail), add your SMTP details to **`.env`** in this folder (`app/backend`).

---

## Option 1: Gmail

1. **Turn on 2-Step Verification** (if not already):
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Under "How you sign in to Google", turn on **2-Step Verification**.

2. **Create an App Password**:
   - Go to [App passwords](https://myaccount.google.com/apppasswords)
   - Select app: **Mail**, device: **Other** (e.g. "More Life AI")
   - Click **Generate** and copy the 16-character password.

3. **Edit `app/backend/.env`** and set:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   FROM_EMAIL=your.email@gmail.com
   FRONTEND_URL=http://localhost:5173
   ```
   Replace `your.email@gmail.com` with your Gmail and `xxxx xxxx xxxx xxxx` with the App Password (no spaces is fine).

4. **Restart the backend** (stop and run `run_backend.bat` or uvicorn again). Then use "Forgot password" in the app; the email should arrive in your Gmail inbox.

---

## Option 2: Hotmail / Outlook.com

1. **Use your Microsoft account email** (e.g. `you@hotmail.com` or `you@outlook.com`).
   - If you have 2FA, you may need to use an [App password](https://account.microsoft.com/security) (create under Security > Advanced security options > App passwords).

2. **Edit `app/backend/.env`** and set:
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=you@hotmail.com
   SMTP_PASSWORD=your_password_or_app_password
   FROM_EMAIL=you@hotmail.com
   FRONTEND_URL=http://localhost:5173
   ```
   Replace with your real Hotmail/Outlook address and password (or app password if you use 2FA).

3. **Restart the backend.** Then try "Forgot password" again; the reset email should go to your Hotmail/Outlook inbox.

---

## Check it works

- After saving `.env` and restarting the backend, go to the app → **Forgot password** → enter the **same email** you put in `SMTP_USER`.
- You should get the reset email within a minute. If not, check **Spam/Junk** and the backend terminal for error messages.
