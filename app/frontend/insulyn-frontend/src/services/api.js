import { API_BASE_URL } from '../config/constants';

const AUTH_TOKEN_KEY = 'morelife_token';

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Maintenance-mode callback — AuthContext registers a listener
let _maintenanceCb = null;
export function onMaintenanceMode(cb) {
  _maintenanceCb = cb;
}

const REQUEST_TIMEOUT_MS = 15000;

async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
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
      // Maintenance mode — notify the app
      if (_maintenanceCb) _maintenanceCb();
      throw new Error('HTTP 503: Platform is under maintenance');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Response from ${endpoint}:`, data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Is the backend running at ' + API_BASE_URL + '?');
      console.error(`API request failed for ${endpoint}:`, timeoutError);
      throw timeoutError;
    }
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// CORRECTED ENDPOINTS - Match your backend
export async function predictDiabetesRisk(formData) {
  return apiRequest('/api/v1/diabetes-assessment', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

export async function chatWithAI(message, language = 'english', conversation_id = null) {
  return apiRequest('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ 
      message, 
      language,
      conversation_id,
      require_llm: true 
    }),
  });
}

export async function voiceChat(text, language = 'english') {
  return apiRequest('/api/v1/voice-chat/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text: text,
      language: language,
      user_id: 'voice-user'
    }),
  });
}

export async function generateDietPlan(userData, language = 'english') {
  return apiRequest('/api/v1/diet-plan/generate', {
    method: 'POST',
    body: JSON.stringify({ ...userData, language }),
  });
}

export async function assessSymptoms(symptoms, language = 'english') {
  return apiRequest('/api/v1/emergency-assessment', {
    method: 'POST',
    body: JSON.stringify({ symptoms, language }),
  });
}

export async function getChatTopics() {
  return apiRequest('/api/v1/health-topics');
}

export async function clearChatHistory() {
  return apiRequest('/api/v1/chat/clear', {
    method: 'POST',
  });
}

export async function healthCheck() {
  return apiRequest('/health');
}

/** Check maintenance and signup status (public endpoint, no auth). Returns { maintenance, allow_signups }. */
export async function checkMaintenanceStatus() {
  try {
    const url = `${API_BASE_URL}/api/v1/auth/maintenance-status`;
    const response = await fetch(url);
    if (!response.ok) return { maintenance: false, allow_signups: true };
    const data = await response.json();
    return {
      maintenance: !!data.maintenance,
      allow_signups: data.allow_signups !== false && data.allow_signups !== 'false',
    };
  } catch {
    return { maintenance: false, allow_signups: true };
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

export async function forgotPassword(email) {
  return apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function resetPassword(token, new_password) {
  return apiRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}

// User-scoped
export async function getMyAssessments(limit = 50) {
  return apiRequest(`/api/v1/users/me/assessments?limit=${limit}`);
}

export async function getMyDietPlans(limit = 50) {
  return apiRequest(`/api/v1/users/me/diet-plans?limit=${limit}`);
}

export async function updateProfile(data) {
  return apiRequest('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Upload profile picture from file. Returns { avatar_url }. Backend also updates user.avatar_url. */
export async function uploadAvatar(file) {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${API_BASE_URL}/api/v1/users/me/avatar`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

