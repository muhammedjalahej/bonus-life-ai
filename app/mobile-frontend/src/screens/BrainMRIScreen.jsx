/**
 * BrainMRIScreen — Clinical Calm · Elevated
 * Step progress · Classification pills · Dropzone with scan lines + corner frame
 * Privacy strip · Intentional disabled CTA · Full results display
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Image, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/constants';
import { getStoredToken } from '../services/api';
import { RADIUS, FONT } from '../config/theme';

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

/* ── Tumor colors (Clinical Calm palette) ────────────────────────────────── */
const TUMOR_COLORS = {
  'no tumor':   T.sageDot,
  'glioma':     T.heart,
  'meningioma': T.peachDeep,
  'pituitary':  '#6B8794',
};
const DEFAULT_COLOR = '#8A8F98';

function stripMd(s) { return typeof s === 'string' ? s.replace(/\*\*/g, '') : s; }

/* ── Step progress track ─────────────────────────────────────────────────── */
function ProgressTrack({ step = 1, totalSteps = 3, pct = 35 }) {
  return (
    <View style={pt.wrap}>
      {/* Track */}
      <View style={pt.track}>
        <LinearGradient
          colors={[T.sage, T.sageDot]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={[pt.fill, { width: `${pct}%` }]}
        />
      </View>
      {/* Labels */}
      <View style={pt.labels}>
        <Text style={pt.step}>STEP {step} OF {totalSteps}  ·  UPLOAD</Text>
        <Text style={pt.pct}>{pct}%</Text>
      </View>
    </View>
  );
}
const pt = StyleSheet.create({
  wrap:   { paddingBottom: 12 },
  track:  { height: 3, backgroundColor: T.line, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  fill:   { height: 3, borderRadius: 2 },
  labels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step:   { fontSize: 10, fontWeight: '700', color: T.sage, letterSpacing: 1.2, textTransform: 'uppercase' },
  pct: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontSize: 14, color: T.inkMute,
  },
});

/* ── Classification pills ────────────────────────────────────────────────── */
const CLASSES = [
  { label: 'Glioma',     dot: T.heart     },
  { label: 'Meningioma', dot: T.peachDeep },
  { label: 'Pituitary',  dot: T.sageDot   },
  { label: 'No tumor',   dot: T.inkMute   },
];

function ClassificationPills() {
  return (
    <View style={cp.row}>
      {CLASSES.map((c) => (
        <View key={c.label} style={cp.pill}>
          <View style={[cp.dot, { backgroundColor: c.dot }]} />
          <Text style={cp.label}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}
const cp = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  pill:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  dot:   { width: 7, height: 7, borderRadius: 3.5 },
  label: { fontSize: 12, fontWeight: '600', color: T.inkSub },
});

/* ── Corner frame brackets ───────────────────────────────────────────────── */
function CornerBrackets({ size = 20, thick = 2, color = 'rgba(35,75,62,0.5)', outset = 4 }) {
  const s = { position: 'absolute', width: size, height: size };
  return (
    <>
      <View style={[s, { top: -outset, left: -outset, borderTopWidth: thick, borderLeftWidth: thick, borderColor: color, borderTopLeftRadius: 3 }]} />
      <View style={[s, { top: -outset, right: -outset, borderTopWidth: thick, borderRightWidth: thick, borderColor: color, borderTopRightRadius: 3 }]} />
      <View style={[s, { bottom: -outset, left: -outset, borderBottomWidth: thick, borderLeftWidth: thick, borderColor: color, borderBottomLeftRadius: 3 }]} />
      <View style={[s, { bottom: -outset, right: -outset, borderBottomWidth: thick, borderRightWidth: thick, borderColor: color, borderBottomRightRadius: 3 }]} />
    </>
  );
}

/* ── Scan line pattern ───────────────────────────────────────────────────── */
function ScanLines({ count = 14 }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: 0, right: 0,
            height: StyleSheet.hairlineWidth,
            top: 12 + i * 16,
            backgroundColor: 'rgba(35,75,62,0.04)',
          }}
        />
      ))}
    </View>
  );
}

