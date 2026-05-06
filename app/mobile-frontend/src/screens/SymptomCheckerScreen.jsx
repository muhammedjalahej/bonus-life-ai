/**
 * Symptom Checker — Elevated Clinical Calm
 * DisclaimerBanner · SymptomToggle · SegmentedControl · NumericField · LiveSummaryPill
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Pressable, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../services/api';

/* ── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  cream:    '#F5F1E8',
  cream2:   '#EFE9DC',
  cream3:   '#FBF7EC',
  ink:      '#1A1A1A',
  inkSub:   '#6B6A63',
  inkMute:  '#9A9890',
  line:     '#E2DCCC',
  sage:     '#234B3E',
  sageDot:  '#4A7A66',
  sageSoft: '#E3EAE4',
  peach:    '#F7E3D4',
  peachDeep:'#C97A4F',
  heart:    '#C95D5D',
  amber:    '#C9A875',
  amberSoft:'#F5E8C8',
  amberDeep:'#9E7320',
  white:    '#FFFFFF',
};
const THEME = T.peachDeep;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function stripMd(s) { return typeof s === 'string' ? s.replace(/\*\*/g, '') : s; }

/* ── StepStrip ───────────────────────────────────────────────────────────── */
function StepStrip({ pill, meta }) {
  return (
    <View style={ss.row}>
      <View style={[ss.pill, { backgroundColor: '#F5EAE0' }]}>
        <Text style={[ss.pillText, { color: THEME }]}>{pill}</Text>
      </View>
      <Text style={ss.meta}>{meta}</Text>
    </View>
  );
}
const ss = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pill:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 12, fontWeight: '400' },
  meta:     { fontSize: 9.5, fontWeight: '700', color: T.inkMute, letterSpacing: 1.2, textTransform: 'uppercase' },
});

/* ── EditorialHeading ────────────────────────────────────────────────────── */
function EditorialHeading({ line1, accent, subtitle }) {
  return (
    <View style={eh.wrap}>
      <Text style={eh.h1}>
        {line1}{'\n'}
        <Text style={[eh.h1, { color: THEME, fontStyle: 'italic' }]}>{accent}</Text>
      </Text>
      <Text style={eh.sub}>{subtitle}</Text>
    </View>
  );
}
const eh = StyleSheet.create({
  wrap: { marginBottom: 18 },
  h1:   { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '400', color: T.ink, letterSpacing: -0.5, lineHeight: 32 },
  sub:  { fontSize: 12.5, color: T.inkSub, lineHeight: 19, marginTop: 6 },
});

/* ── ProgressDots ────────────────────────────────────────────────────────── */
function ProgressDots({ current, total, label }) {
  return (
    <View style={pd.row}>
      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          i < current
            ? <View key={i} style={[pd.active, { backgroundColor: THEME }]} />
            : <View key={i} style={pd.inactive} />
        ))}
      </View>
      <Text style={pd.label}>{label}</Text>
    </View>
  );
}
const pd = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 20 },
  active:   { width: 22, height: 6, borderRadius: 3 },
  inactive: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.line },
  label:    { fontSize: 9, fontWeight: '700', color: T.inkMute, letterSpacing: 1.2, textTransform: 'uppercase' },
});

/* ── DisclaimerBanner ────────────────────────────────────────────────────── */
function DisclaimerBanner() {
  return (
    <LinearGradient
      colors={[T.amberSoft, '#E8D9A8']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={db.wrap}
    >
      <View style={db.iconBox}>
        <Ionicons name="warning-outline" size={14} color={T.amberDeep} />
      </View>
      <Text style={db.text}>
        <Text style={db.bold}>For information only. </Text>
        Always see a healthcare provider for diagnosis. In emergencies, call{' '}
        <Text style={db.bold}>911 / 112</Text>.
      </Text>
    </LinearGradient>
  );
}
const db = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 13, marginBottom: 18, borderWidth: 0.5, borderColor: '#D9C88A' },
  iconBox: { width: 24, height: 24, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  text:    { flex: 1, fontSize: 11, color: T.amberDeep, lineHeight: 17 },
  bold:    { fontWeight: '700' },
});

