/**
 * AI Chat — Clinical Calm · Elevated
 * Greeting card · Category tabs · Suggestion cards · Sticky composer
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const SESSIONS_KEY = '@bonuslife_chat_sessions';

/* ── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  cream:    '#F5F1E8',
  cream2:   '#EFE9DC',
  cream3:   '#FBF7EC',
  ink:      '#1A1A1A',
  inkSub:   '#6B6A63',
  inkMute:  '#9A9890',
  sage:     '#234B3E',
  sageSoft: '#E3EAE4',
  sageDot:  '#4A7A66',
  peach:    '#F7E3D4',
  peachDeep:'#C97A4F',
  heart:    '#C95D5D',
  amber:    '#C9A875',
  line:     '#E2DCCC',
};

/* ── Slash commands ──────────────────────────────────────────────────────── */
const COMMANDS = [
  { ionicon: 'medkit-outline',    label: 'Symptoms',      desc: 'Diabetes symptoms',  prefix: '/symptoms' },
  { ionicon: 'nutrition-outline', label: 'Diet',          desc: 'Nutrition tips',     prefix: '/diet' },
  { ionicon: 'barbell-outline',   label: 'Exercise',      desc: 'Physical activity',  prefix: '/exercise' },
  { ionicon: 'shield-outline',    label: 'Prevention',    desc: 'Risk reduction',     prefix: '/prevention' },
  { ionicon: 'pulse-outline',     label: 'Treatment',     desc: 'Treatment options',  prefix: '/treatment' },
  { ionicon: 'heart-outline',     label: 'Complications', desc: 'Long-term effects',  prefix: '/complications' },
];

/* ── Category tabs + suggestion data ─────────────────────────────────────── */
const CATEGORIES = [
  { key: 'suggested',    label: 'Suggested'    },
  { key: 'blood_sugar',  label: 'Blood sugar'  },
  { key: 'nutrition',    label: 'Nutrition'    },
  { key: 'exercise',     label: 'Exercise'     },
];

const ALL_SUGGESTIONS = {
  suggested: [
    { icon: 'pulse-outline',      iconBg: T.peach,     iconColor: T.peachDeep, q: 'What foods help lower blood sugar?',    meta: 'Based on your diabetes assessment' },
    { icon: 'shield-outline',     iconBg: T.sageSoft,  iconColor: T.sageDot,   q: 'How do I prevent type 2 diabetes?',     meta: 'Personalized prevention plan' },
    { icon: 'document-text-outline', iconBg: '#F3ECD5', iconColor: T.amber,  q: 'Explain my HbA1c result',                meta: 'From your latest report' },
  ],
  blood_sugar: [
    { icon: 'analytics-outline',  iconBg: T.peach,     iconColor: T.peachDeep, q: 'What causes blood sugar spikes?',       meta: 'Learn the triggers' },
    { icon: 'time-outline',       iconBg: T.sageSoft,  iconColor: T.sageDot,   q: 'Best time to check blood sugar?',       meta: 'Monitoring tips' },
    { icon: 'cafe-outline',       iconBg: '#F3ECD5',   iconColor: T.amber,     q: 'Does coffee affect blood sugar?',       meta: 'Dietary impact' },
  ],
  nutrition: [
    { icon: 'nutrition-outline',  iconBg: T.sageSoft,  iconColor: T.sageDot,   q: 'What is a low-GI diet?',               meta: 'Glycemic index explained' },
    { icon: 'leaf-outline',       iconBg: T.peach,     iconColor: T.peachDeep, q: 'Best vegetables for diabetes?',         meta: 'Tailored food list' },
    { icon: 'pizza-outline',      iconBg: '#F3ECD5',   iconColor: T.amber,     q: 'How many carbs per day with diabetes?', meta: 'Macros guide' },
  ],
  exercise: [
    { icon: 'barbell-outline',    iconBg: T.sageSoft,  iconColor: T.sageDot,   q: 'Best exercises for blood sugar control?', meta: 'Activity recommendations' },
    { icon: 'walk-outline',       iconBg: T.peach,     iconColor: T.peachDeep, q: 'How long should I walk daily?',          meta: 'Step goal calculator' },
    { icon: 'bicycle-outline',    iconBg: '#F3ECD5',   iconColor: T.amber,     q: 'Is cardio or strength better for diabetes?', meta: 'Exercise comparison' },
  ],
};

/* ── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(d, { toValue: 1,   duration: 380, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.3, duration: 380, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.sage, opacity: d }} />
      ))}
    </View>
  );
}

/* ── Bold markdown renderer ──────────────────────────────────────────────── */
function RenderText({ text, style }) {
  if (typeof text !== 'string') return <Text style={style}>{text}</Text>;
  const parts = text.split(/\*\*/);
  if (parts.length === 1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {parts.map((seg, i) =>
        i % 2 === 1
          ? <Text key={i} style={[style, { fontWeight: '700', color: T.ink }]}>{seg}</Text>
          : seg
      )}
    </Text>
  );
}

/* ── AI Greeting Card ────────────────────────────────────────────────────── */
function GreetingCard({ firstName }) {
  return (
    <View style={gc.card}>
      {/* Layered gradient base */}
      <LinearGradient
        colors={[T.cream3, T.cream, T.cream2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sage blob top-right */}
      <View style={[gc.blob, { top: -24, right: -24, backgroundColor: 'rgba(35,75,62,0.07)' }]} />
      {/* Peach blob bottom-left */}
      <View style={[gc.blob, { bottom: -20, left: -20, backgroundColor: 'rgba(201,122,79,0.08)' }]} />

      {/* Avatar + status */}
      <View style={gc.avatarWrap}>
        {/* 56px sage gradient avatar */}
        <LinearGradient
          colors={[T.sage, T.sageDot]}
          start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }}
          style={gc.avatar}
        >
          <Ionicons name="hardware-chip-outline" size={24} color="#FFFFFF" />
        </LinearGradient>
        {/* Pulse dot */}
        <View style={gc.pulseDot} />
      </View>

      <Text style={gc.brand}>Bonus Life AI</Text>
      <View style={gc.statusRow}>
        <View style={gc.onlineDot} />
        <Text style={gc.statusText}>Online · responds instantly</Text>
      </View>
      <Text style={gc.meta}>Trained on your health data · private & secure</Text>
    </View>
  );
}
const gc = StyleSheet.create({
  card: {
    borderRadius: 22, overflow: 'hidden', padding: 20,
    alignItems: 'center', marginBottom: 24,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  blob:        { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  avatarWrap:  { position: 'relative', marginBottom: 12 },
  avatar:      { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pulseDot: {
    position: 'absolute', bottom: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: T.sageDot,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: T.sageDot, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 3,
  },
  brand: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 18, fontWeight: '700',
    color: T.ink, marginBottom: 6,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.sageDot },
  statusText:{ fontSize: 12, color: T.sageDot, fontWeight: '600' },
  meta:      { fontSize: 11, color: T.inkMute, textAlign: 'center' },
});

/* ── Category tab ────────────────────────────────────────────────────────── */
function CategoryTab({ label, active, onPress }) {
  return (
    <Pressable
      style={[ct.tab, active && ct.tabActive]}
      onPress={onPress}
    >
      <Text style={[ct.label, active && ct.labelActive]}>{label}</Text>
    </Pressable>
  );
}
const ct = StyleSheet.create({
  tab: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 100, borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  tabActive: { backgroundColor: T.ink, borderColor: T.ink },
  label:      { fontSize: 12.5, fontWeight: '500', color: T.inkSub },
  labelActive:{ color: '#FFFFFF', fontWeight: '700' },
});

/* ── Suggestion card ─────────────────────────────────────────────────────── */
function SuggestionCard({ item, onPress, isLast }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={[sc.wrap, { transform: [{ scale }] }, !isLast && sc.notLast]}>
      <Pressable style={sc.card} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <View style={[sc.iconBox, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={16} color={item.iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sc.question}>{item.q}</Text>
          <Text style={sc.meta}>{item.meta}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={T.inkMute} />
      </Pressable>
    </Animated.View>
  );
}
const sc = StyleSheet.create({
  wrap:    { marginBottom: 0 },
  notLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  question:{ fontSize: 13, fontWeight: '500', color: T.ink, marginBottom: 2 },
  meta:    { fontSize: 11, color: T.inkMute },
});

/* ── Recent strip ────────────────────────────────────────────────────────── */
function RecentStrip({ count, onView }) {
  if (!count) return null;
  const label = count === 1 ? '1 conversation from this week' : `${count} conversations from this week`;
  return (
    <TouchableOpacity style={rv.strip} onPress={onView} activeOpacity={0.75}>
      <View style={rv.iconWrap}>
        <Ionicons name="time-outline" size={13} color={T.sage} />
      </View>
      <Text style={rv.text}>{label}</Text>
      <Text style={rv.link}>View →</Text>
    </TouchableOpacity>
  );
}
const rv = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.sageSoft, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, marginTop: 14,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.15)',
  },
  iconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  text:     { flex: 1, fontSize: 12.5, color: T.inkSub, fontWeight: '500' },
  link:     { fontSize: 12.5, fontWeight: '700', color: T.sage },
});