/* ── MRI Dropzone ────────────────────────────────────────────────────────── */
function MRIDropzone({ imageUri, onPress, onGallery }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.98, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <Pressable style={dz.card} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        {/* Cream gradient background */}
        <LinearGradient
          colors={[T.cream3, T.cream, T.cream2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Scan lines */}
        <ScanLines />

        {imageUri ? (
          /* Preview state */
          <Image source={{ uri: imageUri }} style={dz.preview} resizeMode="contain" />
        ) : (
          /* Empty upload state */
          <>
            {/* 76px upload frame with corner brackets */}
            <View style={dz.frameWrap}>
              <CornerBrackets size={20} thick={2} color="rgba(35,75,62,0.45)" outset={4} />
              <View style={dz.frame}>
                <Ionicons name="cloud-upload-outline" size={28} color={T.sage} />
              </View>
            </View>

            <Text style={dz.mainLabel}>Tap to select MRI scan</Text>
            <Text style={dz.subLabel}>JPG or PNG  ·  Up to 10 MB</Text>

            {/* OR divider */}
            <View style={dz.orRow}>
              <View style={dz.orLine} />
              <Text style={dz.orText}>OR</Text>
              <View style={dz.orLine} />
            </View>

            {/* Gallery + Files pills */}
            <View style={dz.pillRow}>
              <Pressable style={dz.pill} onPress={onGallery}>
                <Ionicons name="images-outline" size={14} color={T.sage} />
                <Text style={dz.pillText}>Gallery</Text>
              </Pressable>
              <Pressable style={dz.pill} onPress={onGallery}>
                <Ionicons name="folder-outline" size={14} color={T.sage} />
                <Text style={dz.pillText}>Files</Text>
              </Pressable>
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
const dz = StyleSheet.create({
  card: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(35,75,62,0.22)',
    borderRadius: 20, overflow: 'hidden',
    paddingVertical: 40, paddingHorizontal: 24,
    alignItems: 'center', marginBottom: 0,
  },
  preview: { width: '100%', height: 200, borderRadius: 12 },
  frameWrap: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  frame: {
    width: 76, height: 76, borderRadius: 16,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 0.5, borderColor: T.line,
  },
  mainLabel: { fontSize: 15, fontWeight: '600', color: T.ink, marginBottom: 6 },
  subLabel:  { fontSize: 12, color: T.inkMute, marginBottom: 16 },
  orRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, width: '60%', marginBottom: 14 },
  orLine:    { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.line },
  orText:    { fontSize: 10, fontWeight: '700', color: T.inkMute, letterSpacing: 1 },
  pillRow:   { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 0.5, borderColor: T.line,
    shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: T.sage },
});

/* ── Privacy strip ───────────────────────────────────────────────────────── */
function PrivacyStrip() {
  return (
    <View style={prv.strip}>
      <Ionicons name="shield-checkmark-outline" size={16} color={T.sage} style={{ marginTop: 1 }} />
      <Text style={prv.text}>Encrypted on device. Scans are never stored on our servers.</Text>
    </View>
  );
}
const prv = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.sageSoft, borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.15)',
  },
  text: { flex: 1, fontSize: 12.5, color: T.sage, lineHeight: 18 },
});

