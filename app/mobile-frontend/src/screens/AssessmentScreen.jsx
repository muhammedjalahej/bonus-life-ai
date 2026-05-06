/**
 * Diabetes Assessment — Elevated Clinical Calm
 * StepStrip · EditorialHeading · NumericField · SliderField · LiveSummaryPill
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Pressable, Animated,
  Platform, Share, PanResponder,
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
  sageSoft: '#E3EAE4',
  sageDot:  '#4A7A66',
  heart:    '#C95D5D',
  amber:    '#C9A875',
  amberSoft:'#F5E8C8',
  white:    '#FFFFFF',
};
const THEME = T.sage;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function stripMd(s) { return typeof s === 'string' ? s.replace(/\*\*/g, '') : s; }
const num = (v, d) => (v === '' || v == null ? d : parseFloat(String(v).replace(',', '.')));
const int = (v, d) => (v === '' || v == null ? d : parseInt(String(v), 10));

function shareResult(title, lines) {
  const text = lines.join('\n');
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1C1B18;line-height:1.7}h1{font-style:italic}hr{border:none;border-top:1px solid #ddd;margin:16px 0}@media print{button{display:none}}</style></head><body><button onclick="window.print()" style="margin-bottom:20px;padding:8px 16px;cursor:pointer">Print / Save PDF</button><h1>${title}</h1><hr>${lines.map(l=>`<p>${l}</p>`).join('')}</body></html>`);
    win.document.close();
  } else {
    Share.share({ title, message: `${title}\n\n${text}` });
  }
}

/* ── StepStrip ───────────────────────────────────────────────────────────── */
function StepStrip({ pill, meta }) {
  return (
    <View style={ss.row}>
      <View style={ss.pill}>
        <Text style={ss.pillText}>{pill}</Text>
      </View>
      <Text style={ss.meta}>{meta}</Text>
    </View>
  );
}
const ss = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pill:     { backgroundColor: T.sageSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 12, color: T.sage, fontWeight: '400' },
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