/* ── Empty state (greeting + tabs + suggestions) ─────────────────────────── */
function EmptyState({ firstName, onSend, weekCount, onViewHistory }) {
  const [activeTab, setActiveTab] = useState('suggested');
  const suggestions = ALL_SUGGESTIONS[activeTab] || [];
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={es.scroll}
    >
      {/* Greeting card */}
      <GreetingCard firstName={firstName} />

      {/* Editorial heading */}
      <Text style={es.h1}>
        How can I{' '}
        <Text style={es.h1Accent}>help</Text>
        {'\n'}today{firstName ? `, ${firstName}` : ''}?
      </Text>
      <Text style={es.sub}>Ask anything about your assessments, diet, or risks.</Text>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={es.tabRow}
        style={{ marginBottom: 16 }}
      >
        {CATEGORIES.map(c => (
          <CategoryTab
            key={c.key}
            label={c.label}
            active={activeTab === c.key}
            onPress={() => setActiveTab(c.key)}
          />
        ))}
      </ScrollView>

      {/* Suggestion cards grouped in a white card */}
      <View style={es.suggCard}>
        {suggestions.map((item, i) => (
          <SuggestionCard
            key={item.q}
            item={item}
            isLast={i === suggestions.length - 1}
            onPress={() => onSend(item.q)}
          />
        ))}
      </View>

      {/* Recent strip */}
      <RecentStrip count={weekCount} onView={onViewHistory} />
    </ScrollView>
  );
}
const es = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  h1: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400', fontSize: 30, color: T.ink,
    letterSpacing: -0.6, lineHeight: 36,
    textAlign: 'center', marginBottom: 8,
  },
  h1Accent: { color: T.sage, fontStyle: 'italic' },
  sub:    { fontSize: 13, color: T.inkSub, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  tabRow: { gap: 7, paddingHorizontal: 0 },
  suggCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 0.5, borderColor: T.line, overflow: 'hidden',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
});

/* ── Composer ────────────────────────────────────────────────────────────── */
function Composer({ value, onChange, onSend, loading, insetBottom }) {
  const [focused, setFocused] = useState(false);
  const hasInput = value.trim().length > 0;
  return (
    <View style={[cp.outer, { paddingBottom: insetBottom + 10 }]}>
      <View style={[cp.bar, focused && cp.barFocused]}>
        {/* Attachment */}
        <Pressable style={cp.iconBtn} hitSlop={8}>
          <Ionicons name="attach-outline" size={19} color={T.inkMute} />
        </Pressable>

        <TextInput
          style={cp.input}
          placeholder="Ask about your health…"
          placeholderTextColor={T.inkMute}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={() => onSend()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!loading}
          multiline
          blurOnSubmit={false}
          outlineStyle="none"
        />

        {/* Voice */}
        {!hasInput && (
          <Pressable style={cp.iconBtn} hitSlop={8}>
            <Ionicons name="mic-outline" size={19} color={T.inkMute} />
          </Pressable>
        )}

        {/* Send */}
        <Pressable
          onPress={() => onSend()}
          disabled={loading || !hasInput}
          style={[cp.sendBtn, (!hasInput || loading) && cp.sendBtnOff]}
          hitSlop={4}
        >
          <Ionicons name="arrow-up" size={18} color={hasInput && !loading ? '#FFFFFF' : T.inkMute} />
        </Pressable>
      </View>
    </View>
  );
}
const cp = StyleSheet.create({
  outer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: T.cream,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.line,
  },
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  barFocused: { borderColor: 'rgba(35,75,62,0.3)' },
  iconBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: T.cream3, borderRadius: 10 },
  input:     { flex: 1, color: T.ink, fontSize: 15, maxHeight: 100, paddingVertical: 4, lineHeight: 22, backgroundColor: 'transparent', outlineWidth: 0, outlineStyle: 'none' },
  sendBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: T.sage, alignItems: 'center', justifyContent: 'center',
    shadowColor: T.sage, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  sendBtnOff: { backgroundColor: T.cream3, shadowOpacity: 0 },
});