/* ── Footer CTA ──────────────────────────────────────────────────────────── */
function FooterCTA({ imageUri, onPress, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => imageUri && Animated.spring(scale, { toValue: 0.98, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, damping: 20, stiffness: 300, useNativeDriver: true }).start();

  if (!imageUri) {
    /* Intentional disabled state: white bg + muted text + hairline border, NO shadow */
    return (
      <View style={fc.disabled}>
        <Ionicons name="scan-outline" size={18} color={T.inkMute} />
        <Text style={fc.disabledText}>Select a scan to analyze</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={fc.enabled}
        onPress={onPress} onPressIn={onIn} onPressOut={onOut}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={T.cream} size="small" />
          : (
            <>
              <Ionicons name="scan-outline" size={18} color={T.cream} />
              <Text style={fc.enabledText}>Analyze MRI Scan</Text>
            </>
          )
        }
      </Pressable>
    </Animated.View>
  );
}
const fc = StyleSheet.create({
  disabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5, borderColor: T.line,
    /* No shadow — intentional, not broken */
  },
  disabledText: { fontSize: 15, fontWeight: '600', color: T.inkMute },
  enabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
    backgroundColor: T.sage,
    shadowColor: T.sage, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 5,
  },
  enabledText: { fontSize: 15, fontWeight: '700', color: T.cream },
});

