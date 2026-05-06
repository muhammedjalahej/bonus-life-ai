/**
 * CKD — Chronic Kidney Disease Assessment — Elevated Clinical Calm
 * StepStrip · EditorialHeading · NumericField · SegmentedControl · ReadyPill
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Pressable, Animated, Platform, Share,
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
  heart:    '#C95D5D',
  amber:    '#C9A875',
  amberSoft:'#F5E8C8',
  amberDeep:'#9E7320',
  white:    '#FFFFFF',
};
const THEME = T.amber;          // CKD accent: warm amber
const THEME2 = T.amberDeep;    // darker shade for gradient bottom

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function stripMd(s) { return typeof s === 'string' ? s.replace(/\*\*/g, '') : s; }
const num = (v, d) => (v === '' || v == null ? d : parseFloat(String(v).replace(',', '.')));
const int = (v, d) => (v === '' || v == null ? d : parseInt(String(v), 10));

function shareResult(title, lines) {
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:0 20px;color:#1C1B18;line-height:1.7}h1{font-style:italic}hr{border:none;border-top:1px solid #ddd;margin:16px 0}@media print{button{display:none}}</style></head><body><button onclick="window.print()" style="margin-bottom:20px;padding:8px 16px;cursor:pointer">Print / Save PDF</button><h1>${title}</h1><hr>${lines.map(l=>`<p>${l}</p>`).join('')}</body></html>`);
    win.document.close();
  } else {
    Share.share({ title, message: `${title}\n\n${lines.join('\n')}` });
  }
}

/* ── StepStrip ───────────────────────────────────────────────────────────── */
function StepStrip() {
  return (
    <View style={ss.row}>
      <View style={ss.pill}>
        <Text style={ss.pillText}>Kidney panel</Text>
      </View>
      <Text style={ss.meta}>24 BIOMARKERS · 4 SECTIONS</Text>
    </View>
  );
}
const ss = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pill:     { backgroundColor: T.amberSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 12, color: THEME2, fontWeight: '400' },
  meta:     { fontSize: 9.5, fontWeight: '700', color: T.inkMute, letterSpacing: 1.2, textTransform: 'uppercase' },
});

/* ── EditorialHeading ────────────────────────────────────────────────────── */
function EditorialHeading({ done }) {
  return (
    <View style={eh.wrap}>
      <Text style={eh.h1}>
        {'Kidney disease\n'}
        <Text style={[eh.h1, { color: THEME2, fontStyle: 'italic' }]}>risk check.</Text>
      </Text>
      <Text style={eh.sub}>Clinical biomarkers for chronic kidney disease prediction.</Text>
    </View>
  );
}
const eh = StyleSheet.create({
  wrap: { marginBottom: 18 },
  h1:   { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 26, fontWeight: '400', color: T.ink, letterSpacing: -0.5, lineHeight: 32 },
  sub:  { fontSize: 12.5, color: T.inkSub, lineHeight: 19, marginTop: 6 },
});

/* ── ProgressDots ────────────────────────────────────────────────────────── */
function ProgressDots({ done }) {
  return (
    <View style={pd.row}>
      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
        {[0, 1].map(i => (
          i < (done ? 2 : 1)
            ? <View key={i} style={[pd.active, { backgroundColor: THEME }]} />
            : <View key={i} style={pd.inactive} />
        ))}
      </View>
      <Text style={pd.label}>{done ? 'COMPLETE' : 'BIOMARKERS · 50%'}</Text>
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
        <View style={[sc.iconBox, { backgroundColor: THEME + '20' }]}>
          <Ionicons name={icon} size={13} color={THEME2} />
        </View>
        <Text style={sc.title}>{title}</Text>
        <View style={[sc.tag, optional ? sc.tagOpt : sc.tagReq]}>
          <Text style={[sc.tagText, optional ? sc.tagOptText : sc.tagReqText]}>
            {optional ? 'Optional' : 'Required'}
          </Text>
        </View>
      </View>
      <View style={sc.card}>{children}</View>
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
  tagReq:     { backgroundColor: THEME + '18', borderWidth: 0.5, borderColor: THEME + '40' },
  tagOpt:     { backgroundColor: T.cream2 },
  tagText:    { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.3 },
  tagReqText: { color: THEME2 },
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
  pillFocused:{ borderColor: THEME + '66', backgroundColor: THEME + '08' },
  input:      { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 16, color: T.ink, flex: 1, textAlign: 'right', padding: 0, minWidth: 40, outlineWidth: 0, outlineStyle: 'none' },
  unit:       { fontSize: 10, color: T.inkMute, flexShrink: 0 },
});