/* ── History Modal ───────────────────────────────────────────────────────── */
function HistoryModal({ visible, sessions, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={hm.overlay}>
        <View style={[hm.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={hm.handle} />
          {/* Header */}
          <View style={hm.header}>
            <Text style={hm.title}>Past Conversations</Text>
            <TouchableOpacity onPress={onClose} style={hm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={T.inkSub} />
            </TouchableOpacity>
          </View>
          {sessions.length === 0 ? (
            <View style={hm.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={T.inkMute} />
              <Text style={hm.emptyText}>No conversations yet</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={s => s.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item, index }) => {
                const date = new Date(item.startedAt);
                const now = new Date();
                const isToday = date.toDateString() === now.toDateString();
                const dateStr = isToday
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return (
                  <View style={[hm.row, index < sessions.length - 1 && hm.rowBorder]}>
                    <View style={hm.rowIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={T.sage} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={hm.rowQ} numberOfLines={2}>{item.firstMessage}</Text>
                      <Text style={hm.rowMeta}>
                        {dateStr} · {item.messageCount} message{item.messageCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
const hm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: T.cream3, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingTop: 12 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: T.line, alignSelf: 'center', marginBottom: 12 },
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  title: {
    flex: 1, fontSize: 16, fontWeight: '700', color: T.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic',
  },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.cream2, alignItems: 'center', justifyContent: 'center' },
  empty:    { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText:{ fontSize: 13, color: T.inkMute },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  rowBorder:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line },
  rowIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: T.sageSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  rowQ:     { fontSize: 13, fontWeight: '500', color: T.ink, lineHeight: 18, marginBottom: 3 },
  rowMeta:  { fontSize: 11, color: T.inkMute },
});

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function ChatScreen({ route }) {
  const { user }     = useAuth();
  const { language } = useLanguage();
  const insets       = useSafeAreaInsets();
  const apiLang      = language === 'turkish' ? 'turkish' : 'english';

  const [input,         setInput]         = useState('');
  const [messages,      setMessages]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [chatStarted,   setChatStarted]   = useState(false);
  const [showCmds,      setShowCmds]      = useState(false);
  const [sessions,      setSessions]      = useState([]);
  const [showHistory,   setShowHistory]   = useState(false);

  const listRef        = useRef(null);
  const didAutoSend    = useRef(false);
  const sessionId      = useRef(Date.now().toString());
  const sessionStart   = useRef(new Date().toISOString());

  const firstName = (user?.full_name || '').split(' ')[0].split('@')[0] || '';

  // Load sessions on mount
  useEffect(() => {
    AsyncStorage.getItem(SESSIONS_KEY).then(raw => {
      if (raw) setSessions(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  // Week count: sessions whose startedAt is within the last 7 days
  const weekCount = sessions.filter(s => {
    const diff = Date.now() - new Date(s.startedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Save session after each assistant reply
  const saveSession = useCallback(async (msgs) => {
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const firstMessage = userMsgs[0].text;
    const entry = {
      id: sessionId.current,
      startedAt: sessionStart.current,
      firstMessage,
      messageCount: msgs.length,
    };
    try {
      const raw = await AsyncStorage.getItem(SESSIONS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      // Replace existing or prepend
      const filtered = prev.filter(s => s.id !== entry.id);
      const updated = [entry, ...filtered].slice(0, 50);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
      setSessions(updated);
    } catch {}
  }, []);

  // Auto-send context message when navigated from result screen
  useEffect(() => {
    const ctx = route?.params?.context;
    if (ctx && !didAutoSend.current) {
      didAutoSend.current = true;
      setTimeout(() => send(ctx), 300);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, loading]);

  useEffect(() => {
    setShowCmds(input.startsWith('/') && !input.includes(' ') && input.length > 0);
  }, [input]);

  const filteredCmds = COMMANDS.filter(c => input === '/' || c.prefix.startsWith(input));

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    if (!chatStarted) setChatStarted(true);
    setInput('');
    setShowCmds(false);
    const userMsg = { role: 'user', text, ts: new Date() };
    setMessages(m => {
      const updated = [...m, userMsg];
      return updated;
    });
    setLoading(true);
    try {
      const res = await api.chat(text, apiLang, user?.id?.toString() || 'default');
      const aiMsg = { role: 'assistant', text: res.response, ts: new Date() };
      setMessages(m => {
        const updated = [...m, aiMsg];
        saveSession(updated);
        return updated;
      });
    } catch {
      const errMsg = {
        role: 'assistant',
        text: 'Could not get a response. Please check your connection and try again.',
        ts: new Date(), isError: true,
      };
      setMessages(m => {
        const updated = [...m, errMsg];
        saveSession(updated);
        return updated;
      });
    } finally { setLoading(false); }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[ms.row, isUser && ms.rowUser]}>
        {isUser ? (
          <View style={ms.avatarUser}>
            <Ionicons name="person" size={12} color="#FFFFFF" />
          </View>
        ) : (
          <LinearGradient
            colors={[T.sage, T.sageDot]}
            start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }}
            style={[ms.avatarBot, item.isError && ms.avatarErr]}
          >
            <Ionicons name="hardware-chip-outline" size={13} color={item.isError ? '#C85A3A' : '#FFFFFF'} />
          </LinearGradient>
        )}
        <View style={[ms.bubble, isUser ? ms.bubbleUser : item.isError ? ms.bubbleErr : ms.bubbleBot]}>
          {isUser
            ? <Text style={[ms.bubbleText, ms.bubbleTextUser]}>{item.text}</Text>
            : <RenderText text={item.text} style={ms.bubbleText} />
          }
          <Text style={[ms.ts, isUser && ms.tsUser]}>
            {isUser ? 'You' : item.isError ? 'Error' : 'AI'} · {item.ts?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={st.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {!chatStarted ? (
        /* ── EMPTY STATE ── */
        <View style={{ flex: 1 }}>
          <EmptyState firstName={firstName} onSend={send} weekCount={weekCount} onViewHistory={() => setShowHistory(true)} />
        </View>
      ) : (
        /* ── ACTIVE CHAT ── */
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={ms.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={ms.row}>
                <LinearGradient colors={[T.sage, T.sageDot]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.avatarBot}>
                  <Ionicons name="hardware-chip-outline" size={13} color="#FFFFFF" />
                </LinearGradient>
                <View style={ms.bubbleBot}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[ms.bubbleText, { color: T.inkMute }]}>Thinking</Text>
                    <TypingDots />
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Slash command palette ── */}
      {showCmds && filteredCmds.length > 0 && (
        <View style={st.cmdPalette}>
          <View style={st.cmdHeader}>
            <Ionicons name="code-slash" size={11} color="rgba(35,75,62,0.6)" />
            <Text style={st.cmdHeaderText}>Commands</Text>
          </View>
          {filteredCmds.map((cmd, idx) => (
            <React.Fragment key={cmd.prefix}>
              {idx > 0 && <View style={st.cmdDivider} />}
              <TouchableOpacity
                style={st.cmdRow}
                onPress={() => { setInput(cmd.prefix + ' '); setShowCmds(false); }}
                activeOpacity={0.72}
              >
                <View style={st.cmdIcon}>
                  <Ionicons name={cmd.ionicon} size={14} color={T.sage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.cmdLabel}>{cmd.label}</Text>
                  <Text style={st.cmdDesc}>{cmd.desc}</Text>
                </View>
                <Text style={st.cmdPrefix}>{cmd.prefix}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── Composer (always visible) ── */}
      <Composer
        value={input}
        onChange={setInput}
        onSend={send}
        loading={loading}
        insetBottom={insets.bottom}
      />

      {/* ── History modal ── */}
      <HistoryModal
        visible={showHistory}
        sessions={sessions}
        onClose={() => setShowHistory(false)}
      />
    </KeyboardAvoidingView>
  );
}

/* ── Message styles ──────────────────────────────────────────────────────── */
const ms = StyleSheet.create({
  list:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  row:        { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  rowUser:    { flexDirection: 'row-reverse' },
  avatarUser: { width: 30, height: 30, borderRadius: 10, backgroundColor: T.sage, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  avatarBot:  { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  avatarErr:  { backgroundColor: 'rgba(200,90,58,0.12)' },
  bubble:     { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: T.sage, borderTopRightRadius: 4 },
  bubbleBot:  { backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: T.line, borderTopLeftRadius: 4, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  bubbleErr:  { backgroundColor: 'rgba(200,90,58,0.06)', borderWidth: 0.5, borderColor: 'rgba(200,90,58,0.15)', borderTopLeftRadius: 4 },
  bubbleText:     { fontSize: 14, color: T.inkSub, lineHeight: 21 },
  bubbleTextUser: { color: '#FFFFFF' },
  ts:         { fontSize: 10, color: 'rgba(28,27,24,0.35)', marginTop: 5 },
  tsUser:     { color: 'rgba(255,255,255,0.5)' },
});

/* ── Screen styles ───────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },

  /* Command palette */
  cmdPalette:  { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cmdHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: T.line },
  cmdHeaderText:{ fontSize: 10, fontWeight: '700', color: 'rgba(35,75,62,0.6)', letterSpacing: 1 },
  cmdRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  cmdDivider:  { height: 0.5, backgroundColor: 'rgba(28,27,24,0.05)' },
  cmdIcon:     { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(35,75,62,0.08)', alignItems: 'center', justifyContent: 'center' },
  cmdLabel:    { fontSize: 13, fontWeight: '600', color: T.ink },
  cmdDesc:     { fontSize: 11, color: T.inkMute, marginTop: 1 },
  cmdPrefix:   { fontSize: 11, fontWeight: '600', color: 'rgba(35,75,62,0.5)', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