/* ── Tumor classification card ────────────────────────────────────────────── */
function TumorCard({ tumorClass, confidence, description }) {
  const color   = TUMOR_COLORS[tumorClass] || DEFAULT_COLOR;
  const icon    = tumorClass === 'no tumor' ? 'shield-checkmark-outline' : 'warning-outline';
  const confPct = confidence != null ? Math.round(confidence * 100) : null;
  const isNoTumor = tumorClass === 'no tumor';
  return (
    <View style={tc.card}>
      {/* Colored top bar */}
      <View style={[tc.topBar, { backgroundColor: color }]} />
      <View style={tc.inner}>
        {/* Icon ring */}
        <View style={[tc.ring, { backgroundColor: color + '14', borderColor: color + '35' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        {/* Content */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[tc.dot, { backgroundColor: color }]} />
            <Text style={[tc.cls, { color }]}>{tumorClass}</Text>
          </View>
          {confPct != null && (
            <>
              <Text style={tc.conf}>Model confidence: {confPct}%</Text>
              <View style={tc.track}>
                <View style={[tc.fill, { width: `${Math.min(100, confPct)}%`, backgroundColor: color }]} />
              </View>
            </>
          )}
          {description ? <Text style={tc.desc} numberOfLines={3}>{description}</Text> : null}
        </View>
      </View>
    </View>
  );
}
const tc = StyleSheet.create({
  card:   { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: T.line, shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  topBar: { height: 3 },
  inner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  ring:   { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, flexShrink: 0 },
  dot:    { width: 7, height: 7, borderRadius: 3.5 },
  cls:    { fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  conf:   { fontSize: 12, color: T.inkMute },
  track:  { height: 4, backgroundColor: T.line, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  fill:   { height: 4, borderRadius: 2 },
  desc:   { fontSize: 12, color: T.inkSub, lineHeight: 18, marginTop: 4 },
});

/* ── Info card ────────────────────────────────────────────────────────────── */
function InfoCard({ icon, iconColor, title, children, expandable, expanded, onToggle }) {
  return (
    <View style={icc.card}>
      <Pressable style={icc.hdr} onPress={expandable ? onToggle : undefined}>
        <View style={[icc.iconDot, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={icc.title}>{title}</Text>
        {expandable && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={T.inkMute} />}
      </Pressable>
      {(!expandable || expanded) && <View style={icc.body}>{children}</View>}
    </View>
  );
}
const icc = StyleSheet.create({
  card:    { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 10, borderWidth: 0.5, borderColor: T.line, overflow: 'hidden', shadowColor: '#1C1B18', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  iconDot: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:   { flex: 1, fontSize: 12, fontWeight: '700', color: T.inkSub, textTransform: 'uppercase', letterSpacing: 0.8 },
  body:    { paddingHorizontal: 14, paddingBottom: 14 },
});

/* ═══════════════════════════════════════════════════════════════════════════
   Screen
═══════════════════════════════════════════════════════════════════════════ */
export default function BrainMRIScreen({ navigation, route }) {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();
  const [imageUri,   setImageUri]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [summaryExp, setSummaryExp] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isViewMode = Boolean(route.params?.assessment);
  const progress   = result ? 1 : imageUri ? 0.65 : 0.35;
  const step       = result ? 3 : imageUri ? 2 : 1;
  const pct        = Math.round(progress * 100);

  useEffect(() => {
    if (route.params?.assessment) {
      const a = route.params.assessment;
      setResult({
        ...a, model_available: true,
        risk_analysis: {
          tumor_class:       a.tumor_class        || a.risk_analysis?.tumor_class        || '',
          confidence:        a.confidence         ?? a.risk_analysis?.confidence,
          tumor_description: a.tumor_description  || a.risk_analysis?.tumor_description  || '',
          all_probabilities: a.all_probabilities  || a.risk_analysis?.all_probabilities  || {},
        },
        recommendations:   a.recommendations     || {},
        executive_summary: a.executive_summary   || '',
      });
    }
  }, [route.params]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow photo library access.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!picked.canceled && picked.assets?.[0]) { setImageUri(picked.assets[0].uri); setResult(null); }
  };

  const submit = async () => {
    if (!imageUri) { Alert.alert('Error', 'Please select a brain MRI image.'); return; }
    setLoading(true); setResult(null);
    try {
      const form     = new FormData();
      const filename = imageUri.split('/').pop();
      const ext      = (filename.split('.').pop() || 'jpg').toLowerCase();
      const mime     = ext === 'png' ? 'image/png' : 'image/jpeg';
      if (Platform.OS === 'web') {
        const blob = await (await fetch(imageUri)).blob();
        form.append('image', new File([blob], filename || 'mri.jpg', { type: mime }));
      } else {
        form.append('image', { uri: imageUri, name: filename || 'mri.jpg', type: mime });
      }
      form.append('language', 'english');
      const token   = await getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/v1/brain-mri-analysis`, { method: 'POST', body: form, headers });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Server error ${res.status}`); }
      setResult(await res.json());
    } catch (e) {
      Alert.alert('Error', e.message || 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc  = new jsPDF();
      const date = result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A';
      let y = 20;
      doc.setFontSize(16); doc.setTextColor(35, 75, 62);
      doc.text('Brain MRI Analysis Report', 20, y); y += 10;
      doc.setFontSize(10); doc.setTextColor(60, 60, 60);
      doc.text(`Date: ${date}`, 20, y); y += 7;
      doc.text(`Patient: ${user?.full_name || user?.email || 'N/A'}`, 20, y); y += 7;
      doc.text(`Classification: ${ra.tumor_class} (${confPct || 0}% confidence)`, 20, y); y += 10;
      if (result.executive_summary) {
        doc.setFont(undefined, 'bold'); doc.text('Clinical Summary:', 20, y); y += 6;
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(stripMd(result.executive_summary).slice(0, 800), 170);
        doc.text(lines, 20, y); y += lines.length * 5 + 10;
      }
      const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
      if (isBrowser) {
        const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href = url; a.download = 'brain-mri-report.pdf';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } else {
        const FileSystem = (await import('expo-file-system')).default;
        const Sharing    = (await import('expo-sharing')).default;
        const b64  = doc.output('datauristring').split(',')[1];
        const path = `${FileSystem.cacheDirectory}brain-mri-report.pdf`;
        await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'application/pdf' });
      }
    } catch (e) {
      Alert.alert('PDF Failed', e.message || 'Could not generate PDF.');
    } finally { setPdfLoading(false); }
  };

  const ra         = result?.risk_analysis || {};
  const tumorClass = ra.tumor_class || '';
  const confidence = ra.confidence;
  const allProbs   = ra.all_probabilities || {};
  const description= ra.tumor_description || '';
  const confPct    = confidence != null ? Math.round(confidence * 100) : null;
  const recs       = result?.recommendations || {};
  const isNoTumor  = tumorClass === 'no tumor';
  const tumorColor = TUMOR_COLORS[tumorClass] || DEFAULT_COLOR;

  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Progress track ── */}
        {!isViewMode && <ProgressTrack step={step} totalSteps={3} pct={pct} />}

        {/* ── Upload section ── */}
        {!isViewMode && (
          <>
            {/* Editorial heading */}
            <Text style={s.eyebrow}>BRAIN MRI</Text>
            <Text style={s.h1}>
              Upload your scan for{'\n'}<Text style={s.h1Accent}>tumor classification.</Text>
            </Text>
            <Text style={s.subtitle}>
              Our model identifies four classes from your MRI image. Results in under a minute.
            </Text>

            {/* Classification pills */}
            <ClassificationPills />

            {/* Dropzone */}
            <MRIDropzone imageUri={imageUri} onPress={pickImage} onGallery={pickImage} />

            {/* Preview info when image is selected */}
            {imageUri && (
              <View style={s.selectedBanner}>
                <View style={s.selectedDot} />
                <Text style={s.selectedText}>Scan ready — tap below to analyze</Text>
              </View>
            )}

            {/* Privacy strip */}
            <PrivacyStrip />

            {/* Footer CTA */}
            <FooterCTA imageUri={imageUri} onPress={submit} loading={loading} />
          </>
        )}

        {/* ── Results ── */}
        {result && (
          <View style={s.results}>
            {!isViewMode && (
              <>
                <View style={s.divider} />
                {/* Saved banner */}
                <View style={s.savedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={T.sageDot} />
                  <Text style={s.savedText}>Saved to your account</Text>
                </View>
              </>
            )}

            {/* Results heading */}
            <Text style={s.resultsHeading}>
              {isViewMode ? 'MRI Analysis' : 'Classification Result'}
            </Text>

            {!result.model_available ? (
              <InfoCard icon="alert-circle-outline" iconColor={T.amber} title="Model Unavailable">
                <Text style={s.bodyText}>{description}</Text>
              </InfoCard>
            ) : (
              <TumorCard tumorClass={tumorClass} confidence={confidence} description={description} />
            )}

            {/* All probabilities */}
            {Object.keys(allProbs).length > 0 && (
              <InfoCard icon="bar-chart-outline" iconColor={T.sageDot} title="All Probabilities">
                {Object.entries(allProbs).map(([label, val]) => {
                  const color = TUMOR_COLORS[label] || DEFAULT_COLOR;
                  const pct   = Math.round((val || 0) * 100);
                  return (
                    <View key={label} style={s.probRow}>
                      <View style={[s.probDot, { backgroundColor: color }]} />
                      <Text style={[s.probLabel, label === tumorClass && { color, fontWeight: '700' }]}>{label}</Text>
                      <View style={s.probBarWrap}>
                        <View style={s.probBarBg}>
                          <View style={[s.probBarFill, { width: `${pct}%`, backgroundColor: label === tumorClass ? color : T.line }]} />
                        </View>
                        <Text style={[s.probPct, label === tumorClass && { color, fontWeight: '700' }]}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })}
              </InfoCard>
            )}

            {/* Clinical summary — collapsible */}
            {result.executive_summary ? (
              <InfoCard
                icon="document-text-outline" iconColor={T.inkSub}
                title="Clinical Summary"
                expandable expanded={summaryExp}
                onToggle={() => setSummaryExp(e => !e)}
              >
                <Text style={s.bodyText}>{stripMd(result.executive_summary)}</Text>
                <Pressable style={s.pdfBtn} onPress={handleDownloadPdf} disabled={pdfLoading}>
                  {pdfLoading
                    ? <ActivityIndicator size="small" color={T.sage} />
                    : (
                      <>
                        <Ionicons name="document-outline" size={14} color={T.sage} />
                        <Text style={s.pdfBtnText}>Download PDF Report</Text>
                      </>
                    )
                  }
                </Pressable>
              </InfoCard>
            ) : null}

            {/* Recommendations */}
            {recs.immediate && recs.immediate.trim() ? (
              <InfoCard icon="leaf-outline" iconColor={isNoTumor ? T.sageDot : T.peachDeep} title="Recommendations">
                <Text style={[s.recsImmediate, { color: isNoTumor ? T.sageDot : T.peachDeep }]}>
                  {recs.immediate}
                </Text>
                {(recs.lifestyle || []).map((r, i) => (
                  <View key={i} style={s.recRow}>
                    <View style={[s.recDot, { backgroundColor: T.sageDot }]} />
                    <Text style={s.recText}>{r}</Text>
                  </View>
                ))}
              </InfoCard>
            ) : null}

            {/* Disclaimer */}
            {result.disclaimer && result.disclaimer.trim() ? (
              <View style={s.disclaimer}>
                <Ionicons name="information-circle-outline" size={14} color={T.amber} />
                <Text style={s.disclaimerText}>{result.disclaimer}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.cream },
  content: { padding: 20, paddingTop: 12 },

  /* Heading */
  eyebrow: { fontSize: 11, fontWeight: '700', color: T.sage, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 10 },
  h1: {
    fontSize: 30,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
    color: T.ink, letterSpacing: -0.6, lineHeight: 36, marginBottom: 8,
  },
  h1Accent:  { color: T.sage, fontStyle: 'italic' },
  subtitle:  { fontSize: 13, color: T.inkSub, lineHeight: 20, marginBottom: 16 },

  /* Selected scan banner */
  selectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(35,75,62,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  selectedDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.sageDot },
  selectedText: { fontSize: 13, color: T.sage, fontWeight: '600' },

  /* Results section */
  results:        { marginTop: 8 },
  divider:        { height: StyleSheet.hairlineWidth, backgroundColor: T.line, marginBottom: 16, marginTop: 8 },
  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(74,122,102,0.1)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
    borderWidth: 0.5, borderColor: 'rgba(74,122,102,0.2)',
  },
  savedText: { fontSize: 13, color: T.sageDot, fontWeight: '600' },
  resultsHeading: {
    fontSize: 22, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic', fontWeight: '400',
    color: T.ink, letterSpacing: -0.5, marginBottom: 14,
  },
  bodyText: { fontSize: 14, color: T.inkSub, lineHeight: 22 },

  /* Probability bars */
  probRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.line, gap: 10 },
  probDot:     { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  probLabel:   { fontSize: 12.5, color: T.inkSub, textTransform: 'capitalize', width: 88, fontWeight: '500' },
  probBarWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  probBarBg:   { flex: 1, height: 4, backgroundColor: T.line, borderRadius: 2, overflow: 'hidden' },
  probBarFill: { height: 4, borderRadius: 2 },
  probPct:     { fontSize: 12.5, fontWeight: '600', color: T.inkSub, width: 36, textAlign: 'right' },

  /* PDF button */
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10, backgroundColor: 'rgba(35,75,62,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(35,75,62,0.2)',
  },
  pdfBtnText: { color: T.sage, fontSize: 13, fontWeight: '700' },

  /* Recommendations */
  recsImmediate: { fontSize: 14, fontWeight: '700', marginBottom: 10, lineHeight: 21 },
  recRow:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  recDot:        { width: 7, height: 7, borderRadius: 3.5, marginTop: 7, flexShrink: 0 },
  recText:       { flex: 1, fontSize: 13.5, color: T.inkSub, lineHeight: 21 },

  /* Disclaimer */
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(201,169,117,0.08)', borderRadius: 12,
    padding: 12, borderWidth: 0.5, borderColor: 'rgba(201,169,117,0.22)', marginTop: 4,
  },
  disclaimerText: { flex: 1, color: T.amber, fontSize: 12, lineHeight: 18 },
});
