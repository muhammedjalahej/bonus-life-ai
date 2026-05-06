/**
 * Bonus Life AI — Shared Pro UI Components
 * Cinema Dark · Glassmorphism · Spring animations
 * No emojis. Ionicons only.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, FONT } from '../config/theme';

/* ── Screen shell — cinematic gradient background ────────────────────────── */
export function ScreenShell({ children, style }) {
  return (
    <View style={[ss.root, style]}>
      <LinearGradient colors={['#0a0a0f', '#050506', '#020203']} style={StyleSheet.absoluteFill} />
      <View style={ss.blob1} pointerEvents="none" />
      <View style={ss.blob2} pointerEvents="none" />
      {children}
    </View>
  );
}
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050506' },
  blob1: { position:'absolute', top:60,  left:-80,  width:240, height:240, borderRadius:120, backgroundColor:'rgba(124,58,237,0.07)' },
  blob2: { position:'absolute', top:320, right:-60, width:180, height:180, borderRadius:90,  backgroundColor:'rgba(6,182,212,0.05)'  },
});

/* ── Glass card ──────────────────────────────────────────────────────────── */
export function GlassCard({ children, style, accent }) {
  return (
    <View style={[gc.card, style]}>
      {accent && <View style={[gc.shimmer, { backgroundColor: accent + '40' }]} />}
      {children}
    </View>
  );
}
const gc = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  shimmer: { height: 1 },
});

/* ── Section label ───────────────────────────────────────────────────────── */
export function SectionLabel({ label, style }) {
  return (
    <Text style={[sl.text, style]}>{label}</Text>
  );
}
const sl = StyleSheet.create({
  text: { fontSize: 10, fontWeight: '800', color: 'rgba(138,143,152,0.7)', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 },
});

