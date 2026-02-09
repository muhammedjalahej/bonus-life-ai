import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredToken, setStoredToken } from '../services/api';
import apiService, { onMaintenanceMode, checkMaintenanceStatus } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowSignups, setAllowSignups] = useState(true);

  // Register a callback so the API layer can tell us about 503 responses
  useEffect(() => {
    onMaintenanceMode(() => setMaintenanceMode(true));
  }, []);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();

    // Always check maintenance and signup status (even without a token)
    try {
      const status = await checkMaintenanceStatus();
      setMaintenanceMode(status.maintenance);
      setAllowSignups(status.allow_signups);
    } catch {
      // ignore - can't reach backend
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiService.fetchMe();
      setUser(me);
    } catch (err) {
      // If 503, don't clear token — it's just maintenance
      if (err.message && err.message.includes('503')) {
        setMaintenanceMode(true);
      } else {
        setStoredToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const data = await apiService.login(email, password);
    setStoredToken(data.access_token);
    setUser(data.user);
    setMaintenanceMode(false);
    return data;
  }, []);

  const registerUser = useCallback(async (email, password, full_name = '') => {
    const data = await apiService.register(email, password, full_name);
    setStoredToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (getStoredToken()) await loadUser();
  }, [loadUser]);

  const setUserAvatar = useCallback((avatarUrl) => {
    setUser((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
  }, []);

  const clearMaintenance = useCallback(() => setMaintenanceMode(false), []);

  const value = {
    user,
    loading,
    login,
    register: registerUser,
    logout,
    refreshUser,
    setUserAvatar,
    isAdmin: user?.role === 'admin',
    maintenanceMode,
    clearMaintenance,
    allowSignups,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