/* ── SegmentedControl (binary toggles) ───────────────────────────────────── */
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
              colors={[THEME + 'CC', THEME2]}
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

/* ── ReadyPill ───────────────────────────────────────────────────────────── */
function ReadyPill({ allReady }) {
  return (
    <LinearGradient
      colors={['#F5EDD8', '#EDE3C4']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={rp.wrap}
    >
      <View style={[rp.icon, { backgroundColor: allReady ? THEME + '25' : T.line }]}>
        <Ionicons
          name={allReady ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={14}
          color={allReady ? THEME2 : T.inkMute}
        />
      </View>
      <Text style={rp.text}>
        {allReady
          ? <><Text style={[rp.accent, { color: THEME2 }]}>Required fields complete</Text> · ready to run</>
          : 'Fill Age, Blood Pressure, Hemoglobin, Packed Cell Volume and RBC Count'
        }
      </Text>
    </LinearGradient>
  );
}
const rp = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: '#D8CC99' },
  icon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text:   { flex: 1, fontSize: 12, color: T.inkSub, lineHeight: 18 },
  accent: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', fontSize: 12 },
});

/* ── PrimaryCTA ──────────────────────────────────────────────────────────── */
function PrimaryCTA({ onPress, loading, disabled }) {
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
              : <Text style={cta.disabledLabel}>Run CKD assessment</Text>
            }
          </View>
        ) : (
          <LinearGradient
            colors={[THEME, THEME2]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={cta.btn}
          >
            <View style={cta.highlight} />
            <Ionicons name="water-outline" size={18} color="#FFFFFF" />
            <Text style={cta.label}>Run CKD assessment</Text>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}
const cta = StyleSheet.create({
  btn:          { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: THEME2, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  highlight:    { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  label:        { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled:     { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.white, borderWidth: StyleSheet.hairlineWidth, borderColor: T.line },
  disabledLabel:{ color: T.inkMute, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
});

/* ── Result sub-components ───────────────────────────────────────────────── */
function InfoCard({ icon, iconColor, title, children, collapsible, startOpen }) {
  const [open, setOpen] = useState(startOpen !== false);
  return (
    <View style={ic.card}>
      <Pressable style={ic.header} onPress={collapsible ? () => setOpen(o => !o) : undefined}>
        <Ionicons name={icon} size={15} color={iconColor} />
        <Text style={ic.title}>{title}</Text>
        {collapsible && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={T.inkMute} />}
      </Pressable>
      {(!collapsible || open) && <View style={ic.body}>{children}</View>}
    </View>
  );
}
const ic = StyleSheet.create({
  card:   { backgroundColor: T.white, borderRadius: 14, marginBottom: 14, borderWidth: 0.5, borderColor: T.line, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  title:  { flex: 1, fontSize: 11, fontWeight: '700', color: T.inkSub, textTransform: 'uppercase', letterSpacing: 0.8 },
  body:   { paddingHorizontal: 16, paddingBottom: 16 },
});

function FactorsList({ factors }) {
  if (!factors?.length) return null;
  return (
    <View style={{ gap: 12 }}>
      {factors.map((f, i) => {
        const sev   = (f.severity || '').toLowerCase();
        const color = sev.includes('high') ? '#C85A3A' : sev.includes('mod') ? '#B4781E' : T.sageDot;
        const icon  = sev.includes('high') ? 'alert-circle' : sev.includes('mod') ? 'warning' : 'checkmark-circle';
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name={icon} size={16} color={color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: T.inkSub, lineHeight: 21, marginBottom: 4 }}>{stripMd(f.factor || f)}</Text>
              {f.severity && (
                <View style={{ alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, backgroundColor: color + '10', borderColor: color + '25' }}>
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

/* ── Defaults ────────────────────────────────────────────────────────────── */
const DEFAULT = {
  age: '', blood_pressure: '',
  specific_gravity: '', albumin: '', sugar: '',
  red_blood_cells: '0', pus_cell: '0', pus_cell_clumps: '0', bacteria: '0',
  blood_glucose_random: '', blood_urea: '', serum_creatinine: '',
  sodium: '', potassium: '', hemoglobin: '', packed_cell_volume: '',
  white_blood_cell_count: '', red_blood_cell_count: '',
  hypertension: '0', diabetes_mellitus: '0', coronary_artery_disease: '0',
  appetite: '1', pedal_edema: '0', anemia: '0',
};

/* ── Main screen ─────────────────────────────────────────────────────────── */
export default function CKDScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(DEFAULT);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const setVal = (k, v) => setValues(p => ({ ...p, [k]: v }));

  const allRequired = values.age && values.blood_pressure &&
    values.hemoglobin && values.packed_cell_volume && values.red_blood_cell_count;

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
    else Alert.alert(title, msg);
  };

  const submit = async () => {
    if (!allRequired) {
      showAlert('Missing Fields', 'Please fill: Age, Blood Pressure, Hemoglobin, Packed Cell Volume, and RBC Count.');
      return;
    }
    const payload = {
      age:                    num(values.age, 0),
      blood_pressure:         num(values.blood_pressure, 80),
      specific_gravity:       num(values.specific_gravity, 1.02),
      albumin:                int(values.albumin, 0),
      sugar:                  int(values.sugar, 0),
      red_blood_cells:        int(values.red_blood_cells, 0),
      pus_cell:               int(values.pus_cell, 0),
      pus_cell_clumps:        int(values.pus_cell_clumps, 0),
      bacteria:               int(values.bacteria, 0),
      blood_glucose_random:   num(values.blood_glucose_random, 120),
      blood_urea:             num(values.blood_urea, 25),
      serum_creatinine:       num(values.serum_creatinine, 1.0),
      sodium:                 num(values.sodium, 140),
      potassium:              num(values.potassium, 4.5),
      hemoglobin:             num(values.hemoglobin, 13),
      packed_cell_volume:     num(values.packed_cell_volume, 40),
      white_blood_cell_count: num(values.white_blood_cell_count, 7800),
      red_blood_cell_count:   num(values.red_blood_cell_count, 5),
      hypertension:           int(values.hypertension, 0),
      diabetes_mellitus:      int(values.diabetes_mellitus, 0),
      coronary_artery_disease:int(values.coronary_artery_disease, 0),
      appetite:               int(values.appetite, 1),
      pedal_edema:            int(values.pedal_edema, 0),
      anemia:                 int(values.anemia, 0),
      language: 'english',
    };
    setLoading(true); setResult(null);
    try { setResult(await api.runCKDAssessment(payload)); }
    catch (e) { showAlert('Error', e.message || 'Assessment failed. Make sure the backend is running.'); }
    finally { setLoading(false); }
  };

  const prediction = result?.prediction || 'N/A';
  const confNum    = result?.confidence != null ? result.confidence : 0;
  const confidence = result?.confidence != null ? (result.confidence * 100).toFixed(1) : '—';
  const summary    = result?.executive_summary || '';
  const factors    = result?.risk_analysis?.key_factors || [];
  const recs       = result?.recommendations?.lifestyle_changes || [];

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StepStrip />
        <EditorialHeading />
        <ProgressDots done={!!result} />

        {/* Patient Info */}
        <SectionCard icon="person-outline" title="Patient Info" optional={false}>
          <NumericField label="Age"            hint="Years"                  unit="yrs"  placeholder="48"  value={values.age}            onChangeText={v => setVal('age', v)}            keyboard="number-pad" required isLast={false} />
          <NumericField label="Blood Pressure" hint="Diastolic reading"      unit="mmHg" placeholder="80"  value={values.blood_pressure} onChangeText={v => setVal('blood_pressure', v)} required isLast />
        </SectionCard>

        {/* Urine Tests */}
        <SectionCard icon="flask-outline" title="Urine Tests" optional>
          <NumericField label="Specific Gravity"   hint="Urine concentration"  unit=""      placeholder="1.02" value={values.specific_gravity} onChangeText={v => setVal('specific_gravity', v)} isLast={false} />
          <NumericField label="Albumin"            hint="Protein level (0–5)"  unit=""      placeholder="0"    value={values.albumin}          onChangeText={v => setVal('albumin', v)}          keyboard="number-pad" isLast={false} />
          <NumericField label="Sugar"              hint="Glucose level (0–5)"  unit=""      placeholder="0"    value={values.sugar}            onChangeText={v => setVal('sugar', v)}            keyboard="number-pad" isLast={false} />
          <SegmentedControl label="Red Blood Cells" hint="Urine microscopy"   options={[['0','Normal'],['1','Abnormal']]}      value={values.red_blood_cells}   onChange={v => setVal('red_blood_cells', v)}   isLast={false} />
          <SegmentedControl label="Pus Cell"                                  options={[['0','Normal'],['1','Abnormal']]}      value={values.pus_cell}          onChange={v => setVal('pus_cell', v)}          isLast={false} />
          <SegmentedControl label="Pus Cell Clumps"                           options={[['0','Not Present'],['1','Present']]}  value={values.pus_cell_clumps}   onChange={v => setVal('pus_cell_clumps', v)}   isLast={false} />
          <SegmentedControl label="Bacteria"                                  options={[['0','Not Present'],['1','Present']]}  value={values.bacteria}          onChange={v => setVal('bacteria', v)}          isLast />
        </SectionCard>

        {/* Blood Tests */}
        <SectionCard icon="pulse-outline" title="Blood Tests" optional={false}>
          <NumericField label="Blood Glucose Random" hint="Random reading"        unit="mg/dL"  placeholder="120"  value={values.blood_glucose_random} onChangeText={v => setVal('blood_glucose_random', v)} isLast={false} />
          <NumericField label="Blood Urea"           hint="Urea nitrogen"         unit="mg/dL"  placeholder="25"   value={values.blood_urea}           onChangeText={v => setVal('blood_urea', v)}           isLast={false} />
          <NumericField label="Serum Creatinine"     hint="Kidney filtration"     unit="mg/dL"  placeholder="1.0"  value={values.serum_creatinine}     onChangeText={v => setVal('serum_creatinine', v)}     isLast={false} />
          <NumericField label="Sodium"               hint="Serum sodium"          unit="mEq/L"  placeholder="140"  value={values.sodium}               onChangeText={v => setVal('sodium', v)}               isLast={false} />
          <NumericField label="Potassium"            hint="Serum potassium"       unit="mEq/L"  placeholder="4.5"  value={values.potassium}            onChangeText={v => setVal('potassium', v)}            isLast={false} />
          <NumericField label="Hemoglobin"           hint="Blood haemoglobin"     unit="g/dL"   placeholder="15.4" value={values.hemoglobin}           onChangeText={v => setVal('hemoglobin', v)}           required isLast={false} />
          <NumericField label="Packed Cell Volume"   hint="Haematocrit"           unit="%"      placeholder="44"   value={values.packed_cell_volume}   onChangeText={v => setVal('packed_cell_volume', v)}   required isLast={false} />
          <NumericField label="WBC Count"            hint="White blood cells"     unit="/mm³"   placeholder="7800" value={values.white_blood_cell_count} onChangeText={v => setVal('white_blood_cell_count', v)} isLast={false} />
          <NumericField label="RBC Count"            hint="Red blood cells"       unit="M/mm³"  placeholder="5.2"  value={values.red_blood_cell_count} onChangeText={v => setVal('red_blood_cell_count', v)} required isLast />
        </SectionCard>

        {/* Medical History */}
        <SectionCard icon="medical-outline" title="Medical History" optional>
          <SegmentedControl label="Hypertension"           options={[['0','No'],['1','Yes']]}     value={values.hypertension}            onChange={v => setVal('hypertension', v)}            isLast={false} />
          <SegmentedControl label="Diabetes Mellitus"      options={[['0','No'],['1','Yes']]}     value={values.diabetes_mellitus}       onChange={v => setVal('diabetes_mellitus', v)}       isLast={false} />
          <SegmentedControl label="Coronary Artery Disease" options={[['0','No'],['1','Yes']]}    value={values.coronary_artery_disease} onChange={v => setVal('coronary_artery_disease', v)} isLast={false} />
          <SegmentedControl label="Appetite"               options={[['0','Poor'],['1','Good']]}  value={values.appetite}                onChange={v => setVal('appetite', v)}                isLast={false} />
          <SegmentedControl label="Pedal Edema"            options={[['0','No'],['1','Yes']]}     value={values.pedal_edema}             onChange={v => setVal('pedal_edema', v)}             isLast={false} />
          <SegmentedControl label="Anemia"                 options={[['0','No'],['1','Yes']]}     value={values.anemia}                  onChange={v => setVal('anemia', v)}                  isLast />
        </SectionCard>

        {/* Ready pill + CTA */}
        <ReadyPill allReady={!!allRequired} />
        <PrimaryCTA onPress={submit} loading={loading} disabled={!allRequired} />

        {/* ── Results ── */}
        {result && (() => {
          const isCKD     = prediction === 'CKD';
          const ckdRiskPct= Math.round(confNum * 100);
          const rColor    = ckdRiskPct >= 60 ? '#C85A3A' : ckdRiskPct >= 30 ? '#B4781E' : T.sageDot;
          const rLvl      = ckdRiskPct >= 60 ? 2 : ckdRiskPct >= 30 ? 1 : 0;
          const rLabel    = isCKD ? 'CKD detected' : 'No CKD detected';
          const rDesc     = isCKD
            ? 'Chronic kidney disease markers found. Please consult a nephrologist for further evaluation.'
            : 'No significant CKD indicators from your inputs. Maintain kidney health with hydration and regular checkups.';
          const segColors = [T.sageDot, '#B4781E', '#C85A3A'];
          const contextMsg = `I just completed a kidney disease (CKD) assessment. Result: ${prediction}, CKD risk ${ckdRiskPct}%. Can you explain what this means and give me personalized advice?`;
          return (
            <View style={s.results}>
              <View style={s.divider} />
              <View style={s.savedRow}>
                <Ionicons name="checkmark-circle" size={14} color={T.sageDot} />
                <Text style={s.savedText}>Saved to your account</Text>
              </View>

              {/* Score circle */}
              <View style={s.circleWrap}>
                <View style={[s.circle, { borderColor: rColor + '40', backgroundColor: rColor + '0E' }]}>
                  <Text style={[s.circleVal, { color: rColor }]}>{ckdRiskPct}%</Text>
                  <Text style={s.circleUnit}>RISK</Text>
                </View>
                <Text style={[s.riskTitle, { color: rColor }]}>{rLabel}</Text>
                <Text style={s.riskDesc}>{rDesc}</Text>
              </View>

              {/* Risk bar */}
              <View style={s.barRow}>
                {segColors.map((c, i) => (
                  <View key={i} style={[s.barSeg, { backgroundColor: c, opacity: i === rLvl ? 1 : 0.15 }]} />
                ))}
              </View>
              <View style={s.barLabels}>
                <Text style={s.barLabel}>No CKD</Text>
                <Text style={s.barLabel}>Borderline</Text>
                <Text style={s.barLabel}>CKD</Text>
              </View>

              {/* Detail grid */}
              <View style={s.detailGrid}>
                {[
                  { label: 'RESULT',     val: prediction },
                  { label: 'RISK LEVEL', val: `${ckdRiskPct}%` },
                  { label: 'TYPE',       val: 'Kidney CKD' },
                  { label: 'BIOMARKERS', val: '24 / 24' },
                ].map(cell => (
                  <View key={cell.label} style={s.detailCell}>
                    <Text style={s.detailLabel}>{cell.label}</Text>
                    <Text style={s.detailVal}>{cell.val}</Text>
                  </View>
                ))}
              </View>

              {summary ? (
                <InfoCard icon="document-text-outline" iconColor={THEME2} title="Executive Summary" collapsible startOpen={false}>
                  <Text style={s.bodyText}>{stripMd(summary)}</Text>
                </InfoCard>
              ) : null}
              {factors.length > 0 && (
                <InfoCard icon="warning-outline" iconColor="#B4781E" title="Key Risk Factors" collapsible startOpen>
                  <FactorsList factors={factors} />
                </InfoCard>
              )}
              {recs.length > 0 && (
                <InfoCard icon="leaf-outline" iconColor={T.sageDot} title="Recommendations" collapsible startOpen>
                  {recs.map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                      <Ionicons name="checkmark-outline" size={14} color={T.sageDot} />
                      <Text style={s.bodyText}>{r}</Text>
                    </View>
                  ))}
                </InfoCard>
              )}

              <View style={s.actionRow}>
                <Pressable style={s.btnSave} onPress={() => shareResult('Kidney (CKD) Assessment — Bonus Life AI', [
                  `Date: ${new Date().toLocaleDateString()}`,
                  `Result: ${prediction}`,
                  `CKD Risk: ${ckdRiskPct}%`,
                  `Risk level: ${ckdRiskPct >= 60 ? 'High — CKD markers present' : ckdRiskPct >= 30 ? 'Moderate' : 'Low — No CKD detected'}`,
                  summary ? `Summary: ${stripMd(summary)}` : '',
                ].filter(Boolean))}>
                  <Ionicons name="download-outline" size={15} color={T.inkSub} />
                  <Text style={s.btnSaveText}>Save PDF</Text>
                </Pressable>
                <Pressable style={s.btnAskAI} onPress={() => navigation?.navigate('ChatTab', { screen: 'Chat', params: { context: contextMsg } })}>
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
