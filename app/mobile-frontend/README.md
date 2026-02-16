# Bonus Life AI – Mobile Frontend

React Native (Expo) app. Uses the **same backend** as the web app.

---

## How to access the mobile version

### 1. Start the backend (required)

From the project root:

```bash
cd app/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Leave this running. The mobile app talks to this API.

### 2. Set API URL for the mobile app

- Copy `env.example` to `.env` in this folder (`app/mobile-frontend`).
- In `.env` set:
  - **Android emulator:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`
  - **iOS simulator:** `EXPO_PUBLIC_API_URL=http://localhost:8000`
  - **Physical phone (same Wi‑Fi as your PC):** `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:8000`  
    (Replace `YOUR_PC_IP` with your computer’s IP, e.g. `192.168.1.5`. Find it: `ipconfig` on Windows, `ifconfig` on Mac/Linux.)

### 3. Install dependencies and start the app

In this folder (`app/mobile-frontend`):

```bash
npm install
npm start
```

### 4. Open the app on a device or simulator

- **On your phone (easiest):**
  1. Install **Expo Go** from the App Store (iOS) or Play Store (Android).
  2. When `npm start` is running, a QR code appears in the terminal.
  3. **Android:** Open Expo Go and tap “Scan QR code”; scan the QR code.
  4. **iOS:** Open the Camera app and scan the QR code; tap the banner to open in Expo Go.
  5. The app loads. Make sure your phone is on the **same Wi‑Fi** as your PC and that `.env` uses your PC’s IP (see step 2).

### If you see "Network request failed" on a physical device

1. **Restart Expo with a clean cache** so the app picks up `.env`:
   ```bash
   npx expo start --clear --port 8083
   ```
   Then reload the app in Expo Go (shake device → Reload).

2. **Check from your phone’s browser:** Open `http://YOUR_PC_IP:8000/api/v1/health` (e.g. `http://192.168.1.58:8000/api/v1/health`). If this does **not** load, the problem is network or firewall (same Wi‑Fi, or allow port 8000 in Windows Firewall).

3. **Android only:** Expo Go may block plain HTTP (cleartext). This project enables cleartext for **development builds**. If it still fails in Expo Go, run a one-time dev build and use that to connect to your backend:
   ```bash
   npx expo run:android
   ```
   (Requires Android Studio / Android SDK.) The built app will allow HTTP to your PC’s IP.

- **On Android emulator:**  
  With the dev server running, press **`a`** in the terminal. The app opens in the emulator.

- **On iOS simulator (Mac only):**  
  With the dev server running, press **`i`** in the terminal. The app opens in the simulator.

---

## Project structure

| Folder / file      | Purpose                                  |
|--------------------|------------------------------------------|
| `app/backend`      | FastAPI API (shared by web and mobile)   |
| `app/frontend/BonusLife-frontend` | Web app (React + Vite)          |
| `app/mobile-frontend` (this folder) | Mobile app (Expo + React Native) |

## Features

- Login / Register (same API as web)
- Home and Dashboard
- My assessments list (from backend)
- Token stored in secure storage (Expo SecureStore)

## Adding more screens

Add screens under `src/screens/` and register them in `App.js`. Use `src/services/api.js` for API calls (same endpoints as the web app).
