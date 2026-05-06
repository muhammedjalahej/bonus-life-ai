/**
 * NearbyHospitalsScreen — Clinical Calm · Elevated
 * Peach-gradient map hero · Sage action rows · Recommendation strip · Dot-bullet list
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView,
  Animated, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const RECENT_KEY = '@bonuslife_recent_hospitals';
const MAX_RECENT = 10;

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

/* ── Dot color cycling for hospital rows ─────────────────────────────────── */
const DOT_CYCLE = [T.sage, T.peachDeep, T.amber, T.heart, T.sageDot];

/* ── Map grid overlay ─────────────────────────────────────────────────────── */
function MapGrid() {
  const N = 7;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: N }).map((_, i) => (
        <View
          key={`h${i}`}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: StyleSheet.hairlineWidth,
            top: `${((i + 1) / (N + 1)) * 100}%`,
            backgroundColor: 'rgba(35,75,62,0.08)',
          }}
        />
      ))}
      {Array.from({ length: N }).map((_, i) => (
        <View
          key={`v${i}`}
          style={{
            position: 'absolute', top: 0, bottom: 0,
            width: StyleSheet.hairlineWidth,
            left: `${((i + 1) / (N + 1)) * 100}%`,
            backgroundColor: 'rgba(35,75,62,0.08)',
          }}
        />
      ))}
      {/* Radial fade from center — lighter edges give depth */}
      <LinearGradient
        colors={['transparent', 'rgba(239,233,220,0.55)']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

/* ── Map hero ─────────────────────────────────────────────────────────────── */
function MapHero() {
  return (
    <View style={mh.card}>
      {/* Base gradient: peach top-right → cream-tan bottom-left */}
      <LinearGradient
        colors={['#F7E3D4', '#FAF0E6', '#EFE9DC']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Peach glow blob top-right */}
      <View style={[mh.blob, { top: -36, right: -36, backgroundColor: 'rgba(201,122,79,0.18)' }]} />
      {/* Cream-tan blob bottom-left */}
      <View style={[mh.blob, { bottom: -40, left: -40, backgroundColor: 'rgba(239,233,220,0.85)' }]} />

      {/* Grid overlay */}
      <MapGrid />

      {/* Concentric pulse rings + center pin */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
          {/* Ring 1 — 140px */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 70, borderWidth: 1, borderColor: 'rgba(201,122,79,0.14)' }} />
          {/* Ring 2 — 95px */}
          <View style={{ position: 'absolute', top: 22.5, left: 22.5, right: 22.5, bottom: 22.5,
            borderRadius: 47.5, borderWidth: 1, borderColor: 'rgba(201,122,79,0.24)' }} />
          {/* Ring 3 — 50px */}
          <View style={{ position: 'absolute', top: 44, left: 44, right: 44, bottom: 44,
            borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(201,122,79,0.36)' }} />
          {/* Center pin */}
          <View style={mh.pin}>
            <Ionicons name="location" size={20} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Scattered map dots with halos */}
      <View style={[mh.halo, { top: 19, left: 45, backgroundColor: 'rgba(35,75,62,0.1)' }]} />
      <View style={[mh.dot, { top: 26, left: 52, width: 10, height: 10, borderRadius: 5, backgroundColor: T.sage }]} />

      <View style={[mh.halo, { top: 27, right: 52, backgroundColor: 'rgba(201,169,117,0.14)' }]} />
      <View style={[mh.dot, { top: 34, right: 58, width: 8, height: 8, borderRadius: 4, backgroundColor: T.amber }]} />

      <View style={[mh.halo, { bottom: 22, left: 72, backgroundColor: 'rgba(201,122,79,0.12)' }]} />
      <View style={[mh.dot, { bottom: 30, left: 80, width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.peachDeep }]} />

      <View style={[mh.halo, { bottom: 18, right: 36, backgroundColor: 'rgba(74,122,102,0.12)' }]} />
      <View style={[mh.dot, { bottom: 26, right: 44, width: 9, height: 9, borderRadius: 4.5, backgroundColor: T.sageDot }]} />
    </View>
  );
}
const mh = StyleSheet.create({
  card: {
    height: 200, borderRadius: 20, overflow: 'hidden',
    marginBottom: 16, position: 'relative',
    shadowColor: '#C97A4F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 4,
  },
  blob: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  pin: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: T.peachDeep,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.peachDeep, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  halo: { position: 'absolute', width: 26, height: 26, borderRadius: 13 },
  dot:  { position: 'absolute' },
});

/* ── Action row ───────────────────────────────────────────────────────────── */
function ActionRow({ variant = 'primary', icon, title, subtitle, onPress, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.98, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const isPrimary = variant === 'primary';
  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 8 }}>
      <Pressable
        style={[ar.row, isPrimary ? ar.primary : ar.secondary]}
        onPress={onPress} onPressIn={onIn} onPressOut={onOut}
        disabled={loading}
      >
        <View style={[ar.iconWrap, { backgroundColor: isPrimary ? 'rgba(255,255,255,0.16)' : 'rgba(35,75,62,0.1)' }]}>
          {loading
            ? <ActivityIndicator size="small" color={isPrimary ? T.cream : T.sage} />
            : <Ionicons name={icon} size={18} color={isPrimary ? T.cream : T.sage} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[ar.title, { color: isPrimary ? T.cream : T.ink }]}>{title}</Text>
          <Text style={[ar.sub, { color: isPrimary ? 'rgba(245,241,232,0.6)' : T.inkMute }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={isPrimary ? 'rgba(245,241,232,0.45)' : T.inkMute} />
      </Pressable>
    </Animated.View>
  );
}
const ar = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 16 },
  primary:  { backgroundColor: T.sage, shadowColor: T.sage, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 },
  secondary:{ backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sub:      { fontSize: 11.5 },
});


