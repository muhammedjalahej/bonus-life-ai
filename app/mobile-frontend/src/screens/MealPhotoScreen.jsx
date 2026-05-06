/**
 * MealAnalyzerScreen — Clinical Calm · Elevated
 * Lens hero · Sage/peach gradient · Viewfinder corners · Today's Log section
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../services/api';

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

/* ── Example meal log rows ───────────────────────────────────────────────── */
const EXAMPLE_MEALS = [
  { id: 'e1', name: 'Greek Salad',    meta: 'Lunch · 12:30 PM · Low glycemic',   kcal: 340, icon: 'leaf-outline',       bg: T.sageSoft  },
  { id: 'e2', name: 'Grilled Salmon', meta: 'Dinner · Yesterday · Heart-healthy', kcal: 580, icon: 'fish-outline',       bg: T.peachSoft },
  { id: 'e3', name: 'Oatmeal Bowl',   meta: 'Breakfast · Yesterday · High fiber', kcal: 290, icon: 'sunny-outline',      bg: T.cream2    },
];

/* ── Web camera overlay ──────────────────────────────────────────────────── */
function WebCameraOverlay({ videoRef, onCapture, onCancel }) {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container?.appendChild) return;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = true;
    video.style.cssText = 'width:100%;max-width:400px;height:auto;max-height:50vh;object-fit:cover;border-radius:16px;background:#F5F1E8;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;';
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:12px;';
    const captureBtn = document.createElement('button');
    captureBtn.textContent = 'Capture';
    captureBtn.onclick = onCapture;
    captureBtn.style.cssText = 'padding:14px 32px;background:#234B3E;color:#F5F1E8;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = onCancel;
    cancelBtn.style.cssText = 'padding:14px 24px;background:rgba(28,27,24,0.06);color:rgba(28,27,24,0.5);border:1px solid rgba(28,27,24,0.1);border-radius:14px;font-size:15px;cursor:pointer;';
    btnWrap.appendChild(captureBtn); btnWrap.appendChild(cancelBtn);
    wrap.appendChild(video); wrap.appendChild(btnWrap);
    container.appendChild(wrap);
    videoRef.current = video;
    return () => { try { container.removeChild(wrap); } catch (_) {} videoRef.current = null; };
  }, [onCapture, onCancel, videoRef]);
  return <View ref={containerRef} style={StyleSheet.absoluteFill} collapsable={false} />;
}

/* ── Viewfinder corner brackets ──────────────────────────────────────────── */
function ViewfinderCorners({ size = 26, thick = 2, color = 'rgba(35,75,62,0.45)', offset = 12 }) {
  const s = { position: 'absolute', width: size, height: size };
  return (
    <>
      <View style={[s, { top: offset, left: offset, borderTopWidth: thick, borderLeftWidth: thick, borderColor: color, borderTopLeftRadius: 4 }]} />
      <View style={[s, { top: offset, right: offset, borderTopWidth: thick, borderRightWidth: thick, borderColor: color, borderTopRightRadius: 4 }]} />
      <View style={[s, { bottom: offset, left: offset, borderBottomWidth: thick, borderLeftWidth: thick, borderColor: color, borderBottomLeftRadius: 4 }]} />
      <View style={[s, { bottom: offset, right: offset, borderBottomWidth: thick, borderRightWidth: thick, borderColor: color, borderBottomRightRadius: 4 }]} />
    </>
  );
}

