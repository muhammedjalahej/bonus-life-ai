/**
 * DietPlanScreen — Clinical Calm · Elevated
 * Section cards · Metric pills · Chip selectors · Live summary · Premium CTA · Saved plan cards
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Share, Pressable, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RADIUS } from '../config/theme';

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
  peachSoft: '#F7E3D4',
  peachDeep: '#C97A4F',
  heart:     '#C95D5D',
  amber:     '#C9A875',
  line:      '#E2DCCC',
};

/* ── Options ─────────────────────────────────────────────────────────────── */
const DIET_OPTIONS = [
  { val: 'balanced',          label: 'Balanced'          },
  { val: 'vegetarian',        label: 'Vegetarian 🌱'     },
  { val: 'vegan',             label: 'Vegan'             },
  { val: 'mediterranean',     label: 'Mediterranean'     },
  { val: 'low_carb',          label: 'Low carb'          },
  { val: 'diabetic_friendly', label: 'Diabetic-friendly' },
];
const ACTIVITY_OPTIONS = [
  { val: 'sedentary',    label: 'Sedentary' },
  { val: 'light',        label: 'Light'     },
  { val: 'moderate',     label: 'Moderate'  },
  { val: 'active',       label: 'Active'    },
  { val: 'very_active',  label: 'Very active' },
];
const GOAL_OPTIONS = [
  { val: 'diabetes_prevention',  label: 'Diabetes prevention'  },
  { val: 'blood_sugar_control',  label: 'Blood sugar control'  },
  { val: 'weight_loss',          label: 'Weight loss'          },
  { val: 'weight_gain',          label: 'Weight gain'          },
  { val: 'maintenance',          label: 'Maintenance'          },
  { val: 'gestational_diabetes', label: 'Gestational diabetes' },
];

const initialForm = {
  age: '', weight: '', height: '', gender: 'male',
  dietaryPreference: 'vegetarian', healthConditions: '',
  activityLevel: 'moderate', goals: 'diabetes_prevention',
  allergies: '', typicalDay: '',
};

