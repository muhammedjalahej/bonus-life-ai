/**
 * HomeScreen — Clinical Calm Design
 * Cream bg · Sage hero card · Georgia serif titles · Hospital card
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  RefreshControl, Animated, Platform, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { COLORS, RADIUS, FONT, SPACING, FEATURE_COLORS } from '../config/theme';
import FeatureCard from '../components/FeatureCard';

const GRID_PAD = SPACING.lg;
const GRID_GAP  = SPACING.sm;

/* ── Quick-action tools ──────────────────────────────────────────────────── */
const QUICK_TOOLS = [
  { key: 'Assessment', icon: 'pulse-outline', color: FEATURE_COLORS.Assessment, label: 'Diabetes',   hint: 'Risk assessment' },
  { key: 'Heart',      icon: 'heart-outline', color: FEATURE_COLORS.Heart,      label: 'Heart Risk', hint: 'Cardiovascular'  },
  { key: 'BrainMRI',   icon: 'scan-outline',  color: FEATURE_COLORS.BrainMRI,   label: 'Brain MRI',  hint: 'Tumor detection' },
  { key: 'CKD',        icon: 'water-outline', color: FEATURE_COLORS.CKD,        label: 'Kidney CKD', hint: 'Renal health'    },
];

/* ── Record type metadata ────────────────────────────────────────────────── */
const TYPE_COLOR = {
  diabetes: FEATURE_COLORS.Assessment,
  heart:    FEATURE_COLORS.Heart,
  ckd:      FEATURE_COLORS.CKD,
  mri:      FEATURE_COLORS.BrainMRI,
};
const TYPE_ICON  = { diabetes: 'pulse-outline', heart: 'heart-outline', ckd: 'water-outline', mri: 'scan-outline' };
const TYPE_LABEL = { diabetes: 'Diabetes', heart: 'Heart', ckd: 'Kidney CKD', mri: 'Brain MRI' };

function timeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 14) return '1 week ago';
  return `${Math.floor(diff / 7)} weeks ago`;
}

/* ── Avatar circle with initials ─────────────────────────────────────────── */
function UserAvatar({ name, onPress }) {
  const initials = (name || 'U').substring(0, 2).toUpperCase();
  return (
    <Pressable style={s.avatarWrap} onPress={onPress} hitSlop={6}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.avatarDot} />
    </Pressable>
  );
}

