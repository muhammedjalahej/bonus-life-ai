/**
 * Bonus Life AI - Mobile Frontend Config
 * Physical device (iPhone): use your PC's IP below (same Wi‑Fi). Run ipconfig to get it.
 * Android emulator: use 10.0.2.2. iOS simulator: use localhost.
 */
const DEV_API_HOST = '192.168.1.58';
const urlFromEnv = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL = urlFromEnv || `http://${DEV_API_HOST}:8000`;
export const APP_NAME = 'Bonus Life AI';

// Mobile theme – restrained, professional
export const COLORS = {
  background: '#0f1419',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#10b981',
  text: '#e6edf3',
  textMuted: '#7d8590',
  textDim: '#484f58',
};
