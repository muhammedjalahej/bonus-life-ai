/**
 * Heart Risk Assessment — Elevated Clinical Calm
 * CodeChips · YesNoToggle · SegmentedControl · SliderField · LiveSummaryPill
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
  sageDot:  '#4A7A66',
  sageSoft: '#E3EAE4',
  heart:    '#C95D5D',
  heartSoft:'#F5DADA',
  amber:    '#C9A875',
  white:    '#FFFFFF',
};
const THEME = T.heart;

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
function StepStrip({ pill, meta }) {
  return (
    <View style={ss.row}>
      <View style={[ss.pill, { backgroundColor: T.heartSoft }]}>
        <Text style={[ss.pillText, { color: T.heart }]}>{pill}</Text>
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

/* ── CodeChips ───────────────────────────────────────────────────────────── */
function CodeChips({ label, hint, options, value, onChange, isLast }) {
  return (
    <View style={[ch.wrap, !isLast && ch.border]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: hint ? 2 : 8 }}>
        <View style={ch.dot} />
        <Text style={ch.label}>{label}</Text>
      </View>
      {hint ? <Text style={ch.hint}>{hint}</Text> : null}
      <View style={ch.row}>
        {options.map(([val, lbl]) => {
          const active = String(value) === String(val);
          return (
            <Pressable
              key={val}
              style={[ch.chip, active && ch.chipActive]}
              onPress={() => onChange(String(val))}
            >
              <Text style={[ch.code, active && ch.codeActive]}>{val}</Text>
              {lbl ? <Text style={[ch.chipLbl, active && ch.chipLblActive]}>{lbl}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  wrap:         { paddingVertical: 12, paddingHorizontal: 14 },
  border:       { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  dot:          { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart, flexShrink: 0 },
  label:        { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:         { fontSize: 10.5, color: T.inkMute, marginBottom: 8 },
  row:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.line },
  chipActive:   { backgroundColor: T.ink, borderColor: T.ink },
  code:         { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 12, fontWeight: '700', color: T.inkSub },
  codeActive:   { color: T.white },
  chipLbl:      { fontSize: 11, fontWeight: '500', color: T.inkSub },
  chipLblActive:{ color: 'rgba(255,255,255,0.85)' },
});

/* ── YesNoToggle ─────────────────────────────────────────────────────────── */
function YesNoToggle({ label, hint, value, onChange, isLast }) {
  return (
    <View style={[yn.wrap, !isLast && yn.border]}>
      <View style={yn.left}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={yn.dot} />
          <Text style={yn.label}>{label}</Text>
        </View>
        {hint ? <Text style={yn.hint}>{hint}</Text> : null}
      </View>
      <View style={yn.row}>
        {/* Yes */}
        <Pressable
          style={[yn.btn, value === '1' && { backgroundColor: THEME, borderColor: THEME }]}
          onPress={() => onChange('1')}
        >
          {value === '1' && <Ionicons name="checkmark" size={11} color={T.white} />}
          <Text style={[yn.txt, value === '1' && { color: T.white }]}>Yes</Text>
        </Pressable>
        {/* No */}
        <Pressable
          style={[yn.btn, value === '0' && { backgroundColor: T.ink, borderColor: T.ink }]}
          onPress={() => onChange('0')}
        >
          {value === '0' && <Ionicons name="close" size={11} color={T.white} />}
          <Text style={[yn.txt, value === '0' && { color: T.white }]}>No</Text>
        </Pressable>
      </View>
    </View>
  );
}
const yn = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, gap: 10 },
  border:{ borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  left:  { flex: 1 },
  dot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart },
  label: { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:  { fontSize: 10.5, color: T.inkMute, marginTop: 2 },
  row:   { flexDirection: 'row', gap: 6 },
  btn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, backgroundColor: T.white, borderWidth: 0.5, borderColor: T.line },
  txt:   { fontSize: 12, fontWeight: '600', color: T.inkSub },
});

/* ── SliderField ─────────────────────────────────────────────────────────── */
function SliderField({ label, hint, value, onChange, min, max, step, isLast }) {
  const trackWidth = useRef(0);
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const snap  = (v) => step ? Math.round(v / step) * step : v;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      if (!trackWidth.current) return;
      const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth.current));
      onChange(parseFloat(snap(clamp(min + pct * (max - min))).toFixed(2)));
    },
    onPanResponderMove: (e) => {
      if (!trackWidth.current) return;
      const pct = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth.current));
      onChange(parseFloat(snap(clamp(min + pct * (max - min))).toFixed(2)));
    },
  })).current;

  const pct = (value - min) / (max - min);
  const displayVal = typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : '0';

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
  wrap:      { paddingVertical: 14, paddingHorizontal: 14 },
  border:    { borderBottomWidth: 0.5, borderBottomColor: T.cream2 },
  labelRow:  { marginBottom: 14 },
  dot:       { width: 5, height: 5, borderRadius: 2.5, backgroundColor: T.heart, flexShrink: 0 },
  label:     { fontSize: 12.5, fontWeight: '600', color: T.ink },
  hint:      { fontSize: 10.5, color: T.inkMute, marginTop: 2 },
  trackWrap: { position: 'relative', height: 28, justifyContent: 'center', marginHorizontal: 8 },
  track:     { height: 4, backgroundColor: T.line, borderRadius: 2, overflow: 'hidden' },
  fill:      { height: 4, borderRadius: 2 },
  thumb:     { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: T.white, borderWidth: 2, marginLeft: -9, top: 5, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  thumbInner:{ width: 6, height: 6, borderRadius: 3 },
  valRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  rangeText: { fontSize: 10, color: T.inkMute, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic' },
  currentVal:{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontSize: 13, fontWeight: '700' },
});