export async function changePassword(current_password, new_password) {
  return apiRequest('/api/v1/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
}

// Admin
export async function adminGetUsers(skip = 0, limit = 100) {
  return apiRequest(`/api/v1/admin/users?skip=${skip}&limit=${limit}`);
}

export async function adminGetStats() {
  return apiRequest('/api/v1/admin/stats');
}

export async function adminGetAssessments(skip = 0, limit = 100) {
  return apiRequest(`/api/v1/admin/assessments?skip=${skip}&limit=${limit}`);
}

export async function adminDeleteUser(userId) {
  return apiRequest(`/api/v1/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function adminUpdateUser(userId, data) {
  return apiRequest(`/api/v1/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminCreateUser(data) {
  return apiRequest('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminBulkAction(user_ids, action) {
  return apiRequest('/api/v1/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify({ user_ids, action }),
  });
}

export async function adminGetChartData(days = 30) {
  return apiRequest(`/api/v1/admin/stats/charts?days=${days}`);
}

export async function adminGetAuditLog(skip = 0, limit = 100) {
  return apiRequest(`/api/v1/admin/audit-log?skip=${skip}&limit=${limit}`);
}

export async function adminClearAuditLog() {
  return apiRequest('/api/v1/admin/audit-log/clear', { method: 'POST' });
}

export async function adminGetAnnouncements() {
  return apiRequest('/api/v1/admin/announcements');
}

export async function adminCreateAnnouncement(data) {
  return apiRequest('/api/v1/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateAnnouncement(id, data) {
  return apiRequest(`/api/v1/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteAnnouncement(id) {
  return apiRequest(`/api/v1/admin/announcements/${id}`, {
    method: 'DELETE',
  });
}

export async function adminGetSettings() {
  return apiRequest('/api/v1/admin/settings');
}

export async function adminUpdateSetting(key, value) {
  return apiRequest('/api/v1/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify({ key, value }),
  });
}

export async function adminGetSystemHealth() {
  return apiRequest('/api/v1/admin/system-health');
}

export async function getActiveAnnouncements() {
  return apiRequest('/api/v1/announcements/active');
}

// ---- Export my data (feature f11) ----
export async function exportMyData() {
  return apiRequest('/api/v1/users/me/export');
}

// ---- Share assessment with doctor (feature f16) ----
export async function shareAssessment(assessmentId) {
  return apiRequest(`/api/v1/users/me/assessments/${assessmentId}/share`, { method: 'POST' });
}

export async function revokeShare(assessmentId) {
  return apiRequest(`/api/v1/users/me/assessments/${assessmentId}/share`, { method: 'DELETE' });
}

export async function deleteAssessment(assessmentId) {
  return apiRequest(`/api/v1/users/me/assessments/${assessmentId}`, { method: 'DELETE' });
}

export async function deleteDietPlan(dietPlanId) {
  return apiRequest(`/api/v1/users/me/diet-plans/${dietPlanId}`, { method: 'DELETE' });
}

export async function getSharedAssessment(token) {
  return apiRequest(`/api/v1/shared/assessment/${token}`);
}

// ---- 2FA (feature f15) ----
export async function setup2FA() {
  return apiRequest('/api/v1/users/me/2fa/setup', { method: 'POST' });
}

export async function verify2FA(code) {
  return apiRequest(`/api/v1/users/me/2fa/verify?code=${encodeURIComponent(code)}`, { method: 'POST' });
}

export async function disable2FA() {
  return apiRequest('/api/v1/users/me/2fa/disable', { method: 'POST' });
}

// ---- Notifications (feature f17) ----
export async function getNotifications(limit = 50) {
  return apiRequest(`/api/v1/users/me/notifications?limit=${limit}`);
}

export async function markNotificationRead(notifId) {
  return apiRequest(`/api/v1/users/me/notifications/${notifId}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return apiRequest('/api/v1/users/me/notifications/read-all', { method: 'POST' });
}

// ---- Admin: user notes (feature f12) ----
export async function adminUpdateUserNotes(userId, admin_notes) {
  return apiRequest(`/api/v1/admin/users/${userId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ admin_notes }),
  });
}

// ---- Admin: send email (feature f13) ----
export async function adminSendEmail(userId, subject, body) {
  return apiRequest(`/api/v1/admin/users/${userId}/email`, {
    method: 'POST',
    body: JSON.stringify({ subject, body }),
  });
}

// ---- Admin: bulk email (feature f14) ----
export async function adminBulkEmail(subject, body, user_ids = null, role_filter = null) {
  return apiRequest('/api/v1/admin/users/bulk-email', {
    method: 'POST',
    body: JSON.stringify({ subject, body, user_ids, role_filter }),
  });
}

const apiService = {
  predictDiabetesRisk,
  chatWithAI,
  voiceChat,
  generateDietPlan,
  assessSymptoms,
  getChatTopics,
  clearChatHistory,
  healthCheck,
  login,
  register,
  fetchMe,
  forgotPassword,
  resetPassword,
  getMyAssessments,
  getMyDietPlans,
  updateProfile,
  uploadAvatar,
  changePassword,
  adminGetUsers,
  adminGetStats,
  adminGetAssessments,
  adminDeleteUser,
  adminUpdateUser,
  adminCreateUser,
  adminBulkAction,
  adminGetChartData,
  adminGetAuditLog,
  adminClearAuditLog,
  adminGetAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  adminGetSettings,
  adminUpdateSetting,
  adminGetSystemHealth,
  getActiveAnnouncements,
  checkMaintenanceStatus,
  exportMyData,
  shareAssessment,
  revokeShare,
  deleteAssessment,
  deleteDietPlan,
  getSharedAssessment,
  setup2FA,
  verify2FA,
  disable2FA,
  adminUpdateUserNotes,
  adminSendEmail,
  adminBulkEmail,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

export default apiService;