import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredToken, setStoredToken } from '../services/api';
import apiService from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiService.fetchMe();
      setUser(me);
    } catch {
      setStoredToken(null);
      setUser(null);
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

  const value = {
    user,
    loading,
    login,
    register: registerUser,
    logout,
    refreshUser,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
