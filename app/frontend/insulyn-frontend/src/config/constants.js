// More Life AI - Central Configuration
// Authors: Muhammed Jalahej, Yazen Emino

// API Base URL - uses env variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Full URL for avatar image (handles relative paths from backend uploads). */
export function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  const base = API_BASE_URL.replace(/\/$/, '');
  return base + (avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl);
}

// Application info
export const APP_NAME = 'More Life AI';
export const APP_DESCRIPTION = 'Type 2 Diabetes Early Detection Platform';

// Route paths (single source of truth for navigation)
export const ROUTES = {
  HOME: '/',
  TEST: '/test',
  CHAT: '/chat',
  VOICE_CHAT: '/voice-chat',
  DIET_PLAN: '/diet-plan',
  EMERGENCY: '/emergency',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
};