/* ── SectionCard ─────────────────────────────────────────────────────────── */
function SectionCard({ icon, title, optional, children }) {
  return (
    <View style={sc.wrap}>
      <View style={sc.header}>
        <View style={[sc.iconBox, { backgroundColor: THEME + '18' }]}>
          <Ionicons name={icon} size={13} color={THEME} />
        </View>
        <Text style={sc.title}>{title}</Text>
        <View style={[sc.tag, optional ? sc.tagOpt : sc.tagReq]}>
          <Text style={[sc.tagText, optional ? sc.tagOptText : sc.tagReqText]}>
            {optional ? 'Optional' : 'Required'}
          </Text>
        </View>
      </View>
      <View style={sc.card}>
        {children}
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  iconBox:    { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, fontSize: 10.5, fontWeight: '800', color: T.ink, letterSpacing: 1.5, textTransform: 'uppercase' },
  card:       { backgroundColor: T.white, borderRadius: 18, borderWidth: 0.5, borderColor: T.line, overflow: 'hidden', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tag:        { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  tagReq:     { backgroundColor: THEME + '12', borderWidth: 0.5, borderColor: THEME + '30' },
  tagOpt:     { backgroundColor: T.cream2 },
  tagText:    { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.3 },
  tagReqText: { color: THEME },
  tagOptText: { color: T.inkMute },
});

/* ── NumericField ────────────────────────────────────────────────────────── */
function NumericField({ label, hint, unit, value, onChangeText, keyboard, isLast, required, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[nf.row, !isLast && nf.border]}>
      <View style={nf.left}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {required && <View style={nf.dot} />}
          <Text style={nf.label}>{label}</Text>
        </View>
        {hint ? <Text style={nf.hint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      <View style={[nf.pill, focused && nf.pillFocused]}>
        <TextInput
          style={nf.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboard || 'decimal-pad'}
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
  pill:       { width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: T.cream3, borderRadius: 10, borderWidth: 0.5, borderColor: T.line, paddingVertical: 8, paddingHorizontal: 10, gap: 4 },
  pillFocused:{ borderColor: THEME + '55', backgroundColor: THEME + '08' },
  input:      { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 16, color: T.ink, flex: 1, textAlign: 'right', padding: 0, minWidth: 40, outlineWidth: 0, outlineStyle: 'none' },
  unit:       { fontSize: 10, color: T.inkMute, flexShrink: 0 },
});

/* ── SliderField ─────────────────────────────────────────────────────────── */
function SliderField({ label, hint, value, onChange, min, max, step, isLast }) {
  const trackRef = useRef(null);
  const trackWidth = useRef(0);
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const snap = (v) => step ? Math.round(v / step) * step : v;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (trackWidth.current <= 0) return;
      const x = e.nativeEvent.locationX;
      const pct = Math.max(0, Math.min(1, x / trackWidth.current));
      onChange(parseFloat(snap(clamp(min + pct * (max - min))).toFixed(2)));
    },
    onPanResponderMove: (e) => {
      if (trackWidth.current <= 0) return;
      const x = e.nativeEvent.locationX;
      const pct = Math.max(0, Math.min(1, x / trackWidth.current));
      onChange(parseFloat(snap(clamp(min + pct * (max - min))).toFixed(2)));
    },
  })).current;

  const pct = (value - min) / (max - min);
  const displayVal = typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : '0.00';

  return (
    <View style={[sf.wrap, !isLast && sf.border]}>
      <View style={sf.labelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={sf.dot} />
          <Text style={sf.label}>{label}</Text>
        </View>
        {hint ? <Text style={sf.hint}>{hint}</Text> : null}
      </View>
      <View
        ref={trackRef}
        style={sf.trackWrap}
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
        hitSlop={{ top: 14, bottom: 14 }}
      >
        <View style={sf.track}>
          <View style={[sf.fill, { width: `${pct * 100}%`, backgroundColor: THEME }]} />
        </View>
        <View style={[sf.thumb, { left: `${pct * 100}%`, borderColor: THEME }]}>
          <View style={[sf.thumbInner, { backgroundColor: THEME }]} />
        </View>
      </View>
      <View style={sf.valRow}>
        <Text style={sf.rangeText}>{min}</Text>
        <Text style={[sf.currentVal, { color: THEME }]}>{displayVal}</Text>
        <Text style={sf.rangeText}>{max}</Text>
      </View>
    </View>
  );
}
const sf = StyleSheet.create({
  wrap:       { paddingVertical: 14, paddingHorizontal: 14 },
  border:     { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  labelRow:   { marginBottom: 14 },
  dot:        { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart, flexShrink: 0 },
  label:      { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:       { fontSize: 10.5, color: T.inkMute, marginTop: 2 },
  trackWrap:  { position: 'relative', height: 28, justifyContent: 'center', marginHorizontal: 8 },
  track:      { height: 4, backgroundColor: T.line, borderRadius: 2, overflow: 'hidden' },
  fill:       { height: 4, borderRadius: 2 },
  thumb:      { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: T.white, borderWidth: 2, marginLeft: -9, top: 5, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  thumbInner: { width: 6, height: 6, borderRadius: 3 },
  valRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  rangeText:  { fontSize: 10, color: T.inkMute, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' },
  currentVal: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 13, fontWeight: '700' },
});

/* ── ReadyPill ───────────────────────────────────────────────────────────── */
function ReadyPill({ allReady }) {
  return (
    <LinearGradient
      colors={['#F0ECD8', '#EAE3C8']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={lp.wrap}
    >
      <View style={[lp.icon, { backgroundColor: allReady ? THEME + '18' : T.line }]}>
        <Ionicons
          name={allReady ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={14}
          color={allReady ? THEME : T.inkMute}
        />
      </View>
      <Text style={lp.text}>
        {allReady
          ? <><Text style={[lp.accent, { color: THEME }]}>Required fields complete</Text> · ready to run</>
          : 'Fill Glucose, Blood Pressure, Weight, Height and Age to continue'
        }
      </Text>
    </LinearGradient>
  );
}
const lp = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: '#D8D2BB' },
  icon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text:   { flex: 1, fontSize: 12, color: T.inkSub, lineHeight: 18 },
  accent: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', fontSize: 12 },
});

/* ── PrimaryCTA ──────────────────────────────────────────────────────────── */
function PrimaryCTA({ onPress, loading, disabled, label, icon }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const isDisabled = disabled || loading;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, { marginBottom: 8 }]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={isDisabled}>
        {isDisabled ? (
          <View style={cta.disabled}>
            <Text style={cta.disabledLabel}>{label}</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[T.sageDot, T.sage]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={cta.btn}
          >
            <View style={cta.highlight} />
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <>
                  <Ionicons name={icon || 'analytics-outline'} size={18} color="#FFFFFF" />
                  <Text style={cta.label}>{label}</Text>
                </>
            }
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}
const cta = StyleSheet.create({
  btn:         { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: T.sage, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  highlight:   { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  label:       { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled:    { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.white, borderWidth: StyleSheet.hairlineWidth, borderColor: T.line },
  disabledLabel:{ color: T.inkMute, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});

/* ── Result sub-components ───────────────────────────────────────────────── */
function CollapsibleCard({ icon, iconColor, title, children, startOpen }) {
  const [open, setOpen] = useState(!!startOpen);
  return (
    <View style={cc.card}>
      <Pressable style={cc.header} onPress={() => setOpen(o => !o)}>
        <Ionicons name={icon} size={15} color={iconColor} />
        <Text style={cc.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={T.inkMute} />
      </Pressable>
      {open && <View style={cc.body}>{children}</View>}
    </View>
  );
}
const cc = StyleSheet.create({
  card:   { backgroundColor: T.white, borderRadius: 14, marginBottom: 14, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, overflow: 'hidden', borderWidth: 0.5, borderColor: T.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  title:  { flex: 1, fontSize: 11, fontWeight: '700', color: T.inkSub, textTransform: 'uppercase', letterSpacing: 0.8 },
  body:   { paddingHorizontal: 16, paddingBottom: 16 },
});

function FactorsList({ factors }) {
  if (!factors?.length) return null;
  return (
    <View style={{ gap: 12 }}>
      {factors.map((f, i) => {
        const sev = (f.severity || '').toLowerCase();
        const color = sev.includes('high') ? '#C85A3A' : sev.includes('mod') ? '#B4781E' : T.sageDot;
        const icon  = sev.includes('high') ? 'alert-circle' : sev.includes('mod') ? 'warning' : 'checkmark-circle';
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name={icon} size={16} color={color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: 'rgba(28,27,24,0.8)', lineHeight: 21, marginBottom: 4 }}>{stripMd(f.factor || f)}</Text>
              {f.severity && (
                <View style={{ alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: color + '10', borderWidth: 1, borderColor: color + '25' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color }}>{f.severity}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MetricsGrid({ metrics }) {
  const items = [
    metrics.bmi != null           && { label: `BMI${metrics.bmi_category ? ` · ${metrics.bmi_category}` : ''}`, value: metrics.bmi,           icon: 'body-outline',  color: T.sageDot },
    metrics.metabolic_age != null && { label: 'Metabolic Age',  value: metrics.metabolic_age, icon: 'time-outline',  color: '#A7896C' },
    metrics.health_score != null  && { label: 'Health Score',   value: metrics.health_score,  icon: 'heart-outline', color: T.sageDot },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <View key={i} style={{ flex: 1, minWidth: 90, backgroundColor: T.white, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: item.color + '12' }}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', color: item.color, marginBottom: 3 }}>{item.value}</Text>
          <Text style={{ fontSize: 10, color: T.inkMute, textAlign: 'center', letterSpacing: 0.3 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── Default values ──────────────────────────────────────────────────────── */
const DEFAULT = {
  glucose: '', blood_pressure: '', weight: '', height: '', age: '',
  pregnancies: '', skin_thickness: '', insulin: '',
  diabetes_pedigree_function: 0.5,
};

/* ── Main screen ─────────────────────────────────────────────────────────── */
export default function AssessmentScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(DEFAULT);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const setVal = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  const allRequired = values.glucose && values.blood_pressure && values.weight && values.height && values.age;

  const submit = async () => {
    if (!allRequired) {
      Alert.alert('Missing fields', 'Please fill Glucose, Blood Pressure, Weight, Height, and Age.');
      return;
    }
    const payload = {
      glucose:                    num(values.glucose, 0),
      blood_pressure:             num(values.blood_pressure, 0),
      weight:                     num(values.weight, 0),
      height:                     num(values.height, 0),
      age:                        int(values.age, 0),
      pregnancies:                int(values.pregnancies, 0),
      skin_thickness:             num(values.skin_thickness, 20),
      insulin:                    num(values.insulin, 80),
      diabetes_pedigree_function: typeof values.diabetes_pedigree_function === 'number'
                                    ? values.diabetes_pedigree_function
                                    : num(values.diabetes_pedigree_function, 0.5),
      language: 'english',
    };
    if (payload.glucose <= 0 || payload.blood_pressure <= 0 || payload.weight <= 0 || payload.height <= 0 || payload.age <= 0) {
      Alert.alert('Invalid values', 'Please enter positive numbers for required fields.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      setResult(await api.runDiabetesAssessment(payload));
    } catch (e) {
      Alert.alert('Error', e.message || 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel        = result?.risk_analysis?.risk_level || result?.risk_level || 'N/A';
  const probability      = result?.risk_analysis?.probability ?? result?.probability;
  const executiveSummary = result?.executive_summary || '';
  const keyFactors       = result?.risk_analysis?.key_factors || result?.key_factors || [];
  const healthMetrics    = result?.health_metrics || {};

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StepStrip pill="Step 1" meta="OF 1 · VITALS INTAKE" />
        <EditorialHeading
          line1="Diabetes"
          accent="risk check."
          subtitle="Enter your health metrics for AI-driven prediction. ~60 seconds."
        />
        <ProgressDots current={result ? 2 : 1} total={2} label={result ? 'COMPLETE' : 'VITALS · 50%'} />

        {/* Required Vitals */}
        <SectionCard icon="pulse-outline" title="Required Vitals" optional={false}>
          <NumericField label="Glucose"        hint="Fasting blood sugar"    unit="mg/dL" placeholder="120"  value={values.glucose}         onChangeText={v => setVal('glucose', v)}         required isLast={false} />
          <NumericField label="Blood Pressure" hint="Systolic reading"       unit="mmHg"  placeholder="70"   value={values.blood_pressure}   onChangeText={v => setVal('blood_pressure', v)}   required isLast={false} />
          <NumericField label="Weight"         hint="Current body weight"    unit="kg"    placeholder="70"   value={values.weight}           onChangeText={v => setVal('weight', v)}           required isLast={false} />
          <NumericField label="Height"         hint="Standing height"        unit="cm"    placeholder="170"  value={values.height}           onChangeText={v => setVal('height', v)}           required isLast={false} />
          <NumericField label="Age"            hint="Years"                  unit="yrs"   placeholder="35"   value={values.age}              onChangeText={v => setVal('age', v)}              keyboard="number-pad" required isLast />
        </SectionCard>

        {/* Additional Metrics */}
        <SectionCard icon="flask-outline" title="Additional Metrics" optional>
          <NumericField label="Pregnancies"        hint="Enter 0 if not applicable"  unit="#"      placeholder="0"    value={values.pregnancies}    onChangeText={v => setVal('pregnancies', v)}    keyboard="number-pad" isLast={false} />
          <NumericField label="Skin Thickness"     hint="Triceps skinfold"           unit="mm"     placeholder="20"   value={values.skin_thickness} onChangeText={v => setVal('skin_thickness', v)} isLast={false} />
          <NumericField label="Insulin"            hint="2-hour serum insulin"       unit="μU/ml"  placeholder="80"   value={values.insulin}        onChangeText={v => setVal('insulin', v)}        isLast={false} />
          <SliderField
            label="Pedigree Function"
            hint="Family history score"
            value={typeof values.diabetes_pedigree_function === 'number' ? values.diabetes_pedigree_function : 0.5}
            onChange={v => setVal('diabetes_pedigree_function', v)}
            min={0} max={2.5} step={0.05}
            isLast
          />
        </SectionCard>

        {/* Ready pill */}
        <ReadyPill allReady={!!allRequired} />

        {/* CTA */}
        <PrimaryCTA
          onPress={submit}
          loading={loading}
          disabled={!allRequired}
          label="Run assessment"
          icon="analytics-outline"
        />

        {/* ── Results ── */}
        {result && (() => {
          const pct = probability != null ? Math.round(probability * 100) : null;
          const rl = String(riskLevel).toLowerCase();
          const isHigh = rl.includes('high');
          const isMod  = rl.includes('mod');
          const rColor = isHigh ? '#C85A3A' : isMod ? '#B4781E' : T.sageDot;
          const rLvl   = isHigh ? 2 : isMod ? 1 : 0;
          const rLabel = isHigh ? 'High diabetes risk' : isMod ? 'Moderate diabetes risk' : 'Low diabetes risk';
          const rDesc  = isHigh
            ? 'Significant markers detected. Please seek medical advice promptly.'
            : isMod
              ? 'Some risk factors present. Consider lifestyle changes and a check-up.'
              : 'Your answers suggest low likelihood of type 2 diabetes. Keep up the healthy habits.';
          const segColors = [T.sageDot, '#B4781E', '#C85A3A'];
          const bmi = healthMetrics.bmi;
          const contextMsg = `I just completed a diabetes assessment. My result: ${pct != null ? pct + '%' : 'N/A'} probability, ${stripMd(riskLevel)}. BMI: ${bmi ?? 'N/A'}. Can you explain what this means and give me personalized advice?`;
          return (
            <View style={s.results}>
              <View style={s.divider} />
              <View style={s.savedRow}>
                <Ionicons name="checkmark-circle" size={14} color={T.sageDot} />
                <Text style={s.savedText}>Saved to your account</Text>
              </View>

              <View style={s.circleWrap}>
                <View style={[s.circle, { borderColor: rColor + '40', backgroundColor: rColor + '0E' }]}>
                  <Text style={[s.circleVal, { color: rColor }]}>{pct != null ? `${pct}%` : '—'}</Text>
                  <Text style={s.circleUnit}>RISK</Text>
                </View>
                <Text style={[s.riskTitle, { color: rColor }]}>{rLabel}</Text>
                <Text style={s.riskDesc}>{rDesc}</Text>
              </View>

              <View style={s.barRow}>
                {segColors.map((c, i) => (
                  <View key={i} style={[s.barSeg, { backgroundColor: c, opacity: i === rLvl ? 1 : 0.15 }]} />
                ))}
              </View>
              <View style={s.barLabels}>
                <Text style={s.barLabel}>Low (&lt;30%)</Text>
                <Text style={s.barLabel}>Medium</Text>
                <Text style={s.barLabel}>High (&gt;60%)</Text>
              </View>

              <View style={s.detailGrid}>
                {[
                  { label: 'TYPE',       val: 'Type 2' },
                  { label: 'RISK LEVEL', val: pct != null ? `${pct}%` : '—' },
                  { label: 'TIME',       val: '2 min' },
                  { label: 'QUESTIONS',  val: '9 / 9' },
                ].map((cell) => (
                  <View key={cell.label} style={s.detailCell}>
                    <Text style={s.detailLabel}>{cell.label}</Text>
                    <Text style={s.detailVal}>{cell.val}</Text>
                  </View>
                ))}
              </View>

              {executiveSummary ? (
                <CollapsibleCard icon="document-text-outline" iconColor={T.sageDot} title="Executive Summary" startOpen={false}>
                  <Text style={s.bodyText}>{stripMd(executiveSummary)}</Text>
                </CollapsibleCard>
              ) : null}
              {keyFactors.length > 0 && (
                <CollapsibleCard icon="warning-outline" iconColor="#B4781E" title="Key Risk Factors" startOpen>
                  <FactorsList factors={keyFactors} />
                </CollapsibleCard>
              )}
              {(healthMetrics.bmi != null || healthMetrics.health_score != null) && (
                <CollapsibleCard icon="bar-chart-outline" iconColor="#A7896C" title="Health Metrics" startOpen={false}>
                  <MetricsGrid metrics={healthMetrics} />
                </CollapsibleCard>
              )}

              <View style={s.actionRow}>
                <Pressable style={s.btnSave} onPress={() => shareResult('Diabetes Assessment — Bonus Life AI', [
                  `Date: ${new Date().toLocaleDateString()}`,
                  `Risk: ${pct != null ? pct + '%' : '—'} probability — ${stripMd(riskLevel)}`,
                  `BMI: ${healthMetrics.bmi ?? '—'}`,
                  `Health Score: ${healthMetrics.health_score ?? '—'}`,
                  executiveSummary ? `Summary: ${stripMd(executiveSummary)}` : '',
                ].filter(Boolean))}>
                  <Ionicons name="download-outline" size={15} color={T.inkSub} />
                  <Text style={s.btnSaveText}>Save PDF</Text>
                </Pressable>
                <Pressable style={s.btnAskAI} onPress={() => navigation.navigate('ChatTab', { screen: 'Chat', params: { context: contextMsg } })}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#FFFFFF" />
                  <Text style={s.btnAskAIText}>Ask AI</Text>
                </Pressable>
              </View>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { padding: 20, paddingTop: 16 },

  results:   { marginTop: 10 },
  divider:   { height: 0.5, backgroundColor: T.line, marginBottom: 20 },
  savedRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  savedText: { fontSize: 13, color: T.sageDot, fontWeight: '600' },

  circleWrap: { alignItems: 'center', marginBottom: 20 },
  circle:     { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  circleVal:  { fontSize: 38, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', lineHeight: 42 },
  circleUnit: { fontSize: 9, fontWeight: '700', color: T.inkMute, letterSpacing: 1.2 },
  riskTitle:  { fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', marginBottom: 6 },
  riskDesc:   { fontSize: 13, color: T.inkSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 },

  barRow:    { flexDirection: 'row', gap: 4, marginBottom: 6, marginTop: 4 },
  barSeg:    { flex: 1, height: 6, borderRadius: 3 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  barLabel:  { fontSize: 9, color: T.inkMute, fontWeight: '500' },

  detailGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailCell:  { width: '47.5%', backgroundColor: T.white, borderRadius: 10, padding: 14, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  detailLabel: { fontSize: 9, fontWeight: '700', color: T.inkMute, letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  detailVal:   { fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: T.ink },

  bodyText: { fontSize: 14, color: T.inkSub, lineHeight: 22 },

  actionRow:   { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  btnSave:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 12, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  btnSaveText: { fontSize: 14, fontWeight: '600', color: T.inkSub },
  btnAskAI:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 12, backgroundColor: T.sage, shadowColor: T.sage, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnAskAIText:{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
