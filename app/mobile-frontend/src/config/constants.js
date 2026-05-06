/**
 * Bonus Life AI - Mobile Frontend Config
 * Physical device (iPhone/Android): use your PC's LAN IP below (same Wi‑Fi). Run ipconfig to get it.
 * Android emulator: use 10.0.2.2. iOS simulator: use localhost.
 * Web (browser on same PC): automatically uses localhost so CORS is not an issue.
 */
import { Platform } from 'react-native';

const DEV_API_HOST = '192.168.1.58'; // LAN IP for physical devices
const DEV_API_PORT = 8001;
const urlFromEnv = process.env.EXPO_PUBLIC_API_URL;

// Web runs in the browser on the same PC — use localhost. Native uses the LAN IP.
const autoHost = Platform.OS === 'web' ? 'localhost' : DEV_API_HOST;

export const API_BASE_URL = urlFromEnv || `http://${autoHost}:${DEV_API_PORT}`;
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
