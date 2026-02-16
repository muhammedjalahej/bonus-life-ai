import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { t as translate } from '../i18n/translations';

const LANGUAGE_KEY = 'app_language';

let _asyncStorage = null;
function getAsyncStorage() {
  if (_asyncStorage != null) return _asyncStorage;
  try {
    _asyncStorage = require('@react-native-async-storage/async-storage').default;
    return _asyncStorage;
  } catch {
    return null;
  }
}

async function getStoredLanguage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(LANGUAGE_KEY) || 'english';
    }
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) return (await AsyncStorage.getItem(LANGUAGE_KEY)) || 'english';
  } catch {}
  return 'english';
}

async function setStoredLanguage(lang) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, lang);
      return;
    }
    const AsyncStorage = getAsyncStorage();
    if (AsyncStorage) await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('english');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getStoredLanguage().then((lang) => {
      setLanguageState(lang === 'turkish' ? 'turkish' : 'english');
      setReady(true);
    });
  }, []);

  const setLanguage = useCallback((lang) => {
    const next = lang === 'turkish' ? 'turkish' : 'english';
    setLanguageState(next);
    setStoredLanguage(next);
  }, []);

  const t = useCallback(
    (key, vars = {}) => translate(language, key, vars),
    [language]
  );

  const value = {
    language,
    setLanguage,
    t,
    isTurkish: language === 'turkish',
    ready,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
