import { API_BASE_URL } from '../config/constants';

const AUTH_TOKEN_KEY = 'morelife_token';

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Response from ${endpoint}:`, data);
    return data;
  } catch (error) {
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
  getMyAssessments,
  getMyDietPlans,
  updateProfile,
  changePassword,
  adminGetUsers,
  adminGetStats,
  adminGetAssessments,
};

export default apiService;