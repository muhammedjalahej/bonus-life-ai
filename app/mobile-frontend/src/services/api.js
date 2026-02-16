/**
 * API service - same endpoints as web frontend, same backend.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/constants';

const AUTH_TOKEN_KEY = 'morelife_token';

// SecureStore is not supported on web; use localStorage so auth (and saved assessments) work in browser.
export async function getStoredToken() {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token) {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch {}
    return;
  }
  try {
    if (token) await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {}
}

const REQUEST_TIMEOUT_MS = 15000;

async function apiRequest(endpoint, options = {}) {
  const token = await getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (response.status === 503) {
      throw new Error('Platform is under maintenance');
    }

    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const json = JSON.parse(errorText);
        if (json.detail != null) {
          detail = Array.isArray(json.detail) ? json.detail.join(' ') : String(json.detail);
        }
      } catch (_) {}
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Is the backend running at ' + API_BASE_URL + '?');
    }
    const raw = error.message || 'Network request failed';
    const isNetwork = /failed to fetch|network error|load failed|connection refused/i.test(raw);
    const msg = isNetwork
      ? 'Cannot reach the server. Make sure the backend is running at ' + API_BASE_URL
      : raw;
    throw new Error(msg);
  }
}

// Auth
export async function login(email, password) {
  return apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, password, full_name = '') {
  return apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function fetchMe() {
  return apiRequest('/api/v1/auth/me');
}

export async function updateProfile(patch) {
  return apiRequest('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// User data
export async function getMyAssessments(limit = 50) {
  return apiRequest(`/api/v1/users/me/assessments?limit=${limit}`);
}

export async function getMyDietPlans(limit = 50) {
  return apiRequest(`/api/v1/users/me/diet-plans?limit=${limit}`);
}

export async function healthCheck() {
  return apiRequest('/health');
}

// Chat
export async function chat(message, language = 'english', user_id = 'default', user_context = null) {
  return apiRequest('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ message, language, user_id, user_context }),
  });
}

// Diabetes assessment
export async function runDiabetesAssessment(body) {
  return apiRequest('/api/v1/diabetes-assessment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Diet plan
export async function generateDietPlan(body) {
  return apiRequest('/api/v1/diet-plan/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Save current plan to user's account. Requires auth. */
export async function saveDietPlan(plan, goal = '') {
  return apiRequest('/api/v1/users/me/diet-plans', {
    method: 'POST',
    body: JSON.stringify({
      goal,
      overview: plan?.overview ?? '',
      payload: plan ?? {},
    }),
  });
}

/** Delete a saved diet plan. Requires auth. */
export async function deleteDietPlan(dietPlanId) {
  return apiRequest(`/api/v1/users/me/diet-plans/${dietPlanId}`, { method: 'DELETE' });
}

// Emergency assessment
export async function runEmergencyAssessment(body) {
  return apiRequest('/api/v1/emergency-assessment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Forgot password
export async function forgotPassword(email) {
  return apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

// Change password (logged in)
export async function changePassword(currentPassword, newPassword) {
  return apiRequest('/api/v1/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// Face login
export async function faceStatus() {
  return apiRequest('/api/v1/face-auth/status');
}

export async function faceToggleEnabled(enabled) {
  return apiRequest('/api/v1/face-auth/settings', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function faceEnroll(embedding) {
  return apiRequest('/api/v1/face-auth/enroll', {
    method: 'POST',
    body: JSON.stringify({ embedding }),
  });
}

export async function faceRemoveEnrollment() {
  return apiRequest('/api/v1/face-auth/enroll', { method: 'DELETE' });
}

// Nearby hospitals (lat, lon in Turkey)
export async function getNearbyHospitals(lat, lon, radius_km = 50, limit = 25) {
  return apiRequest(`/api/v1/nearby-hospitals?lat=${lat}&lon=${lon}&radius_km=${radius_km}&limit=${limit}`);
}

// Workout videos by goal
export async function getWorkoutVideos(goal = 'beginner', refreshKey = null) {
  let url = `/api/v1/workout-videos?goal=${encodeURIComponent(goal)}`;
  if (refreshKey) url += `&refresh_key=${encodeURIComponent(refreshKey)}`;
  return apiRequest(url);
}

// Meal photo analyze (image_base64: string, save_to_log: boolean)
export async function analyzeMealPhoto(imageBase64, saveToLog = false) {
  return apiRequest('/api/v1/meal-photo/analyze', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64, save_to_log: saveToLog }),
  });
}

// Sign assessment for signed PDF (returns report_id, payload_hash, signature_b64, etc.)
export async function signAssessmentReport(assessmentId) {
  const id = typeof assessmentId === 'number' ? assessmentId : parseInt(String(assessmentId), 10);
  if (!Number.isFinite(id)) throw new Error('Invalid assessment ID');
  return apiRequest(`/api/v1/reports/sign-assessment/${id}`, { method: 'POST' });
}

// Verify signed assessment report (QR payload)
export async function verifyReportSignature(payload_hash, signature_b64) {
  return apiRequest('/api/v1/reports/verify', {
    method: 'POST',
    body: JSON.stringify({ payload_hash, signature_b64 }),
  });
}
