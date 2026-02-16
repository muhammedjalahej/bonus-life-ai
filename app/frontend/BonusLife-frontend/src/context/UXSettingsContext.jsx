import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setHapticsEnabled } from '../utils/haptics';

const STORAGE_KEY = 'bonuslife_ux_settings';

const DEFAULTS = {
  theme: 'default',
  motion: 'auto',
  contrast: 'off',
  textSize: 'normal',
  haptics: 'off',
  sound: 'off',
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function applyToDocument(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme || 'default');
  root.setAttribute('data-motion', settings.motion || 'auto');
  root.setAttribute('data-contrast', settings.contrast || 'off');
  root.setAttribute('data-text', settings.textSize === 'lg' ? 'lg' : 'normal');
  setHapticsEnabled(settings.haptics === 'on');
}

const UXSettingsContext = createContext(null);

export function UXSettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(load);
  const [uxModalOpen, setUxModalOpen] = useState(false);

  useEffect(() => {
    applyToDocument(settings);
  }, [settings]);

  const setSetting = useCallback((key, value) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  const value = {
    theme: settings.theme,
    motion: settings.motion,
    contrast: settings.contrast,
    textSize: settings.textSize,
    haptics: settings.haptics,
    sound: settings.sound,
    setTheme: (v) => setSetting('theme', v),
    setMotion: (v) => setSetting('motion', v),
    setContrast: (v) => setSetting('contrast', v),
    setTextSize: (v) => setSetting('textSize', v),
    setHaptics: (v) => setSetting('haptics', v),
    setSound: (v) => setSetting('sound', v),
    uxModalOpen,
    setUxModalOpen,
  };

  return (
    <UXSettingsContext.Provider value={value}>
      {children}
    </UXSettingsContext.Provider>
  );
}

export function useUXSettings() {
  const ctx = useContext(UXSettingsContext);
  if (!ctx) throw new Error('useUXSettings must be used within UXSettingsProvider');
  return ctx;
}
