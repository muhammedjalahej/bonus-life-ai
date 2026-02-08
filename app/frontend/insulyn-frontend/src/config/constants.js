// More Life AI - Central Configuration
// Authors: Muhammed Jalahej, Yazen Emino

// API Base URL - uses env variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
};