/* ── SectionCard ─────────────────────────────────────────────────────────── */
function SectionCard({ icon, title, children }) {
  return (
    <View style={sc.wrap}>
      <View style={sc.header}>
        <View style={[sc.iconBox, { backgroundColor: THEME + '18' }]}>
          <Ionicons name={icon} size={13} color={THEME} />
        </View>
        <Text style={sc.title}>{title}</Text>
        <View style={sc.tag}>
          <Text style={sc.tagText}>Required</Text>
        </View>
      </View>
      <View style={sc.card}>
        {children}
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:    { marginBottom: 14 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  iconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:   { flex: 1, fontSize: 10.5, fontWeight: '800', color: T.ink, letterSpacing: 1.5, textTransform: 'uppercase' },
  card:    { backgroundColor: T.white, borderRadius: 18, borderWidth: 0.5, borderColor: T.line, overflow: 'hidden', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tag:     { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: THEME + '12', borderWidth: 0.5, borderColor: THEME + '30' },
  tagText: { fontSize: 9.5, fontWeight: '700', color: THEME, letterSpacing: 0.3 },
});

/* ── SymptomToggle (horizontal pill) ────────────────────────────────────── */
function SymptomToggle({ label, value, onChange, isLast }) {
  return (
    <View style={[st.row, !isLast && st.border]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
        <View style={st.dot} />
        <Text style={st.label}>{label}</Text>
      </View>
      <View style={st.pill}>
        <Pressable
          style={[st.btn, value === '1' && [st.btnYes, { backgroundColor: THEME }]]}
          onPress={() => onChange('1')}
        >
          <Text style={[st.btnTxt, value === '1' && st.btnYesTxt]}>Yes</Text>
        </Pressable>
        <Pressable
          style={[st.btn, value === '0' && st.btnNo]}
          onPress={() => onChange('0')}
        >
          <Text style={[st.btnTxt, value === '0' && st.btnNoTxt]}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 10 },
  border:    { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  dot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart, flexShrink: 0 },
  label:     { fontSize: 12.5, fontWeight: '600', color: T.ink },
  pill:      { flexDirection: 'row', backgroundColor: T.cream3, borderRadius: 999, padding: 3, borderWidth: 0.5, borderColor: T.line },
  btn:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  btnYes:    { shadowColor: THEME, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  btnNo:     { backgroundColor: T.ink },
  btnTxt:    { fontSize: 12, fontWeight: '600', color: T.inkMute },
  btnYesTxt: { color: T.white },
  btnNoTxt:  { color: T.white },
});

/* ── SegmentedControl ────────────────────────────────────────────────────── */
function SegmentedControl({ label, hint, options, value, onChange, isLast }) {
  return (
    <View style={[seg.wrap, !isLast && seg.border]}>
      <View style={seg.left}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={seg.dot} />
          <Text style={seg.label}>{label}</Text>
        </View>
        {hint ? <Text style={seg.hint}>{hint}</Text> : null}
      </View>
      <View style={seg.control}>
        {options.map(([val, lbl]) => {
          const active = value === val;
          return active ? (
            <LinearGradient
              key={val}
              colors={[THEME + 'CC', THEME]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={seg.activeBtn}
            >
              <Pressable onPress={() => onChange(val)} style={seg.btnInner}>
                <Text style={seg.activeTxt}>{lbl}</Text>
              </Pressable>
            </LinearGradient>
          ) : (
            <Pressable key={val} style={seg.inactiveBtn} onPress={() => onChange(val)}>
              <Text style={seg.inactiveTxt}>{lbl}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const seg = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 10 },
  border:     { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  left:       { flex: 1 },
  dot:        { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart },
  label:      { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:       { fontSize: 10.5, color: T.inkMute, marginTop: 2 },
  control:    { flexDirection: 'row', backgroundColor: T.cream3, borderRadius: 10, padding: 3, borderWidth: 0.5, borderColor: T.line },
  activeBtn:  { borderRadius: 8, shadowColor: THEME, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  btnInner:   { paddingHorizontal: 12, paddingVertical: 6 },
  inactiveBtn:{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  activeTxt:  { fontSize: 12, fontWeight: '700', color: T.white },
  inactiveTxt:{ fontSize: 12, fontWeight: '600', color: T.inkSub },
});

/* ── NumericField ────────────────────────────────────────────────────────── */
function NumericField({ label, hint, unit, value, onChangeText, isLast, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[nf.row, !isLast && nf.border]}>
      <View style={nf.left}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={nf.dot} />
          <Text style={nf.label}>{label}</Text>
        </View>
        {hint ? <Text style={nf.hint}>{hint}</Text> : null}
      </View>
      <View style={[nf.pill, focused && nf.pillFocused]}>
        <TextInput
          style={nf.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          placeholder={placeholder || '—'}
          placeholderTextColor={T.inkMute}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlign="right"
        />
        {unit ? <Text style={nf.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}
const nf = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 10 },
  border:     { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  left:       { flex: 1 },
  dot:        { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart, flexShrink: 0 },
  label:      { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:       { fontSize: 10.5, color: T.inkMute, marginTop: 2 },
  pill:       { width: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: T.cream3, borderRadius: 10, borderWidth: 0.5, borderColor: T.line, paddingVertical: 8, paddingHorizontal: 10, gap: 4 },
  pillFocused:{ borderColor: THEME + '55', backgroundColor: THEME + '08' },
  input:      { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 16, color: T.ink, flex: 1, textAlign: 'right', padding: 0, minWidth: 30, outlineWidth: 0, outlineStyle: 'none' },
  unit:       { fontSize: 10, color: T.inkMute, flexShrink: 0 },
});

/* ── LiveSummaryPill ─────────────────────────────────────────────────────── */
function LiveSummaryPill({ form }) {
  const symptoms = ['fever', 'cough', 'fatigue', 'difficultyBreathing'].filter(k => form[k] !== '').length;
  const profileDone = form.age && form.gender !== '' && form.bloodPressure !== '' && form.cholesterol !== '';
  const label = `${symptoms} symptom${symptoms !== 1 ? 's' : ''} · profile ${profileDone ? 'complete' : 'incomplete'} · `;
  const accent = profileDone && symptoms > 0 ? 'Ready for differential' : 'fill all fields to proceed';
  return (
    <LinearGradient
      colors={['#F5EAE0', '#EFE0D0']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={lp.wrap}
    >
      <View style={[lp.icon, { backgroundColor: THEME + '18' }]}>
        <Ionicons name="search-outline" size={14} color={THEME} />
      </View>
      <Text style={lp.text} numberOfLines={2}>
        {label}
        <Text style={[lp.accent, { color: THEME }]}>{accent}</Text>
      </Text>
    </LinearGradient>
  );
}
const lp = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: '#E0CEC0' },
  icon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text:   { flex: 1, fontSize: 12, color: T.inkSub, lineHeight: 18 },
  accent: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', fontSize: 12 },
});

/* ── PrimaryCTA ──────────────────────────────────────────────────────────── */
function PrimaryCTA({ onPress, loading, disabled, label }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const isDisabled = disabled || loading;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, { marginBottom: 8 }]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={isDisabled}>
        {isDisabled ? (
          <View style={cta.disabled}>
            {loading
              ? <ActivityIndicator color={T.inkMute} size="small" />
              : <Text style={cta.disabledLabel}>{label}</Text>
            }
          </View>
        ) : (
          <LinearGradient
            colors={[THEME + 'CC', THEME]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={cta.btn}
          >
            <View style={cta.highlight} />
            <Ionicons name="search-circle-outline" size={18} color="#FFFFFF" />
            <Text style={cta.label}>{label}</Text>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}
const cta = StyleSheet.create({
  btn:          { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: THEME, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  highlight:    { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  label:        { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled:     { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.white, borderWidth: StyleSheet.hairlineWidth, borderColor: T.line },
  disabledLabel:{ color: T.inkMute, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});

/* ── PredRow (result) ────────────────────────────────────────────────────── */
function PredRow({ p, index }) {
  const pct = Math.round((p.probability || 0) * 100);
  const color = pct >= 60 ? T.heart : pct >= 30 ? T.amber : T.sageDot;
  const examples = Array.isArray(p.disease_examples ?? p.diseaseExamples)
    ? (p.disease_examples ?? p.diseaseExamples) : [];
  return (
    <View style={[pr.wrap, index > 0 && pr.border]}>
      <View style={pr.top}>
        <View style={[pr.num, { backgroundColor: color + '18', borderColor: color + '35' }]}>
          <Text style={[pr.numText, { color }]}>{index + 1}</Text>
        </View>
        <Text style={pr.disease}>{p.disease}</Text>
        <Text style={[pr.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={pr.barRow}>
        <View style={pr.barBg}>
          <View style={[pr.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      {examples.length > 0 && <Text style={pr.examples}>{examples.join(' · ')}</Text>}
    </View>
  );
}
const pr = StyleSheet.create({
  wrap:    { paddingVertical: 14 },
  border:  { borderTopWidth: 0.5, borderTopColor: T.cream2 },
  top:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  num:     { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  numText: { fontSize: 11, fontWeight: '800' },
  disease: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  pct:     { fontSize: 15, fontWeight: '800' },
  barRow:  { paddingLeft: 32 },
  barBg:   { height: 4, backgroundColor: T.cream2, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  examples:{ fontSize: 11, color: T.inkMute, marginTop: 6, paddingLeft: 32 },
});

/* ── Main screen ─────────────────────────────────────────────────────────── */
export default function SymptomCheckerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    fever: '', cough: '', fatigue: '', difficultyBreathing: '',
    age: '', gender: '', bloodPressure: '', cholesterol: '',
  });
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const allFilled = [
    form.fever, form.cough, form.fatigue, form.difficultyBreathing,
    form.age, form.gender, form.bloodPressure, form.cholesterol,
  ].every(v => v !== '');

  const submit = async () => {
    if (!allFilled) {
      setError('Please fill all fields.');
      return;
    }
    setError(''); setPredictions(null); setLoading(true);
    try {
      const result = await api.symptomCheckerPredict({
        fever:              parseInt(form.fever, 10),
        cough:              parseInt(form.cough, 10),
        fatigue:            parseInt(form.fatigue, 10),
        difficultyBreathing:parseInt(form.difficultyBreathing, 10),
        age:                parseFloat(form.age),
        gender:             parseInt(form.gender, 10),
        bloodPressure:      parseInt(form.bloodPressure, 10),
        cholesterol:        parseInt(form.cholesterol, 10),
      });
      setPredictions(result.predictions || []);
    } catch (err) {
      setError(err?.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <StepStrip pill="Differential" meta="8 INPUTS · SYMPTOMS + PROFILE" />
        <EditorialHeading
          line1="What feels"
          accent="off today?"
          subtitle="AI-powered differential diagnosis based on your symptoms."
        />
        <ProgressDots current={predictions ? 2 : 1} total={2} label={predictions ? 'COMPLETE' : 'STEP 1 · SYMPTOMS'} />

        {/* Disclaimer */}
        <DisclaimerBanner />

        {/* Error */}
        {error ? (
          <View style={s.errCard}>
            <Ionicons name="alert-circle-outline" size={14} color={T.heart} />
            <Text style={s.errText}>{error}</Text>
          </View>
        ) : null}

        {/* Symptoms */}
        <SectionCard icon="thermometer-outline" title="Symptoms">
          <SymptomToggle label="Fever"               value={form.fever}              onChange={v => set('fever', v)}              isLast={false} />
          <SymptomToggle label="Cough"               value={form.cough}              onChange={v => set('cough', v)}              isLast={false} />
          <SymptomToggle label="Fatigue"             value={form.fatigue}            onChange={v => set('fatigue', v)}            isLast={false} />
          <SymptomToggle label="Difficulty breathing" value={form.difficultyBreathing} onChange={v => set('difficultyBreathing', v)} isLast />
        </SectionCard>

        {/* Profile */}
        <SectionCard icon="person-outline" title="Profile">
          <NumericField label="Age" unit="yrs" placeholder="35" value={form.age} onChangeText={v => set('age', v)} isLast={false} />
          <SegmentedControl
            label="Gender"
            options={[['1', 'Male'], ['0', 'Female']]}
            value={form.gender} onChange={v => set('gender', v)} isLast={false}
          />
          <SegmentedControl
            label="Blood Pressure" hint="Recent reading category"
            options={[['1', 'High'], ['0', 'Normal']]}
            value={form.bloodPressure} onChange={v => set('bloodPressure', v)} isLast={false}
          />
          <SegmentedControl
            label="Cholesterol" hint="Last lab category"
            options={[['1', 'High'], ['0', 'Normal']]}
            value={form.cholesterol} onChange={v => set('cholesterol', v)} isLast
          />
        </SectionCard>

        {/* Live pill */}
        <LiveSummaryPill form={form} />

        {/* CTA */}
        <PrimaryCTA onPress={submit} loading={loading} disabled={!allFilled} label="Get prediction" />

        {/* ── Results ── */}
        {predictions && predictions.length > 0 && (
          <View style={s.results}>
            <View style={s.divider} />
            <Text style={s.resultsTitle}>Possible Conditions</Text>
            <View style={s.predsCard}>
              {predictions.map((p, i) => <PredRow key={i} p={p} index={i} />)}
            </View>
            <View style={s.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={14} color={T.amberDeep} />
              <Text style={s.disclaimerText}>For informational purposes only. Consult a healthcare professional.</Text>
            </View>
            <Pressable style={s.hospBtn} onPress={() => navigation.navigate('Hospitals')}>
              <Ionicons name="medical-outline" size={16} color={T.sage} />
              <Text style={s.hospBtnText}>Find Nearby Hospitals</Text>
              <Ionicons name="chevron-forward" size={14} color={T.sage + '80'} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { padding: 20, paddingTop: 16 },

  errCard:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.heart + '10', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: T.heart + '30' },
  errText:  { flex: 1, fontSize: 13, color: T.heart },

  results:      { marginTop: 10 },
  divider:      { height: 0.5, backgroundColor: T.line, marginBottom: 22, marginTop: 14 },
  resultsTitle: { fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '400', color: T.ink, letterSpacing: -0.3, marginBottom: 14 },

  predsCard:     { backgroundColor: T.white, borderRadius: 18, paddingHorizontal: 16, marginBottom: 14, borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  disclaimerCard:{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: T.amberSoft, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 0.5, borderColor: '#D9C88A' },
  disclaimerText:{ flex: 1, fontSize: 12, color: T.amberDeep, lineHeight: 18 },

  hospBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.sage + '10', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, borderWidth: 0.5, borderColor: T.sage + '30' },
  hospBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.sage },
});
