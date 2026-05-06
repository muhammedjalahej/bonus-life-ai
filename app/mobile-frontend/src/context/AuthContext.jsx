import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const token = await api.getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await api.fetchMe();
      setUser(me);
      setIsGuest(false);
    } catch {
      await api.setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    if (data.access_token) {
      await api.setStoredToken(data.access_token);
      setUser(data.user || (await api.fetchMe()));
      return data.user;
    }
    throw new Error(data.detail || 'Login failed');
  }, []);

  const register = useCallback(async (email, password, full_name = '') => {
    const data = await api.register(email, password, full_name);
    if (data.access_token) {
      await api.setStoredToken(data.access_token);
      setUser(data.user || (await api.fetchMe()));
      return data.user;
    }
    throw new Error(data.detail || 'Registration failed');
  }, []);

  const logout = useCallback(async () => {
    await api.setStoredToken(null);
    setUser(null);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setLoading(false);
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    continueAsGuest,
    refreshUser: loadUser,
    isAuthenticated: !!user,
    isGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
