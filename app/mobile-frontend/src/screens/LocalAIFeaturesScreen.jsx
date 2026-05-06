/**
 * What if…? — Local AI Features — Clinical Calm
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Pressable, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import * as api from '../services/api';
import { RADIUS, FONT } from '../config/theme';

const SAGE  = '#2D6A4F';
const AMBER = '#B4781E';
const SLATE = '#6B8794';

const TIP_KEY     = 'bonuslife_local_ai_tip';
const HISTORY_KEY = 'bonuslife_local_ai_scenario_history';
const HISTORY_MAX = 10;

const getTodayDate = () => new Date().toISOString().slice(0, 10);

async function loadStoredTip() {
  try {
    const raw = await AsyncStorage.getItem(TIP_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.date === getTodayDate() ? data.tip || null : null;
  } catch { return null; }
}
async function saveStoredTip(tip) {
  try { await AsyncStorage.setItem(TIP_KEY, JSON.stringify({ date: getTodayDate(), tip })); } catch {}
}
async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, HISTORY_MAX) : [];
  } catch { return []; }
}
async function saveHistory(list) {
  try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); } catch {}
}

function stripDisclaimer(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  const di = out.search(/\bDisclaimer\s*:/i);
  if (di !== -1) out = out.slice(0, di);
  out = out.replace(/\n*This is not medical advice\.?\s*$/i, '').trim();
  out = out.replace(/\n*Consult with your healthcare provider[^.]*\.?\s*$/i, '').trim();
  return out.trim();
}

/* ── Action button ────────────────────────────────────────────────────────── */
function ActionBtn({ onPress, loading, label, icon, disabled, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const bg = disabled || loading ? 'rgba(28,27,24,0.12)' : (color || SAGE);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={disabled || loading}>
        <View style={[ab.btn, { backgroundColor: bg }]}>
          {loading ? <ActivityIndicator color="#F7F4ED" size="small" /> : (
            <>
              <Ionicons name={icon} size={16} color="#F7F4ED" />
              <Text style={ab.label}>{label}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
const ab = StyleSheet.create({
  btn:   { borderRadius: RADIUS.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  label: { color: '#F7F4ED', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});

/* ── Result card ──────────────────────────────────────────────────────────── */
function ResultCard({ icon, iconColor, children }) {
  return (
    <View style={rc.card}>
      <View style={[rc.topBar, { backgroundColor: iconColor }]} />
      <Ionicons name={icon} size={14} color={iconColor} style={{ marginBottom: 10 }} />
      {children}
    </View>
  );
}
const rc = StyleSheet.create({
  card:   { backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 16, marginTop: 14, borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.08)', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: RADIUS.md, borderTopRightRadius: RADIUS.md },
});

/* ── Section card ─────────────────────────────────────────────────────────── */
function SectionCard({ icon, iconColor, title, description, children }) {
  return (
    <View style={scc.wrap}>
      <View style={scc.header}>
        <View style={[scc.iconBox, { backgroundColor: iconColor + '18', borderColor: iconColor + '35' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={scc.title}>{title}</Text>
          <Text style={scc.desc}>{description}</Text>
        </View>
      </View>
      <View style={[scc.card, { borderColor: iconColor + '25' }]}>
        <View style={[scc.topLine, { backgroundColor: iconColor + '40' }]} />
        {children}
      </View>
    </View>
  );
}
const scc = StyleSheet.create({
  wrap:    { marginBottom: 24 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:   { fontSize: 16, fontWeight: '700', color: '#1C1B18', marginBottom: 2 },
  desc:    { fontSize: 12, color: 'rgba(28,27,24,0.45)' },
  card:    { backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, padding: 16, borderWidth: 0.5, overflow: 'hidden', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
});

/* ── History item ─────────────────────────────────────────────────────────── */
function HistoryItem({ item, index, onDelete }) {
  const [exp, setExp] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    Animated.spring(rotate, { toValue: exp ? 0 : 1, damping: 20, stiffness: 260, useNativeDriver: true }).start();
    setExp(e => !e);
  };
  const chevronRot = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <View style={hi.wrap}>
      <Pressable style={hi.hdr} onPress={toggle}>
        <View style={hi.num}><Text style={hi.numText}>{index + 1}</Text></View>
        <Text style={hi.q} numberOfLines={exp ? undefined : 1}>{item.scenario}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronRot }] }}>
          <Ionicons name="chevron-down" size={14} color="rgba(28,27,24,0.3)" />
        </Animated.View>
        <Pressable onPress={onDelete} hitSlop={10} style={hi.del}>
          <Ionicons name="trash-outline" size={15} color="rgba(200,90,58,0.6)" />
        </Pressable>
      </Pressable>
      {exp && <Text style={hi.ans}>{stripDisclaimer(item.answer)}</Text>}
    </View>
  );
}
const hi = StyleSheet.create({
  wrap:    { borderBottomWidth: 0.5, borderBottomColor: 'rgba(28,27,24,0.07)', paddingVertical: 12 },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num:     { width: 20, height: 20, borderRadius: 6, backgroundColor: SAGE + '15', alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 10, fontWeight: '700', color: SAGE },
  q:       { flex: 1, fontSize: 13, fontWeight: '600', color: '#1C1B18' },
  del:     { padding: 4 },
  ans:     { fontSize: 13, color: 'rgba(28,27,24,0.65)', lineHeight: 20, marginTop: 8, paddingLeft: 28 },
});

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function LocalAIFeaturesScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const lang = language === 'turkish' ? 'turkish' : 'english';

  const [tip, setTip]                         = useState('');
  const [tipLoading, setTipLoading]           = useState(false);
  const [scenario, setScenario]               = useState('');
  const [scenarioResult, setScenarioResult]   = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioHistory, setScenarioHistory] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [scenarioFocused, setScenarioFocused] = useState(false);

  useEffect(() => {
    (async () => {
      try { const list = await api.getMyAssessments(1); if (Array.isArray(list) && list.length > 0) setLatestAssessment(list[0]); } catch {}
      const stored = await loadStoredTip(); if (stored) setTip(stored);
      const hist   = await loadHistory(); setScenarioHistory(hist);
    })();
  }, []);

  const getTip = async (force = false) => {
    if (!force) { const stored = await loadStoredTip(); if (stored) { setTip(stored); return; } }
    setTipLoading(true); setTip('');
    try {
      const res  = await api.localAIGetHealthTip(lang);
      const text = res.tip || res.detail || '';
      setTip(text); await saveStoredTip(text);
    } catch (e) { setTip((t('localAI.error') || 'Error') + ': ' + (e.message || '')); }
    finally { setTipLoading(false); }
  };

  const askScenario = async () => {
    if (!scenario.trim()) return;
    const question = scenario.trim();
    setScenarioLoading(true); setScenarioResult('');
    try {
      const res    = await api.localAIAnswerScenario(question, latestAssessment || undefined, lang);
      const answer = res.answer || res.detail || '';
      setScenarioResult(answer);
      const next = [{ scenario: question, answer }, ...scenarioHistory];
      setScenarioHistory(next); await saveHistory(next);
    } catch (e) { setScenarioResult((t('localAI.error') || 'Error') + ': ' + (e.message || '')); }
    finally { setScenarioLoading(false); }
  };

  const deleteHistoryItem = async (idx) => {
    const next = scenarioHistory.filter((_, i) => i !== idx);
    setScenarioHistory(next); await saveHistory(next);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F7F4ED' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>{t('localAI.title') || 'What if…?'}</Text>
        <Text style={s.subtitle}>{t('localAI.subtitle') || 'Daily health tips and personalised "what if" scenario analysis.'}</Text>

        {/* Tip of the Day */}
        <SectionCard
          icon="sunny-outline"
          iconColor={SAGE}
          title={t('localAI.tipTitle') || 'Tip of the Day'}
          description="AI-generated daily health insight"
        >
          <ActionBtn
            onPress={() => getTip(!!tip)}
            loading={tipLoading}
            label={tip ? (t('localAI.getNewTip') || 'New Tip') : (t('localAI.getTip') || "Get Today's Tip")}
            icon={tip ? 'refresh-outline' : 'bulb-outline'}
            color={SAGE}
          />
          {tip ? (
            <ResultCard icon="bulb-outline" iconColor={SAGE}>
              <Text style={s.resultText}>{tip}</Text>
            </ResultCard>
          ) : null}
        </SectionCard>

        {/* What if…? Scenario */}
        <SectionCard
          icon="flash-outline"
          iconColor={SLATE}
          title="Local AI"
          description="Ask any health 'what if' question"
        >
          <TextInput
            style={[s.scenarioInput, scenarioFocused && s.scenarioInputFocused]}
            placeholder={t('localAI.scenarioPlaceholder') || 'e.g. What if I eat less sugar for 30 days?'}
            placeholderTextColor="rgba(28,27,24,0.25)"
            value={scenario}
            onChangeText={v => { setScenario(v); setScenarioResult(''); }}
            multiline
            numberOfLines={3}
            editable={!scenarioLoading}
            onFocus={() => setScenarioFocused(true)}
            onBlur={() => setScenarioFocused(false)}
            textAlignVertical="top"
          />
          <View style={{ marginTop: 10 }}>
            <ActionBtn
              onPress={askScenario}
              loading={scenarioLoading}
              label={t('localAI.askScenario') || 'Analyze Scenario'}
              icon="analytics-outline"
              disabled={!scenario.trim()}
              color={SLATE}
            />
          </View>
          {scenarioResult ? (
            <ResultCard icon="analytics-outline" iconColor={SLATE}>
              <Text style={s.resultText}>{stripDisclaimer(scenarioResult)}</Text>
            </ResultCard>
          ) : null}

          {scenarioHistory.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={s.histHeader}>
                <Ionicons name="time-outline" size={13} color="rgba(28,27,24,0.35)" />
                <Text style={s.histTitle}>{t('localAI.previousQuestions') || 'Previous Questions'}</Text>
                <View style={s.histBadge}><Text style={s.histBadgeText}>{scenarioHistory.length}</Text></View>
              </View>
              {scenarioHistory.map((item, idx) => (
                <HistoryItem
                  key={idx}
                  item={item}
                  index={idx}
                  onDelete={() => deleteHistoryItem(idx)}
                />
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  content:  { padding: 20, paddingTop: 16 },
  blob:     { position: 'absolute', top: 80, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(45,106,79,0.05)' },

  title:    { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 6 },
  subtitle: { fontSize: 12, fontStyle: 'italic', color: 'rgba(28,27,24,0.5)', lineHeight: 18, marginBottom: 28 },

  scenarioInput:       { backgroundColor: 'rgba(28,27,24,0.04)', borderRadius: 12, padding: 14, color: '#1C1B18', fontSize: 14, lineHeight: 21, borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.1)', minHeight: 90, textAlignVertical: 'top' },
  scenarioInputFocused:{ borderColor: SLATE + '55', backgroundColor: SLATE + '08' },

  resultText: { fontSize: 14, color: 'rgba(28,27,24,0.75)', lineHeight: 22 },

  histHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(28,27,24,0.08)' },
  histTitle:     { fontSize: 11, fontWeight: '700', color: 'rgba(28,27,24,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, flex: 1 },
  histBadge:     { backgroundColor: SAGE + '15', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  histBadgeText: { fontSize: 11, fontWeight: '700', color: SAGE },
});