/* ── PLAN ACCENT COLORS ──────────────────────────────────────────────────── */
function goalAccentColor(goal) {
  if (!goal) return T.sageDot;
  if (goal.includes('weight_loss')) return T.heart;
  if (goal.includes('weight_gain')) return T.amber;
  if (goal.includes('blood_sugar')) return T.peachDeep;
  return T.sageDot;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SECTION CARD                                                              */
/* ────────────────────────────────────────────────────────────────────────── */
function SectionCard({ iconName, title, tag, tagMuted, children }) {
  return (
    <View style={scard.card}>
      <View style={scard.header}>
        <View style={scard.iconWrap}>
          <Ionicons name={iconName} size={15} color={T.sage} />
        </View>
        <Text style={scard.title}>{title}</Text>
        {tag ? (
          <View style={[scard.tag, tagMuted && scard.tagMuted]}>
            <Text style={[scard.tagText, tagMuted && scard.tagTextMuted]}>{tag}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}
const scard = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 16, marginBottom: 14,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: T.sageSoft, alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 10, fontWeight: '800', color: T.inkMute, textTransform: 'uppercase', letterSpacing: 1.4 },
  tag: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100,
    backgroundColor: T.sageSoft, borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  tagMuted: { backgroundColor: T.cream3, borderColor: T.line },
  tagText:  { fontSize: 10, fontWeight: '700', color: T.sage },
  tagTextMuted: { color: T.inkMute },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  METRIC PILL INPUT                                                         */
/* ────────────────────────────────────────────────────────────────────────── */
function MetricPill({ label, value, onChange, placeholder, unit, keyboard, hasError }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[mp.pill, focused && mp.pillFocus, hasError && mp.pillError]}>
      <Text style={mp.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <TextInput
          style={mp.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.inkMute}
          keyboardType={keyboard || 'decimal-pad'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          outlineWidth={0}
          outlineStyle="none"
        />
        {unit ? <Text style={mp.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}
const mp = StyleSheet.create({
  pill: {
    flex: 1, backgroundColor: T.cream3, borderRadius: 14,
    borderWidth: 0.5, borderColor: T.line,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  pillFocus: { backgroundColor: '#FFFFFF', borderColor: T.sage },
  pillError: { borderColor: T.heart },
  label: { fontSize: 10, fontWeight: '700', color: T.inkMute, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  input: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 22, fontWeight: '700',
    color: T.ink, padding: 0, outlineWidth: 0, outlineStyle: 'none',
    minWidth: 40,
  },
  unit: { fontSize: 12, color: T.inkMute, fontWeight: '500', marginBottom: 2 },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  GENDER SEGMENTED CONTROL                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
function GenderControl({ value, onChange }) {
  return (
    <View style={gc.row}>
      {[
        { val: 'male',   icon: 'male-outline',   label: 'Male'   },
        { val: 'female', icon: 'female-outline',  label: 'Female' },
      ].map(g => (
        <Pressable
          key={g.val}
          style={[gc.btn, value === g.val && gc.btnActive]}
          onPress={() => onChange(g.val)}
        >
          <Ionicons name={g.icon} size={14} color={value === g.val ? '#FFFFFF' : T.inkMute} />
          <Text style={[gc.label, value === g.val && gc.labelActive]}>{g.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const gc = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: T.cream3, borderWidth: 0.5, borderColor: T.line,
  },
  btnActive: {
    backgroundColor: T.sage, borderColor: T.sage,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  label:      { fontSize: 13.5, fontWeight: '600', color: T.inkMute },
  labelActive:{ color: '#FFFFFF', fontWeight: '700' },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  CHIP SELECTOR                                                             */
/* ────────────────────────────────────────────────────────────────────────── */
function ChipSelect({ options, value, onChange, dotColor }) {
  return (
    <View style={cs.wrap}>
      {options.map(opt => {
        const active = value === opt.val;
        return (
          <Pressable
            key={opt.val}
            style={[cs.chip, active && cs.chipActive]}
            onPress={() => onChange(opt.val)}
          >
            {!active && dotColor ? <View style={[cs.dot, { backgroundColor: dotColor }]} /> : null}
            <Text style={[cs.label, active && cs.labelActive]} numberOfLines={1}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const cs = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 100,
    backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  chipActive: {
    backgroundColor: T.sage, borderColor: T.sage,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  dot:   { width: 7, height: 7, borderRadius: 3.5 },
  label: { fontSize: 12.5, fontWeight: '500', color: T.inkSub },
  labelActive: { color: '#FFFFFF', fontWeight: '700' },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  FIELD WITH ICON + HINT                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function IconInput({ icon, placeholder, hint, value, onChange, multiline }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[ii.wrap, focused && ii.wrapFocus]}>
      <Ionicons name={icon} size={16} color={focused ? T.sage : T.inkMute} style={{ marginTop: multiline ? 2 : 0 }} />
      <View style={{ flex: 1 }}>
        <TextInput
          style={[ii.input, multiline && { minHeight: 64, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor={T.inkMute}
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          outlineWidth={0}
          outlineStyle="none"
        />
        {hint ? <Text style={ii.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}
const ii = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.cream3, borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: T.line, marginBottom: 10,
  },
  wrapFocus: { backgroundColor: '#FFFFFF', borderColor: T.sage },
  input:     { flex: 1, fontSize: 14, color: T.ink, padding: 0, outlineWidth: 0, outlineStyle: 'none' },
  hint:      { fontSize: 10, color: T.inkMute, marginTop: 3 },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  FIELD LABEL WITH DOT BULLET                                               */
/* ────────────────────────────────────────────────────────────────────────── */
function FieldLabel({ dot, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: dot }} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '700', color: T.inkSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </Text>
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  LIVE SUMMARY PILL                                                         */
/* ────────────────────────────────────────────────────────────────────────── */
function LiveSummaryPill({ calories, goal }) {
  if (!calories) return null;
  const goalLabel = GOAL_OPTIONS.find(g => g.val === goal)?.label || goal?.replace(/_/g, ' ') || '';
  const note = goal?.includes('diabetic') || goal?.includes('blood_sugar') ? ' · low-GI carbs' : '';
  return (
    <View style={lsp.pill}>
      <LinearGradient
        colors={[T.cream3, '#F0E8D0', T.cream2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={lsp.iconWrap}>
        <Ionicons name="layers-outline" size={15} color={T.sage} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={lsp.prefix}>Your plan will target</Text>
        <Text style={lsp.value}>
          ≈ {calories.toLocaleString()} kcal/day{note}
        </Text>
      </View>
    </View>
  );
}
const lsp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, padding: 14, marginBottom: 14,
    borderWidth: 0.5, borderColor: '#D9CCB0', overflow: 'hidden', position: 'relative',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9, backgroundColor: T.sageSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  prefix: { fontSize: 11, color: T.inkSub, marginBottom: 2 },
  value: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 15, fontWeight: '700', color: T.sage,
  },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  GENERATE CTA                                                              */
/* ────────────────────────────────────────────────────────────────────────── */
function GenerateBtn({ onPress, loading, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => !disabled && Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, damping: 20, stiffness: 300, useNativeDriver: true }).start();

  if (disabled) {
    return (
      <View style={gb.disabled}>
        <Ionicons name="sparkles-outline" size={18} color={T.inkMute} />
        <Text style={gb.disabledText}>Fill in your metrics to generate</Text>
      </View>
    );
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={loading}>
        <LinearGradient
          colors={[T.sageDot, T.sage]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={gb.btn}
        >
          {/* Inset white highlight */}
          <View style={gb.highlight} />
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={gb.label}>Generate my plan</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
const gb = StyleSheet.create({
  disabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 18, paddingVertical: 18,
    backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: T.line,
    /* NO shadow — intentionally looks restrained, not broken */
  },
  disabledText: { fontSize: 15, fontWeight: '600', color: T.inkMute },
  btn: {
    borderRadius: 18, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute', top: 0, left: 16, right: 16, height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1,
  },
  label: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  SAVED PLAN CARD                                                           */
/* ────────────────────────────────────────────────────────────────────────── */
function PlanCard({ item, onLoad, onDelete, goalLabelFn }) {
  const accent  = goalAccentColor(item.goal);
  const goal    = goalLabelFn(item.goal);
  const date    = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const calText = item.payload?.nutritional_info?.daily_calories ? `${item.payload.nutritional_info.daily_calories} kcal` : '— kcal';
  const daysText= item.payload?.meal_plan ? `${Object.keys(item.payload.meal_plan).length || 7} days` : '7 days';

  return (
    <View style={pc.card}>
      {/* Left accent stripe */}
      <View style={[pc.stripe, { backgroundColor: accent }]} />
      <View style={pc.inner}>
        {/* Tag + date row */}
        <View style={pc.topRow}>
          <View style={[pc.tag, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
            <View style={[pc.tagDot, { backgroundColor: accent }]} />
            <Text style={[pc.tagText, { color: accent }]}>
              {item.goal?.includes('prevention') ? 'Prevention' : item.goal?.includes('loss') ? 'Weight loss' : item.goal?.includes('gain') ? 'Weight gain' : 'Health'}
            </Text>
          </View>
          <Text style={pc.date}>{date}</Text>
        </View>

        {/* Title */}
        <Text style={pc.title} numberOfLines={1}>{goal}</Text>

        {/* Description */}
        {item.overview ? <Text style={pc.desc} numberOfLines={2}>{item.overview}</Text> : null}

        {/* Meta + actions row */}
        <View style={pc.metaRow}>
          <Text style={pc.kcal}>{calText}</Text>
          <Text style={pc.sep}>·</Text>
          <Text style={pc.days}>{daysText}</Text>
          <View style={{ flex: 1 }} />
          {/* Trash (cream-3, not red) */}
          <Pressable style={pc.trashBtn} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color={T.inkMute} />
          </Pressable>
          {/* Use again */}
          <Pressable style={pc.useBtn} onPress={onLoad}>
            <Text style={pc.useBtnText}>Use again</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
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
  sep:     { fontSize: 13, color: T.inkMute },
  days: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 13, fontWeight: '700', color: T.sage,
  },
  trashBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: T.cream3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: T.line,
  },
  useBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.sage, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 9,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 2,
  },
  useBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  GENERATE NEW PLAN CARD                                                    */
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

/* ────────────────────────────────────────────────────────────────────────── */
/*  INFO CARD (for results)                                                   */
/* ────────────────────────────────────────────────────────────────────────── */
function InfoCard({ icon, iconColor, title, children }) {
  return (
    <View style={icard.card}>
      <View style={icard.hdr}>
        <View style={[icard.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={icard.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const icard = StyleSheet.create({
  card:    { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap:{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 12, fontWeight: '700', color: T.inkSub, textTransform: 'uppercase', letterSpacing: 0.8 },
});

/* ════════════════════════════════════════════════════════════════════════════
   Screen
════════════════════════════════════════════════════════════════════════════ */
export default function DietPlanScreen({ route }) {
  const { t, language } = useLanguage();
  const { user }        = useAuth();
  const insets          = useSafeAreaInsets();
  const apiLang         = language === 'turkish' ? 'turkish' : 'english';

  const viewPlan = route?.params?.viewPlan ?? null;

  const [formData,   setFormData]   = useState(initialForm);
  const [loading,    setLoading]    = useState(false);
  const [plan,       setPlan]       = useState(viewPlan);
  const [error,      setError]      = useState('');
  const [planSaved,  setPlanSaved]  = useState(!!viewPlan);

  const update = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  /* ── Load profile defaults ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const me = await api.fetchMe();
        if (me?.dietary_preference) update('dietaryPreference', me.dietary_preference);
        if (me?.allergies) update('allergies', me.allergies);
      } catch {}
    })();
  }, [user?.id]);

  /* ── Live calorie calculation (Harris-Benedict) ── */
  const calories = (() => {
    const w = parseFloat(formData.weight), h = parseFloat(formData.height), a = parseFloat(formData.age);
    if (!w || !h || !a || w < 0 || h < 0 || a < 0) return null;
    const bmr = formData.gender === 'male'
      ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
      : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;
    const mul = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    return Math.round(bmr * (mul[formData.activityLevel] || 1.55));
  })();

  const isNeg = v => v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) < 0;
  const valid  = formData.age && formData.weight && formData.height
    && !isNeg(formData.age) && !isNeg(formData.weight) && !isNeg(formData.height);

  /* ── Submit ── */
  const submit = async () => {
    if (!valid) {
      if (Platform.OS === 'web') window.alert('Please fill in Age, Weight, and Height.');
      else Alert.alert('Missing fields', 'Please fill in Age, Weight, and Height.');
      return;
    }
    setError(''); setLoading(true); setPlan(null);
    try {
      const payload = {
        age: parseInt(formData.age, 10), weight: parseFloat(formData.weight),
        height: parseFloat(formData.height), gender: formData.gender,
        dietaryPreference: formData.dietaryPreference, healthConditions: formData.healthConditions || '',
        activityLevel: formData.activityLevel, goals: formData.goals,
        allergies: formData.allergies || '', typicalDay: formData.typicalDay || '',
        language: apiLang,
      };
      const res = await api.generateDietPlan(payload);
      setPlan(res); setPlanSaved(!!user);
    } catch (e) { setError(e.message || 'Diet plan generation failed'); }
    finally { setLoading(false); }
  };

  const handleShareGrocery = () => {
    if (!plan?.grocery_list) return;
    const text = typeof plan.grocery_list === 'string' ? plan.grocery_list : JSON.stringify(plan.grocery_list, null, 2);
    Share.share({ message: text, title: 'Grocery List' });
  };

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Intake form ── */}
        {!plan && (
          <>
            <Text style={s.eyebrow}>DIET PLAN</Text>
            <Text style={s.h1}>Build a plan that <Text style={s.h1Accent}>fits you.</Text></Text>
            <Text style={s.subtitle}>
              A 60-second intake. We'll generate balanced meals tuned to your body and goals.
            </Text>

            {/* Step dots */}
            <View style={s.stepRow}>
              <View style={s.stepActive} />
              <View style={s.stepDot} />
              <View style={s.stepDot} />
              <Text style={s.stepLabel}>ABOUT YOU</Text>
            </View>

            {/* Error */}
            {error ? (
              <View style={s.errCard}>
                <Ionicons name="alert-circle-outline" size={14} color={T.heart} />
                <Text style={s.errText}>{error}</Text>
              </View>
            ) : null}

            {/* BODY METRICS CARD */}
            <SectionCard iconName="body-outline" title="Body Metrics" tag="Required">
              <View style={s.metricGrid}>
                <MetricPill
                  label="Age" value={formData.age}
                  onChange={v => update('age', v)}
                  placeholder="35" unit="yrs" keyboard="number-pad"
                  hasError={isNeg(formData.age)}
                />
                <MetricPill
                  label="Weight" value={formData.weight}
                  onChange={v => update('weight', v)}
                  placeholder="70" unit="kg" keyboard="decimal-pad"
                  hasError={isNeg(formData.weight)}
                />
              </View>
              <View style={[s.metricGrid, { marginTop: 10 }]}>
                <MetricPill
                  label="Height" value={formData.height}
                  onChange={v => update('height', v)}
                  placeholder="170" unit="cm" keyboard="decimal-pad"
                  hasError={isNeg(formData.height)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 10, fontWeight: '700', color: T.inkMute, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }]}>Gender</Text>
                  <GenderControl value={formData.gender} onChange={v => update('gender', v)} />
                </View>
              </View>
            </SectionCard>

            {/* PREFERENCES CARD */}
            <SectionCard iconName="options-outline" title="Preferences">
              <FieldLabel dot={T.sageDot}>Diet type</FieldLabel>
              <ChipSelect
                options={DIET_OPTIONS} value={formData.dietaryPreference}
                onChange={v => update('dietaryPreference', v)} dotColor={T.sageDot}
              />
              <View style={{ height: 16 }} />
              <FieldLabel dot={T.amber}>Activity level</FieldLabel>
              <ChipSelect
                options={ACTIVITY_OPTIONS} value={formData.activityLevel}
                onChange={v => update('activityLevel', v)} dotColor={T.amber}
              />
              <View style={{ height: 16 }} />
              <FieldLabel dot={T.heart}>Primary goal</FieldLabel>
              <ChipSelect
                options={GOAL_OPTIONS} value={formData.goals}
                onChange={v => update('goals', v)} dotColor={T.heart}
              />
            </SectionCard>

            {/* ADDITIONAL INFO CARD */}
            <SectionCard iconName="document-text-outline" title="Additional Info" tag="Optional" tagMuted>
              <IconInput
                icon="medical-outline"
                placeholder="e.g. high blood pressure, Type 2 diabetes"
                hint="helps tune the plan"
                value={formData.healthConditions}
                onChange={v => update('healthConditions', v)}
              />
              <IconInput
                icon="ban-outline"
                placeholder="e.g. gluten, peanuts"
                value={formData.allergies}
                onChange={v => update('allergies', v)}
              />
            </SectionCard>

            {/* Live summary pill */}
            <LiveSummaryPill calories={calories} goal={formData.goals} />

            {/* Generate CTA */}
            <GenerateBtn onPress={submit} loading={loading} disabled={!valid} />
            {loading && <Text style={s.generating}>Generating your plan…</Text>}
          </>
        )}

        {/* ── Generated plan result ── */}
        {plan && (
          <View style={{ marginTop: 4 }}>
            {/* Result header */}
            <View style={s.resultHeader}>
              <View style={s.savedRow}>
                <Ionicons name="checkmark-circle" size={14} color={T.sageDot} />
                <Text style={s.savedText}>Saved to your account</Text>
              </View>
              <Text style={s.resultsTitle}>Your <Text style={s.h1Accent}>Plan</Text></Text>
              <Text style={s.resultsSub}>Generated by Bonus Life AI</Text>
            </View>

            {/* Action row */}
            <View style={s.planActions}>
              {plan.grocery_list && (
                <Pressable style={s.grocBtn} onPress={handleShareGrocery}>
                  <Ionicons name="list-outline" size={14} color={T.sage} />
                  <Text style={s.grocBtnText}>Grocery List</Text>
                </Pressable>
              )}
              {viewPlan ? (
                <Pressable style={s.newBtn} onPress={() => setPlan(null)}>
                  <Ionicons name="create-outline" size={14} color={T.inkSub} />
                  <Text style={s.newBtnText}>New plan</Text>
                </Pressable>
              ) : (
                <Pressable style={s.newBtn} onPress={() => { setPlan(null); setError(''); }}>
                  <Ionicons name="refresh-outline" size={14} color={T.inkSub} />
                  <Text style={s.newBtnText}>New plan</Text>
                </Pressable>
              )}
            </View>

            {/* Nutrition stats */}
            {plan.nutritional_info && (
              <View style={s.nutriRow}>
                {[
                  { label: 'Calories', value: plan.nutritional_info.daily_calories, unit: 'kcal', color: T.peachDeep },
                  { label: 'Protein',  value: plan.nutritional_info.protein_grams,  unit: 'g',    color: T.sageDot  },
                  { label: 'Carbs',    value: plan.nutritional_info.carbs_grams,    unit: 'g',    color: T.amber    },
                  { label: 'Fat',      value: plan.nutritional_info.fat_grams,      unit: 'g',    color: T.heart    },
                ].filter(n => n.value != null).map((n) => (
                  <View key={n.label} style={s.nutriCard}>
                    <Text style={[s.nutriVal, { color: n.color }]}>{n.value}</Text>
                    <Text style={s.nutriUnit}>{n.unit}</Text>
                    <Text style={s.nutriLabel}>{n.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {plan.overview && (
              <InfoCard icon="document-text-outline" iconColor={T.inkSub} title="Overview">
                <Text style={s.planText}>{plan.overview}</Text>
              </InfoCard>
            )}
            {plan.daily_plan && (
              <InfoCard icon="calendar-outline" iconColor={T.amber} title="Daily Meals">
                <Text style={s.planText}>{plan.daily_plan}</Text>
              </InfoCard>
            )}
            {plan.grocery_list && (
              <InfoCard icon="cart-outline" iconColor={T.sageDot} title="Groceries">
                <Text style={s.planText}>{typeof plan.grocery_list === 'string' ? plan.grocery_list : JSON.stringify(plan.grocery_list)}</Text>
              </InfoCard>
            )}
            {plan.important_notes && (
              <InfoCard icon="warning-outline" iconColor={T.amber} title="Important Notes">
                <Text style={[s.planText, { fontStyle: 'italic' }]}>{plan.important_notes}</Text>
              </InfoCard>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { paddingHorizontal: 20 },

  /* Headings */
  eyebrow:    { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 },
  h1: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400', fontSize: 32, color: T.ink,
    letterSpacing: -0.8, lineHeight: 38, marginBottom: 8,
  },
  h1Accent:   { color: T.sage, fontStyle: 'italic' },
  subtitle:   { fontSize: 13, color: T.inkSub, lineHeight: 20, marginBottom: 20 },
  headingSub: { fontSize: 13, color: T.inkMute, marginBottom: 16 },

  /* Step dots */
  stepRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  stepActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: T.sage },
  stepDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: T.line },
  stepLabel:  { fontSize: 10, fontWeight: '700', color: T.sage, letterSpacing: 1.4, marginLeft: 4 },

  /* Error */
  errCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(201,93,93,0.07)', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: 'rgba(201,93,93,0.2)' },
  errText: { flex: 1, fontSize: 13, color: T.heart },

  /* Metric grid */
  metricGrid: { flexDirection: 'row', gap: 10 },

  /* Saved plans tabs */
  tabRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: T.line },
  tabActive:    { backgroundColor: T.ink, borderColor: T.ink },
  tabLabel:     { fontSize: 13, fontWeight: '500', color: T.inkSub },
  tabLabelActive:{ color: '#FFFFFF', fontWeight: '700' },

  /* Stat strip */
  statStrip: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statCell:    { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: T.line },
  statVal: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 22, fontWeight: '700', color: T.sage,
  },
  statLabel: { fontSize: 9, fontWeight: '800', color: T.inkMute, letterSpacing: 1.2 },

  /* Generating text */
  generating: { textAlign: 'center', color: T.inkMute, fontSize: 13, marginTop: 12 },

  /* Result */
  resultHeader:{ marginBottom: 16 },
  savedRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  savedText:   { fontSize: 12, color: T.sageDot, fontWeight: '600' },
  resultsTitle:{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: '400', fontSize: 28, color: T.ink, letterSpacing: -0.5 },
  resultsSub:  { fontSize: 12, color: T.inkMute, marginTop: 2 },

  planActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  grocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.sageSoft, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  grocBtnText: { fontSize: 12, fontWeight: '600', color: T.sage },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 0.5, borderColor: T.line,
  },
  newBtnText: { fontSize: 12, fontWeight: '600', color: T.inkSub },

  nutriRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  nutriCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  nutriVal: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 18, fontWeight: '700', marginBottom: 2,
  },
  nutriUnit:  { fontSize: 10, color: T.inkMute, marginBottom: 2 },
  nutriLabel: { fontSize: 10, color: T.inkMute, textAlign: 'center' },

  planText: { fontSize: 14, color: T.inkSub, lineHeight: 22 },
});
