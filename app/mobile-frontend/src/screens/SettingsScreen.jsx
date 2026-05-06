/**
 * SettingsScreen — Profile tab
 * Avatar · Stats · Account rows · Preferences · Support · Sign out
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, Animated, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { COLORS, RADIUS, FONT, SPACING } from '../config/theme';

/* ── helpers ────────────────────────────────────────────────────────────── */
function calcStreak(allRecords) {
  if (!allRecords.length) return 0;
  const days = new Set(
    allRecords.filter(r => r.created_at).map(r => new Date(r.created_at).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function calcHealthScore(dProb, hProb, ckdConf) {
  const scores = [];
  if (dProb   != null) scores.push((1 - dProb)   * 100);
  if (hProb   != null) scores.push((1 - hProb)   * 100);
  if (ckdConf != null) scores.push((1 - ckdConf) * 100);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/* ── Row component ────────────────────────────────────────────────────────── */
function SettingRow({ icon, iconColor, label, desc, right, onPress, isLast }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, !isLast && st.rowBorder]}>
      <Pressable style={st.row} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <View style={[st.rowIcon, { backgroundColor: iconColor + '1A', borderColor: iconColor + '35' }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <View style={st.rowContent}>
          <Text style={st.rowTitle}>{label}</Text>
          {desc ? <Text style={st.rowDesc}>{desc}</Text> : null}
        </View>
        {right !== undefined ? right : (
          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ── Section card ─────────────────────────────────────────────────────────── */
function SectionCard({ label, children }) {
  return (
    <View style={st.section}>
      <Text style={st.sectionLabel}>{label.toUpperCase()}</Text>
      <View style={st.sectionCard}>
        {children}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function SettingsScreen({ navigation }) {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout }             = useAuth();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({ assessments: '—', streak: '—', score: '—' });

  const loadStats = useCallback(async () => {
    try {
      const [d, h, ckd, brain] = await Promise.all([
        api.getMyAssessments(100).catch(() => []),
        api.getMyHeartAssessments(100).catch(() => []),
        api.getMyCKDAssessments(100).catch(() => []),
        api.getMyBrainMriAnalyses(100).catch(() => []),
      ]);
      const dArr   = Array.isArray(d)     ? d     : (d?.assessments ?? []);
      const hArr   = Array.isArray(h)     ? h     : (h?.assessments ?? []);
      const ckdArr = Array.isArray(ckd)   ? ckd   : [];
      const mriArr = Array.isArray(brain) ? brain : [];

      const total = dArr.length + hArr.length + ckdArr.length;

      // streak across all record types
      const all = [
        ...dArr.map(a => ({ ...a, type: 'diabetes' })),
        ...hArr.map(a => ({ ...a, type: 'heart' })),
        ...ckdArr.map(a => ({ ...a, type: 'ckd' })),
        ...mriArr.map(a => ({ ...a, type: 'mri' })),
      ];
      const streak = calcStreak(all);

      // health score from most recent of each type
      const dProb   = dArr[0]?.probability ?? null;
      const hProb   = hArr[0]?.probability ?? null;
      const ckdConf = ckdArr[0]?.confidence ?? null;
      const score   = calcHealthScore(dProb, hProb, ckdConf);

      setStats({
        assessments: String(total),
        streak:      streak > 0 ? `${streak}d` : '0d',
        score:       score != null ? String(score) : '—',
      });
    } catch {}
  }, []);

  // Refresh every time the screen comes into focus
  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const toggleLanguage = async () => {
    const next = language === 'turkish' ? 'english' : 'turkish';
    setLanguage(next);
    if (user) { try { await api.updateProfile({ preferred_language: next }); } catch {} }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Sign out?')) logout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const displayName = (user?.full_name || user?.email || '').trim() || 'User';
  const initials    = displayName.substring(0, 2).toUpperCase().replace('@', 'U');
  const firstName   = displayName.split(' ')[0].split('@')[0];

  return (
    <View style={st.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile header ── */}
        <View style={st.profileHeader}>
          {/* Avatar */}
          <View style={st.avatarCircle}>
            <Text style={st.avatarText}>{initials}</Text>
          </View>

          <Text style={st.profileName}>{firstName}</Text>
          <Text style={st.profileEmail}>{user?.email || ''}</Text>

          {/* Free plan pill */}
          <View style={st.planPill}>
            <View style={st.planDot} />
            <Text style={st.planText}>Free plan</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <Text style={[st.statValue, { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' }]}>{stats.assessments}</Text>
            <Text style={st.statKey}>Assessments</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Text style={[st.statValue, { color: '#C85A3A', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' }]}>{stats.streak}</Text>
            <Text style={st.statKey}>Streak</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Text style={[st.statValue, { color: '#2D6A4F', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' }]}>{stats.score}</Text>
            <Text style={st.statKey}>Score</Text>
          </View>
        </View>

        {/* ── Account section ── */}
        <SectionCard label="Account">
          <SettingRow
            icon="person-outline" iconColor={COLORS.blue}
            label="Edit Profile" desc="Update your name and details"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingRow
            icon="lock-closed-outline" iconColor={COLORS.purple}
            label={t('settings.changePassword')} desc={t('settings.changePasswordDesc')}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <SettingRow
            icon="shield-checkmark-outline" iconColor={COLORS.cyan}
            label="Verify Report" desc="Scan QR to verify a signed report"
            onPress={() => navigation.navigate('VerifyReport')}
            isLast
          />
        </SectionCard>

        {/* ── Preferences section ── */}
        <SectionCard label="Preferences">
          <SettingRow
            icon="globe-outline" iconColor={COLORS.blue}
            label={t('settings.language')}
            desc={language === 'turkish' ? 'Türkçe' : 'English'}
            right={
              <View style={st.langBadge}>
                <Text style={st.langBadgeText}>{language === 'turkish' ? 'TR' : 'EN'}</Text>
              </View>
            }
            onPress={toggleLanguage} isLast
          />
        </SectionCard>

        {/* ── Support section ── */}
        <SectionCard label="Support">
          <SettingRow
            icon="help-circle-outline" iconColor={COLORS.cyan}
            label="Help Center" desc="FAQs and support"
            onPress={() => navigation.navigate('HelpCenter')}
            isLast
          />
        </SectionCard>

        {/* ── Sign out ── */}
        <Pressable style={st.signOutBtn} onPress={handleSignOut}>
          <View style={st.signOutIcon}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          </View>
          <Text style={st.signOutText}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.red + '60'} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: SPACING.lg },

  /* Profile header */
  profileHeader: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    fontSize: FONT.xl,
    fontWeight: FONT.bold,
    color: '#F7F4ED',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  profileName: {
    fontSize: FONT.xxl,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.purple + '1A',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: COLORS.purple + '40',
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.purple,
  },
  planText: {
    fontSize: FONT.xs,
    fontWeight: FONT.semibold,
    color: COLORS.purple,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xxl,
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
  },
  statValue: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
  },
  statKey: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: FONT.medium,
  },

  /* Section */
  section:      { marginBottom: SPACING.xl },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONT.bold,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#1C1B18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: FONT.md,
    fontWeight: FONT.semibold,
    color: COLORS.textPrimary,
  },
  rowDesc: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  langBadge: {
    backgroundColor: COLORS.blue + '1A',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: COLORS.blue + '40',
  },
  langBadgeText: {
    fontSize: FONT.xs,
    fontWeight: FONT.bold,
    color: COLORS.blue,
  },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.red + '0F',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0.5,
    borderColor: COLORS.red + '25',
    marginBottom: SPACING.xxl,
  },
  signOutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.red + '14',
    borderWidth: 0.5,
    borderColor: COLORS.red + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    flex: 1,
    fontSize: FONT.md,
    fontWeight: FONT.bold,
    color: COLORS.red,
  },
});