/* ── Hospital row ─────────────────────────────────────────────────────────── */
function HospitalRow({ h, index, isLast, dotColor, isPlaceholder }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.985, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,     damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const dot   = dotColor || (index % 3 === 0 ? T.sage : index % 3 === 1 ? T.heart : T.amber);
  const dist  = h.distance_km != null ? `${h.distance_km.toFixed(1)} km` : h.dist;

  const openMaps = () => {
    if (isPlaceholder || !h.lat) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}&travelmode=driving`);
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, !isLast && st.rowDivider]}>
      <Pressable style={st.row} onPress={openMaps} onPressIn={onIn} onPressOut={onOut} disabled={isPlaceholder}>
        {/* Dot bullet */}
        <View style={[st.dotBullet, { backgroundColor: dot }]} />

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.rowName, isPlaceholder && { color: T.inkSub }]} numberOfLines={1}>
            {h.name || 'Hospital'}
          </Text>
          <Text style={st.rowMeta} numberOfLines={1}>
            {h.address || h.meta || ''}
          </Text>
        </View>

        {/* Distance pill */}
        {dist != null && (
          <View style={st.distPill}>
            <Text style={st.distText}>{dist}</Text>
          </View>
        )}

        {/* Phone link */}
        {h.phone ? (
          <Pressable onPress={() => Linking.openURL('tel:' + h.phone)} hitSlop={8}>
            <Ionicons name="call-outline" size={16} color={T.sage} />
          </Pressable>
        ) : null}

        {/* Navigate */}
        {!isPlaceholder && h.lat ? (
          <Pressable
            style={st.dirBtn}
            onPress={(e) => { e.stopPropagation?.(); openMaps(); }}
            hitSlop={8}
          >
            <Ionicons name="navigate-outline" size={15} color={T.sage} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/* ── Location hook ───────────────────────────────────────────────────────── */
function useMyLocation(getHospitals, setLoading, setLocationError, setError) {
  return useCallback(async () => {
    setLocationError('');
    setError('');
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) { setLocationError('Browser does not support location.'); return; }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => getHospitals(pos.coords.latitude, pos.coords.longitude),
        ()    => { setLocationError('Location denied or unavailable.'); setLoading(false); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
      return;
    }
    try {
      const loc = await import('expo-location').then((m) => m.default || m);
      const { status } = await loc.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission denied.'); return; }
      setLoading(true);
      const position = await loc.getCurrentPositionAsync({ accuracy: loc.Accuracy.Balanced });
      getHospitals(position.coords.latitude, position.coords.longitude);
    } catch {
      setLocationError('Location unavailable. Try entering coordinates manually.');
      setLoading(false);
    }
  }, [getHospitals, setLoading, setLocationError, setError]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function HospitalsScreen() {
  const insets = useSafeAreaInsets();
  const [lat, setLat]                     = useState('');
  const [lon, setLon]                     = useState('');
  const [showManual, setShowManual]       = useState(false);
  const [loading, setLoading]             = useState(false);
  const [hospitals, setHospitals]         = useState([]);
  const [recentHospitals, setRecentHospitals] = useState([]);
  const [error, setError]                 = useState('');
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation]   = useState(null);
  const [latFocused, setLatFocused]       = useState(false);
  const [lonFocused, setLonFocused]       = useState(false);

  // Load persisted recent hospitals on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => { if (raw) setRecentHospitals(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  // Save a batch of hospitals to recent (deduplicated by name, capped at MAX_RECENT)
  const saveRecent = useCallback(async (incoming) => {
    if (!incoming?.length) return;
    try {
      const raw   = await AsyncStorage.getItem(RECENT_KEY);
      const prev  = raw ? JSON.parse(raw) : [];
      // merge — new ones first, deduplicate by name
      const seen  = new Set();
      const merged = [...incoming, ...prev].filter((h) => {
        const key = h.name || '';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(merged));
      setRecentHospitals(merged);
    } catch (_) {}
  }, []);

  const fetchHospitals = useCallback(async (latitude, longitude) => {
    setLoading(true); setError('');
    setUserLocation({ lat: latitude, lon: longitude });
    try {
      const res  = await api.getNearbyHospitals(latitude, longitude, 50, 25);
      const list = Array.isArray(res?.hospitals) ? res.hospitals : [];
      saveRecent(list);
      setHospitals(list);
    } catch (e) {
      const msg = e?.message || '';
      setError(
        msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('network')
          ? 'Request timed out. Check your connection and try again.'
          : msg || 'Could not fetch hospitals. Please try again.'
      );
      setHospitals([]);
    } finally { setLoading(false); }
  }, [saveRecent]);

  const onUseMyLocation = useMyLocation(fetchHospitals, setLoading, setLocationError, setError);

  const searchByCoords = () => {
    const la = parseFloat(lat), lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) {
      if (Platform.OS === 'web') window.alert('Enter valid latitude and longitude.');
      else Alert.alert('Invalid coordinates', 'Enter valid latitude and longitude.');
      return;
    }
    fetchHospitals(la, lo);
  };

  const hasRealResults   = !loading && hospitals.length > 0;
  const hasRecent        = recentHospitals.length > 0;
  const showRecentSection = !hasRealResults && hasRecent;

  return (
    <View style={st.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 16, paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Editorial heading ── */}
        <Text style={st.eyebrow}>FIND CARE</Text>
        <Text style={st.h1}>
          Find{' '}
          <Text style={st.h1Accent}>care</Text>
          {'\n'}near you.
        </Text>
        <Text style={st.subtitle}>
          Clinics, ERs, and specialists tailored to your risk profile.
        </Text>

        {/* ── Map hero ── */}
        <MapHero />

        {/* ── Action rows ── */}
        <ActionRow
          variant="primary"
          icon="locate-outline"
          title="Use my location"
          subtitle="Find hospitals around you instantly"
          onPress={onUseMyLocation}
          loading={loading}
        />
        <ActionRow
          variant="secondary"
          icon="map-outline"
          title="Enter coordinates"
          subtitle="Search a specific area or city"
          onPress={() => setShowManual(v => !v)}
        />

        {/* ── Manual coordinate inputs ── */}
        {showManual && (
          <View style={st.manualCard}>
            <Text style={st.manualLabel}>LATITUDE</Text>
            <View style={[st.inputWrap, latFocused && st.inputFocus]}>
              <TextInput
                style={st.input}
                placeholder="e.g. 41.015"
                value={lat}
                onChangeText={setLat}
                keyboardType="decimal-pad"
                placeholderTextColor={T.inkMute}
                onFocus={() => setLatFocused(true)}
                onBlur={() => setLatFocused(false)}
              />
            </View>
            <Text style={[st.manualLabel, { marginTop: 10 }]}>LONGITUDE</Text>
            <View style={[st.inputWrap, lonFocused && st.inputFocus]}>
              <TextInput
                style={st.input}
                placeholder="e.g. 28.979"
                value={lon}
                onChangeText={setLon}
                keyboardType="decimal-pad"
                placeholderTextColor={T.inkMute}
                onFocus={() => setLonFocused(true)}
                onBlur={() => setLonFocused(false)}
              />
            </View>
            <Pressable style={st.searchBtn} onPress={searchByCoords}>
              <Ionicons name="search-outline" size={15} color={T.cream} />
              <Text style={st.searchBtnText}>Search</Text>
            </Pressable>
          </View>
        )}

        {/* ── Errors ── */}
        {(locationError || error) ? (
          <View style={st.errorRow}>
            <Ionicons name="warning-outline" size={14} color={T.amber} />
            <Text style={st.errorText}>{locationError || error}</Text>
          </View>
        ) : null}

        {/* ── Loading ── */}
        {loading && (
          <View style={st.loadingRow}>
            <ActivityIndicator size="small" color={T.sage} />
            <Text style={st.loadingText}>Searching nearby hospitals…</Text>
          </View>
        )}

        {/* ── Current results ── */}
        {hasRealResults && (
          <>
            <View style={st.sectionRow}>
              <Text style={st.sectionLabel}>NEARBY HOSPITALS</Text>
              <View style={st.countPill}>
                <Text style={st.countText}>{hospitals.length} found</Text>
              </View>
            </View>
            <View style={st.list}>
              {hospitals.map((h, i) => (
                <HospitalRow
                  key={`${h.lat}-${h.lon}-${i}`}
                  h={h} index={i}
                  dotColor={DOT_CYCLE[i % DOT_CYCLE.length]}
                  isLast={i === hospitals.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Recently viewed (real, persisted) ── */}
        {showRecentSection && (
          <>
            <View style={st.sectionRow}>
              <Text style={st.sectionLabel}>RECENTLY VIEWED</Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  AsyncStorage.removeItem(RECENT_KEY).then(() => setRecentHospitals([]));
                }}
              >
                <Text style={st.clearText}>Clear</Text>
              </Pressable>
            </View>
            <View style={st.list}>
              {recentHospitals.map((h, i) => (
                <HospitalRow
                  key={`recent-${i}`}
                  h={h} index={i}
                  dotColor={DOT_CYCLE[i % DOT_CYCLE.length]}
                  isLast={i === recentHospitals.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Empty state — no results, no recents ── */}
        {!hasRealResults && !hasRecent && !loading && (
          <View style={st.emptyState}>
            <Ionicons name="location-outline" size={28} color="rgba(35,75,62,0.25)" />
            <Text style={st.emptyTitle}>No searches yet</Text>
            <Text style={st.emptyHint}>Tap "Use my location" to find hospitals near you</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { paddingHorizontal: 20 },

  /* Heading */
  eyebrow: { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 },
  h1: {
    fontSize: 34,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
    color: T.ink,
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 8,
  },
  h1Accent: { color: T.sage, fontStyle: 'italic' },
  subtitle: { fontSize: 13, color: T.inkSub, lineHeight: 20, marginBottom: 20 },

  /* Manual coords card */
  manualCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 0.5, borderColor: T.line, marginBottom: 8,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  manualLabel: { fontSize: 10, fontWeight: '700', color: T.inkMute, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 46,
    backgroundColor: T.cream3, borderRadius: 12,
    borderWidth: 0.5, borderColor: T.line,
  },
  inputFocus: { backgroundColor: '#FFFFFF', borderColor: T.sage },
  input:     { flex: 1, fontSize: 14, color: T.ink, paddingHorizontal: 14, outlineWidth: 0, outlineStyle: 'none' },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, marginTop: 14, backgroundColor: T.sage, borderRadius: 12,
    paddingVertical: 13,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 3,
  },
  searchBtnText: { fontSize: 14, color: T.cream, fontWeight: '700' },

  /* Error / loading */
  errorRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 16,
    backgroundColor: 'rgba(201,169,117,0.1)', borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: 'rgba(201,169,117,0.25)',
  },
  errorText:   { fontSize: 12, color: T.amber, flex: 1, lineHeight: 18 },
  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  loadingText: { fontSize: 13, color: T.inkSub },

  /* Section header */
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel:{ fontSize: 10, fontWeight: '800', color: T.inkMute, letterSpacing: 1.4, textTransform: 'uppercase' },
  countPill:  { backgroundColor: 'rgba(35,75,62,0.1)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  countText:  { fontSize: 11, fontWeight: '700', color: T.sage },

  /* Hospital list */
  list: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  dotBullet: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowName:   { fontSize: 13.5, fontWeight: '700', color: T.ink, marginBottom: 2 },
  rowMeta:   { fontSize: 11, color: T.inkMute },
  distPill: {
    backgroundColor: 'rgba(35,75,62,0.1)', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  distText: { fontSize: 11, fontWeight: '700', color: T.sage },
  dirBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(35,75,62,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  clearText: { fontSize: 12, color: T.inkMute, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.ink },
  emptyHint:  { fontSize: 13, color: T.inkMute, textAlign: 'center', lineHeight: 19 },
});