/* ── LiveSummaryPill ─────────────────────────────────────────────────────── */
function LiveSummaryPill({ values }) {
  const required = ['age', 'trestbps', 'chol', 'thalach'];
  const filled = required.filter(k => values[k] && values[k] !== '').length;
  const total  = 13;
  const allFilledRequired = filled === required.length;
  const label = allFilledRequired
    ? `All required fields complete · `
    : `${filled} / ${required.length} required fields · `;
  const accent = allFilledRequired ? 'Estimated read · 8 sec' : 'fill remaining to proceed';
  return (
    <LinearGradient
      colors={['#F5E8E8', '#F0DDD8']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={lp.wrap}
    >
      <View style={[lp.icon, { backgroundColor: THEME + '18' }]}>
        <Ionicons name="heart-outline" size={14} color={THEME} />
      </View>
      <Text style={lp.text} numberOfLines={2}>
        {label}
        <Text style={[lp.accent, { color: THEME }]}>{accent}</Text>
      </Text>
    </LinearGradient>
  );
}
const lp = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 0.5, borderColor: '#E5D0D0' },
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
            colors={[T.heart + 'CC', T.heart]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={cta.btn}
          >
            <View style={cta.highlight} />
            <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
            <Text style={cta.label}>{label}</Text>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}
const cta = StyleSheet.create({
  btn:          { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: T.heart, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  highlight:    { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
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

/* ── Defaults ────────────────────────────────────────────────────────────── */
const DEFAULT = {
  age: '', sex: '1', cp: '1', trestbps: '', chol: '', fbs: '0', restecg: '0',
  thalach: '', exang: '0', oldpeak: 0, slope: '1', ca: '0', thal: '3',
};

/* ── Main screen ─────────────────────────────────────────────────────────── */
export default function HeartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(DEFAULT);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const setVal = (k, v) => setValues(p => ({ ...p, [k]: v }));

  const allRequired = values.age && values.trestbps && values.chol && values.thalach;

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
    else Alert.alert(title, msg);
  };

  const submit = async () => {
    if (!allRequired) {
      showAlert('Missing fields', 'Please fill Age, Resting BP, Cholesterol, Max HR.');
      return;
    }
    const payload = {
      age:      int(values.age, 0),
      sex:      int(values.sex, 1),
      cp:       int(values.cp, 1),
      trestbps: int(values.trestbps, 0),
      chol:     int(values.chol, 0),
      fbs:      int(values.fbs, 0),
      restecg:  int(values.restecg, 0),
      thalach:  int(values.thalach, 0),
      exang:    int(values.exang, 0),
      oldpeak:  typeof values.oldpeak === 'number' ? values.oldpeak : num(values.oldpeak, 0),
      slope:    int(values.slope, 1),
      ca:       int(values.ca, 0),
      thal:     int(values.thal, 3),
      language: 'english',
    };
    if (payload.age < 1 || payload.trestbps < 50 || payload.chol < 50 || payload.thalach < 40) {
      showAlert('Invalid values', 'Check: age ≥1, BP ≥50, chol ≥50, max HR ≥40.');
      return;
    }
    setLoading(true);
    setResult(null);
    try { setResult(await api.runHeartAssessment(payload)); }
    catch (e) { showAlert('Error', e.message || 'Assessment failed. Make sure the backend is running.'); }
    finally { setLoading(false); }
  };

  const riskLevel   = result?.risk_analysis?.risk_level || 'N/A';
  const probability = result?.risk_analysis?.probability;
  const summary     = result?.executive_summary || '';
  const factors     = result?.risk_analysis?.key_factors || [];
  const recs        = result?.recommendations?.lifestyle_changes || [];

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StepStrip pill="Cardiac panel" meta="14 INPUTS · 2 SECTIONS" />
        <EditorialHeading
          line1="Heart risk"
          accent="assessment."
          subtitle="Clinical values for AI-driven cardiovascular disease prediction."
        />
        <ProgressDots current={result ? 2 : 1} total={2} label={result ? 'COMPLETE' : 'DEMOGRAPHICS · 35%'} />

        {/* Demographics */}
        <SectionCard icon="person-outline" title="Demographics" optional={false}>
          <NumericField
            label="Age" hint="Your age in years" unit="yrs" placeholder="55"
            value={values.age} onChangeText={v => setVal('age', v)}
            keyboard="number-pad" required isLast={false}
          />
          <SegmentedControl
            label="Sex" options={[['0', 'Female'], ['1', 'Male']]}
            value={values.sex} onChange={v => setVal('sex', v)} isLast
          />
        </SectionCard>

        {/* Clinical Measurements */}
        <SectionCard icon="pulse-outline" title="Clinical Measurements" optional={false}>
          <CodeChips
            label="Chest Pain Type"
            options={[['0','Typical'],['1','Atypical'],['2','Non-anginal'],['3','Asymptomatic']]}
            value={values.cp} onChange={v => setVal('cp', v)} isLast={false}
          />
          <NumericField
            label="Resting BP" hint="Resting blood pressure (mmHg)" unit="mmHg" placeholder="130"
            value={values.trestbps} onChangeText={v => setVal('trestbps', v)}
            required isLast={false}
          />
          <NumericField
            label="Cholesterol" hint="Serum cholesterol" unit="mg/dL" placeholder="240"
            value={values.chol} onChangeText={v => setVal('chol', v)}
            required isLast={false}
          />
          <YesNoToggle
            label="Fasting Blood Sugar" hint="Greater than 120 mg/dL?"
            value={values.fbs} onChange={v => setVal('fbs', v)} isLast={false}
          />
          <CodeChips
            label="Resting ECG"
            options={[['0','Normal'],['1','ST-T abnormality'],['2','LV hypertrophy']]}
            value={values.restecg} onChange={v => setVal('restecg', v)} isLast={false}
          />
          <NumericField
            label="Max Heart Rate" hint="Achieved during stress" unit="bpm" placeholder="150"
            value={values.thalach} onChangeText={v => setVal('thalach', v)}
            keyboard="number-pad" required isLast={false}
          />
          <YesNoToggle
            label="Exercise-Induced Angina" hint="Pain triggered by exertion?"
            value={values.exang} onChange={v => setVal('exang', v)} isLast={false}
          />
          <SliderField
            label="ST Depression (oldpeak)"
            hint="Depression induced by exercise vs rest"
            value={typeof values.oldpeak === 'number' ? values.oldpeak : 0}
            onChange={v => setVal('oldpeak', v)}
            min={0} max={6} step={0.1} isLast={false}
          />
          <CodeChips
            label="ST Slope"
            options={[['1','Upsloping'],['2','Flat'],['3','Downsloping']]}
            value={values.slope} onChange={v => setVal('slope', v)} isLast={false}
          />
          <CodeChips
            label="Major Vessels" hint="Fluoroscopy colored vessels"
            options={[['0',''],['1',''],['2',''],['3',''],['4','']]}
            value={values.ca} onChange={v => setVal('ca', v)} isLast={false}
          />
          <CodeChips
            label="Thal" hint="Thalassemia status"
            options={[['3','Normal'],['6','Fixed defect'],['7','Reversible']]}
            value={values.thal} onChange={v => setVal('thal', v)} isLast
          />
        </SectionCard>

        {/* Live summary pill */}
        <LiveSummaryPill values={values} />

        {/* CTA */}
        <PrimaryCTA
          onPress={submit}
          loading={loading}
          disabled={!allRequired}
          label="Run cardiac assessment"
        />

        {/* ── Results ── */}
        {result && (() => {
          const pct = probability != null ? Math.round(probability * 100) : null;
          const rl = String(riskLevel).toLowerCase();
          const isHigh = rl.includes('high');
          const isMod  = rl.includes('mod');
          const rColor = isHigh ? '#C85A3A' : isMod ? '#B4781E' : T.sageDot;
          const rLvl   = isHigh ? 2 : isMod ? 1 : 0;
          const rLabel = isHigh ? 'High heart risk' : isMod ? 'Moderate heart risk' : 'Low heart risk';
          const rDesc  = isHigh
            ? 'Elevated risk detected. Consult a cardiologist as soon as possible.'
            : isMod
              ? 'Moderate risk. Monitor blood pressure, cholesterol and stress.'
              : 'Healthy heart indicators. Maintain regular physical activity.';
          const segColors = [T.sageDot, '#B4781E', '#C85A3A'];
          const contextMsg = `I just completed a heart disease assessment. My result: ${pct != null ? pct + '%' : 'N/A'} probability, ${stripMd(riskLevel)}. Can you explain what this means and give me personalized advice?`;
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
                  { label: 'TYPE',       val: 'Cardiovascular' },
                  { label: 'RISK LEVEL', val: pct != null ? `${pct}%` : '—' },
                  { label: 'TIME',       val: '3 min' },
                  { label: 'QUESTIONS',  val: '13 / 13' },
                ].map(cell => (
                  <View key={cell.label} style={s.detailCell}>
                    <Text style={s.detailLabel}>{cell.label}</Text>
                    <Text style={s.detailVal}>{cell.val}</Text>
                  </View>
                ))}
              </View>

              {summary ? (
                <InfoCard icon="document-text-outline" iconColor={T.sageDot} title="Executive Summary" collapsible startOpen={false}>
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
                <Pressable style={s.btnSave} onPress={() => shareResult('Heart Risk Assessment — Bonus Life AI', [
                  `Date: ${new Date().toLocaleDateString()}`,
                  `Risk: ${pct != null ? pct + '%' : '—'} probability — ${stripMd(riskLevel)}`,
                  summary ? `Summary: ${stripMd(summary)}` : '',
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