/* ── Info Modal — centered card with score circle ────────────────────────── */
function InfoModal({ visible, onClose, title, icon, iconColor, prob, riskLevel, riskLabel: riskLabelText, description, questionCount, onRetake, onAskAI, circleLabel, circleValue, hideBar, gridLabels, leftGridVal, primaryLabel }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, damping: 26, stiffness: 320, useNativeDriver: true }).start();
  }, [visible]);
  if (!visible) return null;

  const pct = prob != null ? Math.round(prob * 100) : null;
  const segColors = ['#2D6A4F', '#B4781E', '#C85A3A'];

  // left grid cell: explicit override → circleValue → risk % → '—'
  const leftVal = leftGridVal !== undefined
    ? leftGridVal
    : (circleValue !== undefined ? String(circleValue) : (pct != null ? `${pct}%` : '—'));

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={im.backdrop} onPress={onClose}>
        <Animated.View style={[im.card, {
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }]}>
          <Pressable onPress={() => {}}>
            {/* Close */}
            <Pressable onPress={onClose} style={im.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={15} color="rgba(28,27,24,0.4)" />
            </Pressable>

            {/* Header */}
            <View style={im.header}>
              <View style={[im.iconWrap, { backgroundColor: iconColor + '18' }]}>
                <Ionicons name={icon} size={16} color={iconColor} />
              </View>
              <Text style={im.title}>{title}</Text>
            </View>

            {/* Score circle */}
            <View style={im.circleWrap}>
              <View style={[im.circle, { borderColor: iconColor + '40', backgroundColor: iconColor + '0E' }]}>
                <Text style={[im.circleVal, { color: iconColor }]}>
                  {circleValue !== undefined ? String(circleValue) : (pct != null ? `${pct}%` : '—')}
                </Text>
                <Text style={im.circleUnit}>{circleLabel ?? 'RISK'}</Text>
              </View>
              <Text style={[im.riskTitle, { color: iconColor }]}>{riskLabelText}</Text>
              {description ? <Text style={im.riskDesc}>{description}</Text> : null}
            </View>

            {/* Risk bar */}
            {!hideBar && (
              <>
                <View style={im.barRow}>
                  {segColors.map((c, i) => (
                    <View key={i} style={[im.barSeg, { backgroundColor: c, opacity: i === riskLevel ? 1 : 0.15 }]} />
                  ))}
                </View>
                <View style={im.barLabels}>
                  <Text style={im.barLabel}>Low</Text>
                  <Text style={im.barLabel}>Medium</Text>
                  <Text style={im.barLabel}>High</Text>
                </View>
              </>
            )}

            {/* Detail grid */}
            <View style={im.grid}>
              <View style={im.gridCell}>
                <Text style={im.gridLabel}>{gridLabels?.[0] ?? 'RISK LEVEL'}</Text>
                <Text style={im.gridVal}>{leftVal}</Text>
              </View>
              <View style={[im.gridCell, im.gridCellRight]}>
                <Text style={im.gridLabel}>{gridLabels?.[1] ?? 'QUESTIONS'}</Text>
                <Text style={im.gridVal}>{questionCount ?? '8 / 8'}</Text>
              </View>
            </View>

            {/* Actions: Save ghost + Ask AI primary */}
            <View style={im.actions}>
              <Pressable style={im.btnGhost} onPress={onClose}>
                <Ionicons name="refresh-outline" size={14} color="rgba(28,27,24,0.5)" />
                <Text style={im.btnGhostText}>{primaryLabel ?? 'Retake'}</Text>
              </Pressable>
              <Pressable style={im.btnAskAI} onPress={() => { onClose(); onAskAI?.(); }}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#F7F4ED" />
                <Text style={im.btnAskAIText}>Ask AI</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function calcStreak(allRecords) {
  if (!allRecords.length) return 0;
  const days = new Set(
    allRecords
      .filter(r => r.created_at)
      .map(r => new Date(r.created_at).toDateString())
  );
  let streak = 0;
  const d = new Date();
  // If nothing today, still allow yesterday to start streak
  while (true) {
    if (days.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function riskLabel(prob) {
  if (prob == null) return '—';
  if (prob < 0.3) return 'Low';
  if (prob < 0.6) return 'Med';
  return 'High';
}

function riskColor(prob, baseColor) {
  if (prob == null) return baseColor;
  if (prob < 0.3) return '#2D6A4F';
  if (prob < 0.6) return '#B4781E';
  return '#C85A3A';
}

function trendStr(curr, prev) {
  if (curr == null || prev == null) return '—';
  const delta = ((curr - prev) * 100).toFixed(0);
  if (delta > 0) return `↑ ${Math.abs(delta)}%`;
  if (delta < 0) return `↓ ${Math.abs(delta)}%`;
  return '—';
}

function calcHealthScore(dProb, hProb, ckdConf) {
  const scores = [];
  if (dProb   != null) scores.push((1 - dProb)   * 100);
  if (hProb   != null) scores.push((1 - hProb)   * 100);
  if (ckdConf != null) scores.push((1 - ckdConf) * 100);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

const STAT_EXPLAIN = {
  Diabetes: {
    title: 'Diabetes Risk',
    body: (value, prob) =>
      `Your latest diabetes risk is ${value} (${prob != null ? Math.round(prob * 100) + '%' : '—'} probability).\n\n` +
      'Low (<30%) — you show few risk markers. Keep up a healthy diet and regular exercise.\n' +
      'Med (30–60%) — some risk factors present. Consider lifestyle changes and consult a doctor.\n' +
      'High (>60%) — significant risk detected. Please seek medical advice promptly.',
  },
  Heart: {
    title: 'Heart Risk',
    body: (value, prob) =>
      `Your latest cardiovascular risk score is ${value} (${prob != null ? Math.round(prob * 100) + '%' : '—'}).\n\n` +
      'Low (<30%) — healthy heart indicators. Maintain regular activity.\n' +
      'Med (30–60%) — moderate risk. Monitor blood pressure, cholesterol and stress levels.\n' +
      'High (>60%) — elevated risk. Consult a cardiologist as soon as possible.',
  },
  Kidney: {
    title: 'Kidney (CKD) Risk',
    body: (value, prob) =>
      `Your latest CKD risk is ${value} (${prob != null ? Math.round(prob * 100) + '%' : '—'} confidence).\n\n` +
      'Good (<30%) — kidney function appears normal. Stay hydrated and limit salt.\n' +
      'Fair (30–60%) — moderate indicators. Reduce processed food and monitor blood pressure.\n' +
      'Risk (>60%) — potential kidney disease markers. Please consult a nephrologist.',
  },
};

/* ── Hero card ───────────────────────────────────────────────────────────── */
function HeroCard({ onPress, score, streak, onStreakPress }) {
  const scorePrev  = null; // future: store previous week score
  const hasScore   = score != null;
  const displayScore = hasScore ? score : '—';

  return (
    <Pressable style={s.heroCard} onPress={onPress}>
      <View style={s.heroBlob1} />
      <View style={s.heroBlob2} />

      <View style={{ flex: 1 }}>
        <Text style={s.heroLabel}>HEALTH SCORE</Text>
        <Text style={s.heroScore}>{displayScore}</Text>
        <View style={s.heroScoreSub}>
          <Ionicons name="information-circle-outline" size={12} color="rgba(247,244,237,0.7)" />
          <Text style={s.heroScoreSubText}>
            {hasScore ? 'Based on your latest assessments' : 'Complete an assessment to get your score'}
          </Text>
        </View>

        <View style={s.heroDivider} />

        <View style={s.streakRow}>
          <Pressable style={s.streakLeft} onPress={onStreakPress} hitSlop={8}>
            <Ionicons name="flame" size={13} color={streak > 0 ? 'rgba(247,244,237,0.9)' : 'rgba(247,244,237,0.4)'} />
            <Text style={s.streakText}>{streak > 0 ? `${streak} day streak` : 'No streak yet'}</Text>
            {streak > 0 && <Text style={s.streakKeep}>{streak >= 7 ? '🔥 On fire!' : 'Keep going!'}</Text>}
          </Pressable>
          <Pressable style={s.runCheckBtn} onPress={onPress}>
            <Text style={s.runCheckText}>Run check  →</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.scoreRingOuter}>
        <View style={s.scoreRingInner}>
          <Text style={s.scoreValue}>{displayScore}</Text>
          <Text style={s.scoreLabel}>SCORE</Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ── Quick stat card ─────────────────────────────────────────────────────── */
function StatCard({ label, value, color, trend, trendUp, onPress }) {
  const hasTrend   = trend && trend !== '—';
  const trendColor = trendUp ? '#B4781E' : '#2D6A4F';
  return (
    <Pressable style={s.statCard} onPress={onPress}>
      <View style={s.statTopRow}>
        <View style={[s.statDot, { backgroundColor: color }]} />
        {hasTrend && (
          <View style={[s.trendBadge, { backgroundColor: trendColor + '15' }]}>
            <Text style={[s.trendText, { color: trendColor }]}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Ionicons name="information-circle-outline" size={11} color="rgba(28,27,24,0.22)" style={{ marginTop: 3 }} />
    </Pressable>
  );
}

/* ── Hospital card ───────────────────────────────────────────────────────── */
function HospitalCard({ onPress }) {
  return (
    <Pressable style={s.hospitalCard} onPress={onPress}>
      <View style={s.hospitalAccent} />
      <View style={s.hospitalIconWrap}>
        <Ionicons name="location" size={18} color="#C85A3A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.hospitalTitle}>Find hospitals</Text>
        <Text style={s.hospitalSub}>Nearby emergency & clinics</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </Pressable>
  );
}

/* ── Diet Plans card ─────────────────────────────────────────────────────── */
function DietPlansCard({ onPress }) {
  return (
    <Pressable style={s.dietCard} onPress={onPress}>
      <View style={s.dietAccent} />
      <View style={s.dietIconWrap}>
        <Ionicons name="nutrition" size={18} color="#2D6A4F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.dietTitle}>Your Plans</Text>
        <Text style={s.dietSub}>Saved personalised diet plans</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </Pressable>
  );
}

/* ── Recent record row ───────────────────────────────────────────────────── */
function RecentRow({ item, isLast }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const onIn   = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut  = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  const color = TYPE_COLOR[item.type] || COLORS.purple;
  const icon  = TYPE_ICON[item.type]  || 'pulse-outline';
  const label = TYPE_LABEL[item.type] || 'Assessment';
  const pct   = item.type === 'ckd'
    ? `${((item.confidence || 0) * 100).toFixed(0)}%`
    : item.type === 'mri'
    ? (item.risk_analysis?.tumor_class || item.tumor_class || 'Analyzed')
    : `${((item.probability || 0) * 100).toFixed(0)}%`;
  const subLabel = item.type === 'mri' ? 'MRI scan' : item.type === 'ckd' ? '25 biomarkers' : '8 questions';
  const ago   = timeAgo(item.created_at);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, !isLast && s.rowDivider]}>
      <Pressable style={s.recentRow} onPressIn={onIn} onPressOut={onOut}>
        <View style={[s.recentIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.recentLabel}>{label}</Text>
          <Text style={s.recentDate}>{ago} · {subLabel}</Text>
        </View>
        <View style={[s.resultBadge, { backgroundColor: color + '12' }]}>
          <Text style={[s.resultText, { color }]}>{pct}</Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function HomeScreen({ navigation }) {
  const { user, refreshUser, isGuest, logout } = useAuth();
  const insets = useSafeAreaInsets();

  /* Redirect guests to sign-in when they tap a locked feature */
  const requireAuth = (action) => {
    if (isGuest) {
      Alert.alert(
        'Members Only',
        'Sign in or create a free account to access health assessments, AI tools, and your personal history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In / Register', onPress: logout },
        ]
      );
      return;
    }
    action();
  };
  const [refreshing,   setRefreshing]  = useState(false);
  const [records,      setRecords]     = useState([]);
  const [liveStats,    setLiveStats]   = useState({ dProb: null, hProb: null, ckdConf: null, dPrev: null, hPrev: null, ckdPrev: null });
  const [streak,       setStreak]      = useState(0);
  const [healthScore,  setHealthScore] = useState(null);
  const [modal,        setModal]       = useState(null); // { title, icon, iconColor, rows, cta, onCTA }

  const headerAnim = useRef(new Animated.Value(0)).current;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rawName = (user?.full_name || user?.email || 'there').split('@')[0].split(' ')[0];
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  const loadRecords = useCallback(async () => {
    try {
      const [da, ha, ckd, mri] = await Promise.allSettled([
        api.getMyAssessments(10),
        api.getMyHeartAssessments(10),
        api.getMyCKDAssessments(10).catch(() => []),
        api.getMyBrainMriAnalyses(5).catch(() => []),
      ]);
      const get = (r, type) => {
        const arr = r.status === 'fulfilled'
          ? (Array.isArray(r.value) ? r.value : (r.value?.assessments ?? []))
          : [];
        return arr.map((a) => ({ ...a, type }));
      };
      const dArr   = get(da,  'diabetes');
      const hArr   = get(ha,  'heart');
      const ckdArr = get(ckd, 'ckd');
      const mriArr = get(mri, 'mri');

      // Live stat values (most recent)
      const dProb   = dArr[0]?.probability   ?? null;
      const hProb   = hArr[0]?.probability   ?? null;
      const ckdConf = ckdArr[0]?.confidence  ?? null;
      const dPrev   = dArr[1]?.probability   ?? null;
      const hPrev   = hArr[1]?.probability   ?? null;
      const ckdPrev = ckdArr[1]?.confidence  ?? null;
      setLiveStats({ dProb, hProb, ckdConf, dPrev, hPrev, ckdPrev });

      // Health score
      setHealthScore(calcHealthScore(dProb, hProb, ckdConf));

      // Streak
      const all = [...dArr, ...hArr, ...ckdArr, ...mriArr];
      setStreak(calcStreak(all));

      // Recent list
      all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setRecords(all.slice(0, 3));
    } catch {}
  }, []);

  // Animate header once on mount
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Reload stats every time this screen comes into focus (e.g. after taking a test)
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadRecords()]);
    setRefreshing(false);
  }, [refreshUser, loadRecords]);

  const headerOpacity   = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={s.root}>
      <InfoModal
        visible={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title}
        icon={modal?.icon}
        iconColor={modal?.iconColor}
        prob={modal?.prob}
        riskLevel={modal?.riskLevel}
        riskLabel={modal?.riskLabelText}
        description={modal?.description}
        questionCount={modal?.questionCount}
        circleLabel={modal?.circleLabel}
        circleValue={modal?.circleValue}
        hideBar={modal?.hideBar}
        gridLabels={modal?.gridLabels}
        leftGridVal={modal?.leftGridVal}
        primaryLabel={modal?.primaryLabel}
        onRetake={() => modal?.onRetake?.()}
        onAskAI={() => modal?.onAskAI?.()}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.purple} />
        }
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <Animated.View style={[s.headerRow, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetBase}>{greeting},</Text>
            <Text style={s.greetName}>{displayName}.</Text>
          </View>
          <View style={s.headerRight}>
            <Pressable
              style={s.notifBtn}
              onPress={() => Alert.alert('Notifications', 'Push notifications coming soon!', [{ text: 'OK' }])}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
            </Pressable>
            <UserAvatar
              name={displayName}
              onPress={() => navigation.getParent()?.getParent()?.openDrawer?.()}
            />
          </View>
        </Animated.View>

        {/* ── Hero card ─────────────────────────────────────────────── */}
        <HeroCard
          score={healthScore}
          streak={streak}
          onPress={() => requireAuth(() => navigation.navigate('Assessment'))}
          onStreakPress={() => {
            if (isGuest) return;
            const streakColor = streak >= 7 ? '#C85A3A' : '#B4781E';
            setModal({
              title: streak > 0 ? `${streak}-Day Streak` : 'How Streaks Work',
              icon: 'flame',
              iconColor: streakColor,
              prob: null,
              riskLevel: 0,
              riskLabelText: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} active` : 'No streak yet',
              description: streak > 0
                ? `You've checked in ${streak} day${streak > 1 ? 's' : ''} in a row. Complete any assessment daily to keep it going.`
                : 'Complete any assessment today to start your streak. Missing a day resets it to zero.',
              circleValue: streak,
              circleLabel: 'DAYS',
              hideBar: true,
              questionCount: `${streak} / 30`,
              gridLabels: ['DAYS ACTIVE', 'DAY GOAL'],
              leftGridVal: String(streak),
              primaryLabel: 'Start Assessment →',
              onRetake: () => requireAuth(() => navigation.navigate('Assessment')),
            });
          }}
        />

        {/* ── Quick stats ───────────────────────────────────────────── */}
        <View style={s.statsRow}>
          {/* Diabetes */}
          {(() => {
            const { dProb, dPrev } = liveStats;
            const val      = dProb != null ? riskLabel(dProb) : '—';
            const color    = riskColor(dProb, FEATURE_COLORS.Assessment);
            const trend    = trendStr(dProb, dPrev);
            const trendUp  = dProb != null && dPrev != null && dProb > dPrev;
            const lvl      = dProb == null ? 0 : dProb < 0.3 ? 0 : dProb < 0.6 ? 1 : 2;
            return (
              <StatCard label="Diabetes" value={val} color={color} trend={trend} trendUp={trendUp}
                onPress={() => setModal({
                  title: 'Diabetes Risk', icon: 'pulse', iconColor: FEATURE_COLORS.Assessment,
                  prob: dProb, riskLevel: lvl, riskLabelText: val === '—' ? 'No data' : `${val} risk`,
                  description: lvl === 0 ? 'Few risk markers. Keep up your healthy habits.' : lvl === 1 ? 'Some risk factors present. Consider a check-up.' : 'Significant markers detected. Seek medical advice.',
                  questionCount: '8 / 8',
                  onRetake: () => requireAuth(() => navigation.navigate('Assessment')),
                  onAskAI: () => requireAuth(() => navigation.navigate('ChatTab', { screen: 'Chat', params: { context: `I just checked my diabetes risk. Result: ${val === '—' ? 'no data yet' : `${val} risk (${dProb != null ? Math.round(dProb*100)+'%' : '—'} probability)`}. Can you explain what this means and give me personalized advice?` } })),
                })}
              />
            );
          })()}
          {/* Heart */}
          {(() => {
            const { hProb, hPrev } = liveStats;
            const val      = hProb != null ? `${Math.round(hProb * 100)}%` : '—';
            const color    = riskColor(hProb, FEATURE_COLORS.Heart);
            const trend    = trendStr(hProb, hPrev);
            const trendUp  = hProb != null && hPrev != null && hProb > hPrev;
            const lvl      = hProb == null ? 0 : hProb < 0.3 ? 0 : hProb < 0.6 ? 1 : 2;
            const lbl      = hProb == null ? 'No data' : hProb < 0.3 ? 'Low risk' : hProb < 0.6 ? 'Medium risk' : 'High risk';
            return (
              <StatCard label="Heart" value={val} color={color} trend={trend} trendUp={trendUp}
                onPress={() => setModal({
                  title: 'Heart Risk', icon: 'heart', iconColor: FEATURE_COLORS.Heart,
                  prob: hProb, riskLevel: lvl, riskLabelText: lbl,
                  description: lvl === 0 ? 'Healthy indicators. Stay active and maintain a balanced diet.' : lvl === 1 ? 'Moderate risk. Monitor blood pressure and cholesterol.' : 'Elevated risk. Consult a cardiologist.',
                  questionCount: '8 / 8',
                  onRetake: () => requireAuth(() => navigation.navigate('Heart')),
                  onAskAI: () => requireAuth(() => navigation.navigate('ChatTab', { screen: 'Chat', params: { context: `I just checked my heart disease risk. Result: ${lbl} (${hProb != null ? Math.round(hProb*100)+'%' : '—'} probability). Can you explain what this means and give me personalized advice?` } })),
                })}
              />
            );
          })()}
          {/* Kidney */}
          {(() => {
            const { ckdConf, ckdPrev } = liveStats;
            const val      = ckdConf != null ? riskLabel(ckdConf) : '—';
            const color    = riskColor(ckdConf, FEATURE_COLORS.CKD);
            const trend    = trendStr(ckdConf, ckdPrev);
            const trendUp  = ckdConf != null && ckdPrev != null && ckdConf > ckdPrev;
            const lvl      = ckdConf == null ? 0 : ckdConf < 0.3 ? 0 : ckdConf < 0.6 ? 1 : 2;
            return (
              <StatCard label="Kidney" value={val} color={color} trend={trend} trendUp={trendUp}
                onPress={() => setModal({
                  title: 'Kidney (CKD) Risk', icon: 'water', iconColor: FEATURE_COLORS.CKD,
                  prob: ckdConf, riskLevel: lvl, riskLabelText: val === '—' ? 'No data' : `${val} risk`,
                  description: lvl === 0 ? 'Kidney function appears normal. Stay hydrated.' : lvl === 1 ? 'Moderate indicators. Reduce processed food.' : 'Potential CKD markers. Consult a nephrologist.',
                  questionCount: '25 biomarkers',
                  onRetake: () => requireAuth(() => navigation.navigate('CKD')),
                  onAskAI: () => requireAuth(() => navigation.navigate('ChatTab', { screen: 'Chat', params: { context: `I just checked my kidney (CKD) risk. Result: ${val === '—' ? 'no data yet' : `${val} risk (${ckdConf != null ? Math.round(ckdConf*100)+'%' : '—'} confidence)`}. Can you explain what this means and give me personalized advice?` } })),
                })}
              />
            );
          })()}
        </View>

        {/* ── Hospital card ─────────────────────────────────────────── */}
        <HospitalCard onPress={() => navigation.navigate('Hospitals')} />

        {/* ── Diet Plans card ───────────────────────────────────────── */}
        <DietPlansCard onPress={() => requireAuth(() => navigation.navigate('MyDietPlans'))} />

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <View style={[s.sectionHeader, { marginTop: SPACING.xl }]}>
          <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
          <Pressable style={s.seeAllBtn} onPress={() => requireAuth(() => navigation.navigate('FeaturesTab'))}>
            <Text style={s.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.purple} />
          </Pressable>
        </View>

        <View style={s.grid}>
          {QUICK_TOOLS.map((tool, i) => (
            <FeatureCard
              key={tool.key}
              tool={tool}
              index={i}
              style={s.gridCard}
              onPress={() => requireAuth(() => navigation.navigate(tool.key))}
            />
          ))}
        </View>

        {/* ── Recent activity ───────────────────────────────────────── */}
        <View style={[s.sectionHeader, { marginTop: SPACING.xxl }]}>
          <Text style={s.sectionLabel}>RECENT</Text>
          <Pressable style={s.seeAllBtn} onPress={() => requireAuth(() => navigation.navigate('HistoryTab'))}>
            <Text style={s.seeAllText}>History</Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.purple} />
          </Pressable>
        </View>

        <View style={s.recentCard}>
          {records.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No assessments yet</Text>
              <Pressable style={s.emptyBtn} onPress={() => requireAuth(() => navigation.navigate('Assessment'))}>
                <Text style={s.emptyBtnText}>Start first check</Text>
              </Pressable>
            </View>
          ) : (
            records.map((item, i) => (
              <RecentRow key={`${item.type}-${item.id}`} item={item} isLast={i === records.length - 1} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: GRID_PAD },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  greetBase: {
    fontSize: FONT.h1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: '#1C1B18',
    letterSpacing: -0.3,
  },
  greetName: {
    fontSize: FONT.h1,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: '#2D6A4F',
    fontWeight: FONT.bold,
    letterSpacing: -0.3,
  },

  /* Notification bell */
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(28,27,24,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  /* Avatar */
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  avatarText: {
    fontSize: FONT.sm,
    fontWeight: FONT.bold,
    color: '#F7F4ED',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  avatarDot: {
    position: 'absolute',
    top: 0, right: 0,
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#52B788',
    borderWidth: 2,
    borderColor: '#F7F4ED',
  },

  /* Hero card */
  heroCard: {
    backgroundColor: '#2D6A4F',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    minHeight: 140,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlob1: {
    position: 'absolute',
    top: -24, right: -24,
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -16, left: -12,
    width: 70, height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(247,244,237,0.6)',
    letterSpacing: 0.12 * 10,
    marginBottom: 4,
  },
  heroScore: {
    fontSize: 44,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: '#F7F4ED',
    lineHeight: 50,
  },
  heroScoreSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroScoreSubText: {
    fontSize: 11,
    color: 'rgba(247,244,237,0.6)',
    fontWeight: FONT.medium,
  },
  heroDivider: {
    height: 0.5,
    backgroundColor: 'rgba(247,244,237,0.15)',
    marginVertical: 12,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  streakText: {
    fontSize: 11,
    fontWeight: FONT.bold,
    color: 'rgba(247,244,237,0.85)',
  },
  streakKeep: {
    fontSize: 10,
    color: 'rgba(247,244,237,0.5)',
  },
  runCheckBtn: {
    backgroundColor: 'rgba(247,244,237,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(247,244,237,0.2)',
  },
  runCheckText: {
    fontSize: 11,
    color: 'rgba(247,244,237,0.85)',
    fontWeight: FONT.semibold,
  },

  /* Score ring */
  scoreRingOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: 'rgba(247,244,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 12,
    flexShrink: 0,
  },
  scoreRingInner: { alignItems: 'center' },
  scoreValue: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: '#F7F4ED',
    lineHeight: 22,
  },
  scoreLabel: {
    fontSize: 7,
    color: 'rgba(247,244,237,0.55)',
    fontWeight: FONT.bold,
    letterSpacing: 0.5,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  trendBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  trendText: { fontSize: 8, fontWeight: FONT.bold },
  statValue: {
    fontSize: FONT.xl,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: FONT.medium,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(28,27,24,0.4)',
    letterSpacing: 0.12 * 9,
    textTransform: 'uppercase',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: FONT.sm,
    color: COLORS.purple,
    fontWeight: FONT.semibold,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: SPACING.md,
  },
  gridCard: { width: '48.5%' },

  /* Hospital card */
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hospitalAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#C85A3A',
  },
  hospitalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(200,90,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hospitalTitle: {
    fontSize: 14,
    fontWeight: FONT.semibold,
    color: '#1C1B18',
  },
  hospitalSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* Diet Plans card */
  dietCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dietAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#2D6A4F',
  },
  dietIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(45,106,79,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietTitle: {
    fontSize: 14,
    fontWeight: FONT.semibold,
    color: '#1C1B18',
  },
  dietSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  /* Recent card */
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(28,27,24,0.06)',
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentLabel: {
    fontSize: 13,
    fontWeight: FONT.semibold,
    color: '#1C1B18',
  },
  recentDate: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  resultBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultText: {
    fontSize: FONT.xs,
    fontWeight: FONT.bold,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  emptyText: {
    fontSize: FONT.md,
    color: COLORS.textSecondary,
  },
  emptyBtn: {
    backgroundColor: 'rgba(45,106,79,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderWidth: 0.5,
    borderColor: 'rgba(45,106,79,0.25)',
  },
  emptyBtnText: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: '#2D6A4F',
  },
});

/* ── Info Modal styles ───────────────────────────────────────────────────── */
const im = StyleSheet.create({
  /* Centered backdrop */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,27,24,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  /* Card */
  card: {
    backgroundColor: '#F7F4ED',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  /* Close button */
  closeBtn: {
    position: 'absolute',
    top: 14, right: 14,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(28,27,24,0.07)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },

  /* Header row */
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 20,
    paddingRight: 30,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1, fontSize: FONT.lg,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontWeight: FONT.bold,
    color: '#1C1B18', letterSpacing: -0.3,
  },

  /* Score circle */
  circleWrap: { alignItems: 'center', marginBottom: 20 },
  circle: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  circleVal: {
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontWeight: '700',
    lineHeight: 40,
  },
  circleUnit: {
    fontSize: 9, fontWeight: '700',
    color: 'rgba(28,27,24,0.35)',
    letterSpacing: 1.2,
  },
  riskTitle: {
    fontSize: FONT.md, fontWeight: FONT.bold,
    marginBottom: 4,
  },
  riskDesc: {
    fontSize: FONT.sm,
    color: 'rgba(28,27,24,0.5)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  /* Risk bar */
  barRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  barSeg: {
    flex: 1, height: 6, borderRadius: 3,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  barLabel: {
    fontSize: 9,
    color: 'rgba(28,27,24,0.4)',
    fontWeight: FONT.medium,
  },

  /* Detail grid */
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  gridCell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  gridCellRight: {},
  gridLabel: {
    fontSize: 9, fontWeight: '700',
    color: 'rgba(28,27,24,0.35)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  gridVal: {
    fontSize: FONT.lg,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontWeight: FONT.bold,
    color: '#1C1B18',
  },

  /* Action buttons row */
  actions: { flexDirection: 'row', gap: 8 },
  btnGhost: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5, borderColor: 'rgba(28,27,24,0.1)',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  btnGhostText: {
    fontSize: FONT.sm, fontWeight: FONT.semibold,
    color: 'rgba(28,27,24,0.55)',
  },
  btnAskAI: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13,
    backgroundColor: '#2D6A4F',
    shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  btnAskAIText: {
    fontSize: FONT.sm, fontWeight: FONT.bold,
    color: '#F7F4ED',
  },
});
