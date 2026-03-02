import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';

const TIP_STORAGE_KEY = 'bonuslife_local_ai_tip';
const SCENARIO_HISTORY_KEY = 'bonuslife_local_ai_scenario_history';
const SCENARIO_HISTORY_MAX = 10;

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function loadStoredTip() {
  try {
    const raw = await AsyncStorage.getItem(TIP_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== getTodayDate()) return null;
    return data.tip || null;
  } catch {
    return null;
  }
}

async function saveStoredTip(date, tip) {
  try {
    await AsyncStorage.setItem(TIP_STORAGE_KEY, JSON.stringify({ date, tip }));
  } catch (_) {}
}

async function loadScenarioHistory() {
  try {
    const raw = await AsyncStorage.getItem(SCENARIO_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, SCENARIO_HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

async function saveScenarioHistory(list) {
  try {
    await AsyncStorage.setItem(SCENARIO_HISTORY_KEY, JSON.stringify(list.slice(0, SCENARIO_HISTORY_MAX)));
  } catch (_) {}
}

function stripDisclaimer(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  const disclaimerStart = out.search(/\bDisclaimer\s*:/i);
  if (disclaimerStart !== -1) out = out.slice(0, disclaimerStart);
  out = out.replace(/\n*This is not medical advice\.?\s*$/i, '').trim();
  out = out.replace(/\n*Consult with your healthcare provider[^.]*\.?\s*$/i, '').trim();
  return out.trim();
}

export default function LocalAIFeaturesScreen() {
  const { t, language } = useLanguage();
  const lang = language === 'turkish' ? 'turkish' : 'english';

  const [tip, setTip] = useState('');
  const [tipLoading, setTipLoading] = useState(false);

  const [scenario, setScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioHistory, setScenarioHistory] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.getMyAssessments(1);
        if (Array.isArray(list) && list.length > 0) setLatestAssessment(list[0]);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await loadStoredTip();
      if (stored) setTip(stored);
      else setTip('');
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const history = await loadScenarioHistory();
      setScenarioHistory(history);
    })();
  }, []);

  const onGetTip = async () => {
    const stored = await loadStoredTip();
    if (stored) {
      setTip(stored);
      return;
    }
    setTipLoading(true);
    setTip('');
    try {
      const res = await api.localAIGetHealthTip(lang);
      const text = res.tip || res.detail || '';
      setTip(text);
      await saveStoredTip(getTodayDate(), text);
    } catch (e) {
      setTip(t('localAI.error') + ': ' + (e.message || ''));
    } finally {
      setTipLoading(false);
    }
  };

  const onGetNewTip = async () => {
    setTipLoading(true);
    setTip('');
    try {
      const res = await api.localAIGetHealthTip(lang);
      const text = res.tip || res.detail || '';
      setTip(text);
      await saveStoredTip(getTodayDate(), text);
    } catch (e) {
      setTip(t('localAI.error') + ': ' + (e.message || ''));
    } finally {
      setTipLoading(false);
    }
  };

  const onScenario = async () => {
    if (!scenario.trim()) return;
    const question = scenario.trim();
    setScenarioLoading(true);
    setScenarioResult('');
    try {
      const res = await api.localAIAnswerScenario(question, latestAssessment || undefined, lang);
      const answer = res.answer || res.detail || '';
      setScenarioResult(answer);
      const next = [{ scenario: question, answer }, ...scenarioHistory];
      setScenarioHistory(next);
      await saveScenarioHistory(next);
    } catch (e) {
      setScenarioResult(t('localAI.error') + ': ' + (e.message || ''));
    } finally {
      setScenarioLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('localAI.title')}</Text>
        <Text style={styles.subtitle}>{t('localAI.subtitle')}</Text>

        {/* Health tip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('localAI.tipTitle')}</Text>
          <TouchableOpacity
            style={[styles.btn, tipLoading && styles.btnDisabled]}
            onPress={tip ? onGetNewTip : onGetTip}
            disabled={tipLoading}
          >
            {tipLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>{tip ? t('localAI.getNewTip') : t('localAI.getTip')}</Text>
            )}
          </TouchableOpacity>
          {tip ? <Text style={styles.result}>{tip}</Text> : null}
        </View>

        {/* Scenario */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('localAI.scenarioTitle')}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder={t('localAI.scenarioPlaceholder')}
            placeholderTextColor="#64748b"
            value={scenario}
            onChangeText={(text) => {
              setScenario(text);
              setScenarioResult('');
            }}
            multiline
            numberOfLines={3}
            editable={!scenarioLoading}
          />
          <TouchableOpacity
            style={[styles.btn, scenarioLoading && styles.btnDisabled]}
            onPress={onScenario}
            disabled={scenarioLoading || !scenario.trim()}
          >
            {scenarioLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('localAI.askScenario')}</Text>
            )}
          </TouchableOpacity>
          {scenarioResult ? <Text style={styles.result}>{stripDisclaimer(scenarioResult)}</Text> : null}
          {scenarioHistory.length > 0 ? (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>{t('localAI.previousQuestions')} ({scenarioHistory.length})</Text>
              {scenarioHistory.map((item, idx) => (
                <View key={idx} style={styles.historyItem}>
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyQ}>Q: {item.scenario}</Text>
                    <Text style={styles.historyA}>{stripDisclaimer(item.answer)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      const next = scenarioHistory.filter((_, i) => i !== idx);
                      setScenarioHistory(next);
                      await saveScenarioHistory(next);
                    }}
                    style={styles.historyDeleteBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e2e8f0', marginBottom: 10 },
  hint: { fontSize: 12, color: '#10b981', marginBottom: 6 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  result: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  historySection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 10 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  historyItemContent: { flex: 1, marginRight: 8 },
  historyDeleteBtn: { padding: 4 },
  historyQ: { fontSize: 13, color: '#a78bfa', fontWeight: '500', marginBottom: 4 },
  historyA: { fontSize: 13, color: '#cbd5e1', lineHeight: 20 },
});