/* ── Meal lens hero ──────────────────────────────────────────────────────── */
function MealLensHero() {
  return (
    <View style={lh.card}>
      {/* Background: sage top-left + peach bottom-right over cream base */}
      <LinearGradient
        colors={[T.cream3, T.cream, T.cream2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Sage tint blob top-left */}
      <View style={[lh.blob, { top: -30, left: -30, backgroundColor: 'rgba(35,75,62,0.07)' }]} />
      {/* Peach tint blob bottom-right */}
      <View style={[lh.blob, { bottom: -30, right: -30, backgroundColor: 'rgba(201,122,79,0.1)' }]} />

      {/* Viewfinder corners at card edges */}
      <ViewfinderCorners />

      {/* Center: 84px white lens */}
      <View style={lh.lensWrap}>
        <LinearGradient
          colors={[T.cream3, '#FFFFFF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={lh.lens}
        >
          {/* Dashed inner ring (8px inset) */}
          <View style={lh.dashedRing} />
          <Ionicons name="camera-outline" size={30} color={T.sage} />
        </LinearGradient>
      </View>

      {/* Text below lens */}
      <Text style={lh.frameLabel}>Frame your meal</Text>
      <Text style={lh.frameSub}>CENTER THE PLATE  ·  KEEP IT WELL-LIT</Text>
    </View>
  );
}
const lh = StyleSheet.create({
  card: {
    height: 280, borderRadius: 20, overflow: 'hidden',
    marginBottom: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C97A4F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 3,
  },
  blob: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  lensWrap: {
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 16,
  },
  lens: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: T.line,
  },
  dashedRing: {
    position: 'absolute', inset: 8,
    top: 8, left: 8, right: 8, bottom: 8,
    borderRadius: 34, borderWidth: 1,
    borderStyle: 'dashed', borderColor: 'rgba(35,75,62,0.2)',
  },
  frameLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    fontSize: 15, fontWeight: '400', color: T.ink, marginBottom: 6,
  },
  frameSub: {
    fontSize: 9, fontWeight: '700', color: T.inkMute,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
});

/* ── CTA button pair ──────────────────────────────────────────────────────── */
function CTABtn({ variant = 'primary', icon, label, onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 18, stiffness: 280, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 18, stiffness: 280, useNativeDriver: true }).start();
  const isPrimary = variant === 'primary';
  return (
    <Animated.View style={[{ flex: 1, transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress} onPressIn={onIn} onPressOut={onOut}
        disabled={disabled}
        style={[cb.btn, isPrimary ? cb.primary : cb.secondary, disabled && { opacity: 0.5 }]}
      >
        <Ionicons name={icon} size={18} color={isPrimary ? T.cream : T.sage} />
        <Text style={[cb.label, { color: isPrimary ? T.cream : T.sage }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  btn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  primary:   { backgroundColor: T.sage, shadowColor: T.sage, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 4 },
  secondary: { backgroundColor: T.sageSoft, borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)' },
  label:     { fontSize: 14.5, fontWeight: '700' },
});

/* ── Meal log row ─────────────────────────────────────────────────────────── */
function MealLogRow({ meal, isLast }) {
  return (
    <View style={[ml.row, !isLast && ml.rowDivider]}>
      {/* Tinted thumb */}
      <View style={[ml.thumb, { backgroundColor: meal.bg || T.sageSoft }]}>
        <Ionicons name={meal.icon || 'restaurant-outline'} size={18} color={T.sage} />
      </View>
      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ml.name} numberOfLines={1}>{meal.name}</Text>
        <Text style={ml.meta} numberOfLines={1}>{meal.meta}</Text>
      </View>
      {/* Kcal */}
      <View style={ml.kcalWrap}>
        <Text style={ml.kcalNum}>{meal.kcal}</Text>
        <Text style={ml.kcalUnit}>kcal</Text>
      </View>
    </View>
  );
}
const ml = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowDivider:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line },
  thumb:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:      { fontSize: 13.5, fontWeight: '700', color: T.ink, marginBottom: 2 },
  meta:      { fontSize: 11, color: T.inkMute },
  kcalWrap:  { alignItems: 'flex-end' },
  kcalNum: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 17, fontWeight: '700', color: T.sage,
  },
  kcalUnit:  { fontSize: 9, color: T.inkMute, fontWeight: '600', letterSpacing: 0.5 },
});

