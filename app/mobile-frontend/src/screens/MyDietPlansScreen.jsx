/**
 * MyDietPlansScreen — Clinical Calm · Elevated
 * Shows all saved diet plans with tab filter, stat strip, and plan cards.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  cream:     '#F5F1E8',
  cream2:    '#EFE9DC',
  cream3:    '#FBF7EC',
  ink:       '#1A1A1A',
  inkSub:    '#6B6A63',
  inkMute:   '#9A9890',
  sage:      '#234B3E',
  sageSoft:  '#E3EAE4',
  sageDot:   '#4A7A66',
  peachDeep: '#C97A4F',
  heart:     '#C95D5D',
  amber:     '#C9A875',
  line:      '#E2DCCC',
};

const GOAL_OPTIONS = [
  { val: 'diabetes_prevention',  label: 'Diabetes prevention'  },
  { val: 'blood_sugar_control',  label: 'Blood sugar control'  },
  { val: 'weight_loss',          label: 'Weight loss'          },
  { val: 'weight_gain',          label: 'Weight gain'          },
  { val: 'maintenance',          label: 'Maintenance'          },
  { val: 'gestational_diabetes', label: 'Gestational diabetes' },
];

function goalLabelFn(goal) {
  if (!goal) return 'Diet Plan';
  const found = GOAL_OPTIONS.find(g => g.val === goal);
  if (found) return found.label;
  return goal.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function goalAccentColor(goal) {
  if (!goal) return T.sageDot;
  if (goal.includes('weight_loss')) return T.heart;
  if (goal.includes('weight_gain')) return T.amber;
  if (goal.includes('blood_sugar')) return T.peachDeep;
  return T.sageDot;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  PLAN CARD                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function PlanCard({ item, onView, onDelete }) {
  const accent  = goalAccentColor(item.goal);
  const goal    = goalLabelFn(item.goal);
  const date    = item.created_at
    ? new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const calText = item.payload?.nutritional_info?.daily_calories
    ? `${item.payload.nutritional_info.daily_calories} kcal`
    : '— kcal';
  const daysText = item.payload?.meal_plan
    ? `${Object.keys(item.payload.meal_plan).length || 7} days`
    : '7 days';

  return (
    <Pressable style={pc.card} onPress={onView}>
      <View style={[pc.stripe, { backgroundColor: accent }]} />
      <View style={pc.inner}>
        <View style={pc.topRow}>
          <View style={[pc.tag, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
            <View style={[pc.tagDot, { backgroundColor: accent }]} />
            <Text style={[pc.tagText, { color: accent }]}>
              {item.goal?.includes('prevention') ? 'Prevention'
                : item.goal?.includes('loss') ? 'Weight loss'
                : item.goal?.includes('gain') ? 'Weight gain'
                : 'Health'}
            </Text>
          </View>
          <Text style={pc.date}>{date}</Text>
        </View>

        <Text style={pc.title} numberOfLines={1}>{goal}</Text>
        {item.overview ? <Text style={pc.desc} numberOfLines={2}>{item.overview}</Text> : null}

        <View style={pc.metaRow}>
          <Text style={pc.kcal}>{calText}</Text>
          <Text style={pc.sep}>·</Text>
          <Text style={pc.days}>{daysText}</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={pc.trashBtn} onPress={(e) => { e.stopPropagation?.(); onDelete(); }} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={T.inkMute} />
          </Pressable>
          <Pressable style={pc.viewBtn} onPress={onView}>
            <Text style={pc.viewBtnText}>View</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
const pc = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18,
    borderWidth: 0.5, borderColor: T.line, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  stripe: { width: 3, flexShrink: 0 },
  inner:  { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
    borderWidth: 0.5,
  },
  tagDot:  { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 10.5, fontWeight: '700' },
  date:    { fontSize: 10.5, color: T.inkMute, fontStyle: 'italic' },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18, fontWeight: '400', color: T.ink, letterSpacing: -0.3, marginBottom: 4,
  },
  desc:    { fontSize: 12, color: T.inkMute, lineHeight: 17, marginBottom: 10 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.line, borderStyle: 'dashed',
  },
  kcal: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 13, fontWeight: '700', color: T.sage,
  },
  sep:  { fontSize: 13, color: T.inkMute },
  days: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 13, fontWeight: '700', color: T.sage,
  },
  trashBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: T.cream3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: T.line,
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.sage, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 9,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 2,
  },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  GENERATE NEW CARD                                                          */