/* ── CTA Button — violet→cyan gradient ───────────────────────────────────── */
export function CTAButton({ onPress, label, icon, loading, disabled, color = 'violet' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  const colors = color === 'violet'
    ? (disabled || loading ? ['#2d1b69','#2d1b69'] : ['#7C3AED','#06B6D4'])
    : (disabled || loading ? ['#064e3b','#064e3b'] : ['#059669','#10b981']);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={disabled || loading}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[btn.base, disabled && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={18} color="#fff" />}
              <Text style={btn.label}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
const btn = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#7C3AED', shadowOffset: { width:0, height:6 }, shadowOpacity:0.35, shadowRadius:14, elevation:6,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

/* ── Pressable row item ───────────────────────────────────────────────────── */
export function RowItem({ label, hint, value, icon, iconColor = '#A78BFA', onPress, right, isLast, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.98, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, !isLast && ri.border]}>
      <Pressable style={ri.row} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        {icon && (
          <View style={[ri.icon, { backgroundColor: iconColor + '18', borderColor: iconColor + '35' }]}>
            <Ionicons name={icon} size={17} color={iconColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={ri.label}>{label}</Text>
          {hint ? <Text style={ri.hint}>{hint}</Text> : null}
        </View>
        {children}
        {value != null && <Text style={ri.value}>{value}</Text>}
        {right}
      </Pressable>
    </Animated.View>
  );
}
const ri = StyleSheet.create({
  row:   { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, gap:12 },
  border:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  icon:  { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1 },
  label: { fontSize:14, fontWeight:'600', color:'#EDEDEF' },
  hint:  { fontSize:11, color:'rgba(138,143,152,0.7)', marginTop:2 },
  value: { fontSize:14, fontWeight:'700', color:'rgba(237,237,239,0.9)' },
});

/* ── Badge chip ──────────────────────────────────────────────────────────── */
export function Chip({ label, color = '#7C3AED', size = 'md' }) {
  const small = size === 'sm';
  return (
    <View style={[ch.chip, { backgroundColor: color + '18', borderColor: color + '35' }]}>
      <Text style={[ch.text, { color, fontSize: small ? 10 : 12 }]}>{label}</Text>
    </View>
  );
}
const ch = StyleSheet.create({
  chip: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  text: { fontWeight: '700', letterSpacing: 0.3 },
});

/* ── Risk meter — replaces emoji ─────────────────────────────────────────── */
export function RiskMeter({ probability, riskLevel }) {
  const pct    = probability != null ? (probability * 100).toFixed(1) : '—';
  const isHigh = String(riskLevel).toLowerCase().includes('high');
  const isMod  = String(riskLevel).toLowerCase().includes('mod');
  const color  = isHigh ? '#f43f5e' : isMod ? '#f59e0b' : '#10b981';
  const icon   = isHigh ? 'warning-outline' : isMod ? 'analytics-outline' : 'shield-checkmark-outline';
  const fillW  = probability != null ? `${Math.min(100, probability * 100)}%` : '0%';

  return (
    <View style={rm.card}>
      <View style={[rm.iconRing, { backgroundColor: color + '14', borderColor: color + '40' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection:'row', alignItems:'baseline', gap:6 }}>
          <Text style={[rm.pct, { color }]}>{pct}<Text style={rm.pctUnit}>%</Text></Text>
          <View style={[rm.levelBadge, { backgroundColor: color + '18', borderColor: color + '35' }]}>
            <Text style={[rm.levelText, { color }]}>{riskLevel}</Text>
          </View>
        </View>
        <Text style={rm.desc}>Risk probability score</Text>
        {/* Progress bar */}
        <View style={rm.track}>
          <Animated.View style={[rm.fill, { width: fillW, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}
const rm = StyleSheet.create({
  card:      { flexDirection:'row', alignItems:'center', gap:16, padding:18, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:RADIUS.md, borderWidth:StyleSheet.hairlineWidth, borderColor:'rgba(255,255,255,0.08)', marginBottom:14 },
  iconRing:  { width:60, height:60, borderRadius:18, alignItems:'center', justifyContent:'center', borderWidth:1.5 },
  pct:       { fontSize:40, fontWeight:'800', lineHeight:44 },
  pctUnit:   { fontSize:18, fontWeight:'600' },
  levelBadge:{ borderRadius:RADIUS.full, paddingHorizontal:8, paddingVertical:3, borderWidth:1 },
  levelText: { fontSize:11, fontWeight:'700' },
  desc:      { fontSize:12, color:'rgba(138,143,152,0.6)' },
  track:     { height:4, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden', marginTop:6 },
  fill:      { height:4, borderRadius:2 },
});

/* ── Metric grid card ────────────────────────────────────────────────────── */
export function MetricsGrid({ items }) {
  // items: [{label, value, icon, color}]
  return (
    <View style={mg.grid}>
      {items.map((item, i) => (
        <View key={i} style={mg.cell}>
          <View style={[mg.iconWrap, { backgroundColor: (item.color || COLORS.violet) + '18' }]}>
            <Ionicons name={item.icon || 'analytics-outline'} size={16} color={item.color || COLORS.violet} />
          </View>
          <Text style={[mg.value, { color: item.color || '#EDEDEF' }]}>{item.value}</Text>
          <Text style={mg.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
const mg = StyleSheet.create({
  grid: { flexDirection:'row', gap:10, flexWrap:'wrap' },
  cell: { flex:1, minWidth:90, backgroundColor:'rgba(255,255,255,0.04)', borderRadius:RADIUS.md, padding:14, alignItems:'center', borderWidth:StyleSheet.hairlineWidth, borderColor:'rgba(255,255,255,0.07)' },
  iconWrap: { width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center', marginBottom:8 },
  value: { fontSize:22, fontWeight:'800', marginBottom:3 },
  label: { fontSize:10, color:'rgba(138,143,152,0.7)', textAlign:'center', letterSpacing:0.3 },
});

/* ── Key factors list ────────────────────────────────────────────────────── */
export function FactorsList({ factors }) {
  if (!factors?.length) return null;
  return (
    <View style={fl.wrap}>
      {factors.map((f, i) => {
        const sev = (f.severity || '').toLowerCase();
        const color = sev.includes('high') ? '#f43f5e' : sev.includes('mod') ? '#f59e0b' : '#10b981';
        const icon  = sev.includes('high') ? 'alert-circle' : sev.includes('mod') ? 'warning' : 'checkmark-circle';
        return (
          <View key={i} style={fl.row}>
            <Ionicons name={icon} size={16} color={color} />
            <View style={{ flex:1 }}>
              <Text style={fl.text}>{String(f.factor || f).replace(/\*\*/g, '')}</Text>
              {f.severity && <Chip label={f.severity} color={color} size="sm" />}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const fl = StyleSheet.create({
  wrap: { gap: 12 },
  row:  { flexDirection:'row', gap:10, alignItems:'flex-start' },
  text: { fontSize:14, color:'rgba(237,237,239,0.85)', lineHeight:21, marginBottom:4 },
});

/* ── Input field ─────────────────────────────────────────────────────────── */
export function FormField({ label, hint, value, onChangeText, placeholder, keyboardType, focused, onFocus, onBlur, inputRef }) {
  return (
    <View style={ff.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={ff.label}>{label}</Text>
        {hint ? <Text style={ff.hint}>{hint}</Text> : null}
      </View>
      <View style={[ff.inputWrap, focused && ff.inputFocused]}>
        <TextInput
          style={ff.input}
          ref={inputRef}
          placeholder={placeholder}
          placeholderTextColor="rgba(138,143,152,0.4)"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'decimal-pad'}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    </View>
  );
}
const ff = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  label:       { fontSize: 14, fontWeight: '600', color: '#EDEDEF' },
  hint:        { fontSize: 11, color: 'rgba(138,143,152,0.6)', marginTop: 2 },
  inputWrap:   { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  inputFocused:{ borderColor: 'rgba(167,139,250,0.55)', backgroundColor: 'rgba(124,58,237,0.08)' },
  input:       { paddingVertical: 9, paddingHorizontal: 13, color: '#EDEDEF', fontSize: 15, fontWeight: '600', minWidth: 100, textAlign: 'right' },
});