/* ── Nutrition stat cell ──────────────────────────────────────────────────── */
function NutriCell({ label, value, icon, color }) {
  return (
    <View style={[nc.cell, { borderColor: color + '22' }]}>
      <View style={[nc.icon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[nc.value, { color }]}>{value}</Text>
      <Text style={nc.label}>{label}</Text>
    </View>
  );
}
const nc = StyleSheet.create({
  cell:  { flex: 1, minWidth: '45%', alignItems: 'center', backgroundColor: 'rgba(28,27,24,0.02)', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, borderWidth: 0.5, gap: 5 },
  icon:  { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 10, color: T.inkMute, textAlign: 'center', letterSpacing: 0.3 },
});

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function MealPhotoScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [showWebCamera, setShowWebCamera] = useState(false);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !showWebCamera) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let stream = null;
    const t = setTimeout(() => {
      const media = navigator.mediaDevices?.getUserMedia;
      if (!media) { Alert.alert('Not supported', 'Camera not available.'); setShowWebCamera(false); return; }
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
        .then((s) => { stream = s; streamRef.current = s; video.srcObject = s; })
        .catch((err) => { Alert.alert('Camera error', err?.message || 'Could not access camera.'); setShowWebCamera(false); });
    }, 100);
    return () => { clearTimeout(t); stream?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [showWebCamera]);

  const runWithImage = (getBase64) => {
    setLoading(true); setResult(null);
    getBase64()
      .then((b64) => b64 ? analyze(b64) : undefined)
      .catch((e) => {
        const msg = e?.message || '';
        if (msg.includes('expo-image-picker')) Alert.alert('Install required', 'Run: npx expo install expo-image-picker');
        else Alert.alert('Error', msg || 'Failed to load image');
      })
      .finally(() => setLoading(false));
  };

  const captureWebPhoto = () => {
    const video = videoRef.current;
    if (!video?.srcObject || video.readyState < 2) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.8);
    const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    setShowWebCamera(false);
    runWithImage(() => Promise.resolve(b64));
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') { setShowWebCamera(true); return; }
    runWithImage(async () => {
      const IP = await import('expo-image-picker');
      const { status } = await IP.requestCameraPermissionsAsync?.();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return null; }
      const res = await IP.launchCameraAsync({ base64: true, quality: 0.8 });
      return res.canceled ? null : res.assets?.[0]?.base64 ?? null;
    });
  };

  const pickFromGallery = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target?.files?.[0];
        if (!file) { setLoading(false); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          runWithImage(() => Promise.resolve(b64));
        };
        reader.readAsDataURL(file);
      };
      input.click(); setLoading(false); return;
    }
    runWithImage(async () => {
      const IP = await import('expo-image-picker');
      const perm = await IP.requestMediaLibraryPermissionsAsync?.();
      if (perm?.status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return null; }
      const res = await IP.launchImageLibraryAsync({ base64: true, quality: 0.8 });
      return res.canceled ? null : res.assets?.[0]?.base64 ?? null;
    });
  };

  const analyze = async (base64) => {
    setLoading(true);
    try {
      const res = await api.analyzeMealPhoto(base64, false);
      setResult(res);
    } catch (e) {
      Alert.alert('Analysis failed', e.message || 'Please try again.');
    } finally { setLoading(false); }
  };

  // Build nutrition stats from result
  const nutriStats = result ? [
    { label: 'Calories', value: result.calories    || '—', icon: 'flame-outline',   color: T.heart    },
    { label: 'Carbs',    value: result.carb_level  || '—', icon: 'pizza-outline',   color: T.amber    },
    { label: 'Protein',  value: result.protein     || '—', icon: 'barbell-outline', color: T.sageDot  },
    { label: 'Fat',      value: result.fat          || '—', icon: 'water-outline',  color: T.peachDeep },
  ].filter((s) => s.value !== '—') : [];

  // Build today's log — most recent analysis + example rows
  const todayMeals = result
    ? [
        {
          id: 'latest',
          name: result.meal_name || 'Meal Analyzed',
          meta: `Just now · ${result.calories || '—'} kcal`,
          kcal: typeof result.calories === 'number' ? result.calories : parseInt(result.calories) || '—',
          icon: 'restaurant-outline',
          bg: T.sageSoft,
        },
        ...EXAMPLE_MEALS,
      ]
    : EXAMPLE_MEALS;

  return (
    <>
      <View style={st.root}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.scroll, { paddingTop: insets.top + 16, paddingBottom: 56 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Editorial heading ── */}
          <Text style={st.eyebrow}>MEAL ANALYZER</Text>
          <Text style={st.h1}>
            Snap your plate.{'\n'}Read your <Text style={st.h1Accent}>nutrients.</Text>
          </Text>
          <Text style={st.subtitle}>
            AI-powered macro breakdown — calories, protein, carbs, and risk flags in seconds.
          </Text>

          {/* ── Lens hero (visible before results) ── */}
          {!result && !loading && <MealLensHero />}

          {/* ── Loading state ── */}
          {loading && (
            <View style={st.loadingCard}>
              <ActivityIndicator color={T.sage} size="large" />
              <Text style={st.loadingTitle}>Analyzing your meal</Text>
              <Text style={st.loadingSub}>AI is reading the nutrients…</Text>
            </View>
          )}

          {/* ── CTA row (always shown except loading) ── */}
          {!loading && (
            <View style={st.ctaRow}>
              <CTABtn variant="primary"   icon="camera-outline" label="Take photo"   onPress={takePhoto}       />
              <CTABtn variant="secondary" icon="images-outline" label="From gallery" onPress={pickFromGallery} />
            </View>
          )}

          {/* ── Result card ── */}
          {result && !loading && (
            <View style={st.resultCard}>
              {/* Sage accent top bar */}
              <View style={st.resultBar} />

              {/* Meal header */}
              <View style={st.mealHeader}>
                <View style={st.mealIconWrap}>
                  <Ionicons name="restaurant-outline" size={20} color={T.sage} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.mealName} numberOfLines={2}>{result.meal_name || 'Meal Detected'}</Text>
                  <Text style={st.mealSub}>Nutrition breakdown</Text>
                </View>
                <View style={st.doneBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={T.sage} />
                  <Text style={st.doneBadgeText}>Done</Text>
                </View>
              </View>

              <View style={st.divider} />

              {/* Nutrition grid */}
              {nutriStats.length > 0 && (
                <View style={st.nutriGrid}>
                  {nutriStats.map((s) => <NutriCell key={s.label} {...s} />)}
                </View>
              )}

              {/* Healthier swaps */}
              {result.healthier_swaps ? (
                <>
                  <View style={st.divider} />
                  <View style={st.swapsSection}>
                    <View style={st.swapsHeader}>
                      <View style={st.sectionDot} />
                      <Text style={st.swapsTitle}>Healthier Swaps</Text>
                    </View>
                    <Text style={st.swapsBody}>{result.healthier_swaps}</Text>
                  </View>
                </>
              ) : null}

              {/* Diabetic suitability */}
              {result.diabetic_suitability != null && (
                <>
                  <View style={st.divider} />
                  <View style={st.suitRow}>
                    <View style={[st.sectionDot, { backgroundColor: T.sageDot }]} />
                    <Text style={st.suitText}>
                      Diabetic suitability:{' '}
                      <Text style={st.suitValue}>{result.diabetic_suitability}</Text>
                    </Text>
                  </View>
                </>
              )}

              <View style={st.divider} />
              <Pressable style={st.againRow} onPress={() => setResult(null)}>
                <Ionicons name="refresh-outline" size={14} color={T.inkMute} />
                <Text style={st.againText}>Analyze another meal</Text>
              </Pressable>
            </View>
          )}

          {/* ── Today's Log section ── */}
          <View style={st.sectionRow}>
            <Text style={st.sectionLabel}>TODAY'S LOG</Text>
            <Pressable hitSlop={8}>
              <Text style={st.seeAll}>See all ›</Text>
            </Pressable>
          </View>

          <View style={st.logCard}>
            {todayMeals.map((meal, i) => (
              <MealLogRow
                key={meal.id}
                meal={meal}
                isLast={i === todayMeals.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {Platform.OS === 'web' && showWebCamera && (
        <View style={st.cameraOverlay}>
          <WebCameraOverlay
            videoRef={videoRef}
            onCapture={captureWebPhoto}
            onCancel={() => setShowWebCamera(false)}
          />
        </View>
      )}
    </>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.cream },
  scroll: { paddingHorizontal: 20 },

  /* Heading */
  eyebrow: { fontSize: 11, fontWeight: '700', color: T.inkSub, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 },
  h1: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
    color: T.ink, letterSpacing: -0.8, lineHeight: 38, marginBottom: 8,
  },
  h1Accent: { color: T.sage, fontStyle: 'italic' },
  subtitle: { fontSize: 13, color: T.inkSub, lineHeight: 20, marginBottom: 20 },

  /* Loading */
  loadingCard: {
    alignItems: 'center', paddingVertical: 48,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    marginBottom: 16, gap: 10,
  },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: T.ink, marginTop: 4 },
  loadingSub:   { fontSize: 13, color: T.inkMute },

  /* CTA row */
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

  /* Result card */
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    overflow: 'hidden', marginBottom: 24,
  },
  resultBar:    { height: 3, backgroundColor: T.sage },
  mealHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  mealIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(35,75,62,0.1)',
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  mealName:  { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2, marginBottom: 2 },
  mealSub:   { fontSize: 12, color: T.inkMute },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(35,75,62,0.1)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.22)',
  },
  doneBadgeText: { fontSize: 11, fontWeight: '700', color: T.sage },
  divider:       { height: StyleSheet.hairlineWidth, backgroundColor: T.line },
  nutriGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  swapsSection:  { padding: 14 },
  swapsHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  swapsTitle:    { fontSize: 13, fontWeight: '700', color: T.sage },
  swapsBody:     { fontSize: 13, color: T.inkSub, lineHeight: 20 },
  sectionDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: T.sageDot },
  suitRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  suitText:      { fontSize: 13, color: T.inkSub, flex: 1 },
  suitValue:     { color: T.ink, fontWeight: '700' },
  againRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  againText:     { fontSize: 13, color: T.inkMute },

  /* Section header */
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: T.inkMute, letterSpacing: 1.4, textTransform: 'uppercase' },
  seeAll:       { fontSize: 13, color: T.sage, fontWeight: '600' },

  /* Log card */
  logCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  /* Camera overlay */
  cameraOverlay: {
    position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(245,241,232,0.96)',
    zIndex: 9999, justifyContent: 'center', alignItems: 'center',
  },
});