/* ────────────────────────────────────────────────────────────────────────── */
function GenerateNewCard({ onPress }) {
  return (
    <Pressable style={gnc.card} onPress={onPress}>
      <LinearGradient
        colors={[T.cream3, T.cream, T.cream2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={gnc.iconWrap}>
        <Ionicons name="add" size={20} color={T.sage} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={gnc.title}>Generate a new plan</Text>
        <Text style={gnc.sub}>Tailored to your latest assessment</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={T.sage} />
    </Pressable>
  );
}
const gnc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: T.line,
    overflow: 'hidden', position: 'relative',
    borderStyle: 'dashed',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  title: { fontSize: 14, fontWeight: '700', color: T.ink, marginBottom: 2 },
  sub:   { fontSize: 11.5, color: T.inkMute },
});

/* ════════════════════════════════════════════════════════════════════════════
   Screen
════════════════════════════════════════════════════════════════════════════ */
export default function MyDietPlansScreen({ navigation }) {
  const { user }   = useAuth();
  const insets     = useSafeAreaInsets();

  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await api.getMyDietPlans(50);
      setPlans(Array.isArray(list) ? list : []);
    } catch {}
    finally { setLoading(false); }
  };

  useFocusEffect(
    React.useCallback(() => { load(); }, [user?.id])
  );

  const handleDelete = async (item) => {
    const id = Number(item.id ?? item.diet_plan_id ?? 0);
    if (!id || isNaN(id)) return;
    const doDelete = async () => {
      const prev = [...plans];
      setPlans(p => p.filter(x => Number(x.id ?? x.diet_plan_id) !== id));
      try { await api.deleteDietPlan(id); }
      catch { setPlans(prev); }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this plan? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Plan', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleView = (item) => {
    navigation.navigate('DietPlan', { viewPlan: item.payload || item });
  };

  const filtered = plans;

  const lastDate = plans[0]?.created_at
    ? new Date(plans[0].created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Heading ── */}
        <Text style={s.eyebrow}>DIET PLANS</Text>
        <Text style={s.h1}>Your <Text style={s.h1Accent}>plans.</Text></Text>
        {lastDate ? (
          <Text style={s.headingSub}>
            {plans.length} saved plan{plans.length !== 1 ? 's' : ''} · last generated {lastDate}
          </Text>
        ) : null}

        {/* ── Stat strip ── */}
        <View style={s.statStrip}>
          <View style={s.statCell}>
            <Text style={s.statVal}>{String(plans.length)}</Text>
            <Text style={s.statLabel}>PLANS</Text>
          </View>
        </View>

        {/* ── Loading ── */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={T.sage} />
          </View>
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="nutrition-outline" size={28} color={T.inkMute} />
            </View>
            <Text style={s.emptyTitle}>No plans yet</Text>
            <Text style={s.emptySub}>Generate your first personalised diet plan below.</Text>
          </View>
        ) : (
          /* ── Plan cards ── */
          filtered.map(item => (
            <PlanCard
              key={item.id ?? item.diet_plan_id}
              item={item}
              onView={() => handleView(item)}
              onDelete={() => handleDelete(item)}
            />
          ))
        )}

        {/* ── Generate new CTA ── */}
        {!loading && (
          <GenerateNewCard onPress={() => navigation.navigate('DietPlan')} />
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { paddingHorizontal: 20 },

  eyebrow: { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 },
  h1: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400', fontSize: 32, color: T.ink,
    letterSpacing: -0.8, lineHeight: 38, marginBottom: 8,
  },
  h1Accent:  { color: T.sage, fontStyle: 'italic' },
  headingSub:{ fontSize: 13, color: T.inkMute, marginBottom: 16 },

  /* Stat strip */
  statStrip: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  statCell: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 0.5, borderColor: T.line,
    alignItems: 'center', minWidth: 70,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statVal:   { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 22, fontWeight: '700', color: T.sage },
  statLabel: { fontSize: 9, fontWeight: '700', color: T.inkMute, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 2 },

  /* Loading / empty */
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyWrap:   { paddingVertical: 48, alignItems: 'center', gap: 10 },
  emptyIcon:   {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: T.sageSoft, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: T.ink },
  emptySub:    { fontSize: 13, color: T.inkMute, textAlign: 'center', lineHeight: 19, paddingHorizontal: 24 },
});
