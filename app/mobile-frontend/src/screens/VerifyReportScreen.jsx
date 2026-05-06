/**
 * Verify Report — Cinema Dark
 * QR scan + upload; cryptographic signature verification
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS } from '../config/theme';
import * as api from '../services/api';

const ACCENT = '#2D6A4F'; // sage — Clinical Calm primary

/* ── Spring button ───────────────────────────────────────────────────────── */
function ActionBtn({ label, icon, onPress, disabled, variant = 'primary' }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    damping: 20, stiffness: 300, useNativeDriver: true }).start();
  const isPrimary = variant === 'primary';
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={disabled}>
        {isPrimary ? (
          <View style={[st.btn, disabled && { opacity: 0.6 }]}>
            <Ionicons name={icon} size={18} color="#fff" />
            <Text style={st.btnLabel}>{label}</Text>
          </View>
        ) : (
          <View style={[st.btnSecondary, disabled && { opacity: 0.6 }]}>
            <Ionicons name={icon} size={18} color={ACCENT} />
            <Text style={[st.btnLabel, { color: ACCENT }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ── Detail row in result ────────────────────────────────────────────────── */
function DetailRow({ label, value, mono }) {
  return (
    <View style={st.detailRow}>
      <Text style={st.detailLabel}>{label}</Text>
      <Text style={[st.detailValue, mono && st.detailMono]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */
export default function VerifyReportScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus]     = useState(null);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const videoRef    = useRef(null);
  const scannerRef  = useRef(null);
  const fileInputRef = useRef(null);

  const stopScanner = () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch (_) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => stopScanner(), []);

  const handleDecode = async (data) => {
    let payload;
    try { payload = JSON.parse(data); }
    catch (_) { setStatus({ valid: false, error: 'Invalid QR data.' }); return; }
    const { payload_hash, signature_b64, report_id, issued_at, alg, assessment_db_id } = payload;
    if (!payload_hash || !signature_b64) {
      setStatus({ valid: false, error: 'Missing signature data in QR.' });
      return;
    }
    setVerifying(true);
    setStatus(null);
    try {
      const result = await api.verifyReportSignature(payload_hash, signature_b64);
      setStatus({
        valid: result.valid,
        report_id: report_id || '',
        issued_at: issued_at || '',
        alg: alg || 'ES256',
        assessment_db_id: assessment_db_id != null ? String(assessment_db_id) : '',
      });
    } catch (err) {
      setStatus({ valid: false, error: err.message || 'Verification failed.' });
    } finally {
      setVerifying(false);
      stopScanner();
    }
  };

  // ---- Web: camera scan ----
  const startWebCamera = async () => {
    setStatus(null);
    const video = videoRef.current;
    if (Platform.OS !== 'web' || !video) return;
    try {
      const QrScanner = (await import('qr-scanner')).default;
      const scanner = new QrScanner(video, (result) => handleDecode(result.data), { preferredCamera: 'environment' });
      await scanner.start();
      scannerRef.current = scanner;
    } catch (err) {
      setStatus({ valid: false, error: err.message || 'Could not access camera.' });
      setScanning(false);
    }
  };

  // ---- Web: upload image ----
  const handleWebFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setStatus(null);
    setVerifying(true);
    e.target.value = '';
    if (file.type === 'application/pdf') {
      setStatus({ valid: false, error: 'Please upload a screenshot of the QR code, or use "Scan with camera".' });
      setVerifying(false);
      return;
    }
    try {
      const QrScanner = (await import('qr-scanner')).default;
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      await handleDecode(result.data);
    } catch (_) {
      setStatus({ valid: false, error: 'No QR code found. Crop to the QR only or use "Scan with camera".' });
    } finally {
      setVerifying(false);
    }
  };

  // ---- Native: camera ----
  const startNativeCamera = async () => {
    setStatus(null);
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync?.();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to scan QR codes.'); return; }
    } catch (_) {}
    setScanning(true);
  };

  const onNativeBarcodeScanned = ({ data }) => {
    if (!data || verifying) return;
    handleDecode(data);
  };

  // ---- Native: pick image ----
  const pickImageAndDecode = async () => {
    setStatus(null);
    setVerifying(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
      if (perm && perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library to pick a QR image.');
        setVerifying(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: false, quality: 1 });
      if (result.canceled || !result.assets?.[0]?.uri) { setVerifying(false); return; }
      const uri = result.assets[0].uri;
      const res  = await fetch(uri);
      const blob = await res.blob();
      const QrScanner = (await import('qr-scanner')).default;
      const scanResult = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
      await handleDecode(scanResult.data);
    } catch (_) {
      setStatus({ valid: false, error: 'No QR code found. Use a clear image of the QR, or use "Scan with camera".' });
    } finally {
      setVerifying(false);
    }
  };

  // Web: DOM video for qr-scanner
  const webCameraContainerRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !scanning) return;
    const container = webCameraContainerRef.current;
    if (!container?.appendChild) return;
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.style.cssText = 'width:100%;max-width:320px;height:240px;object-fit:cover;background:#000;border-radius:12px;';
    container.appendChild(video);
    videoRef.current = video;
    startWebCamera();
    return () => {
      try { container.removeChild(video); } catch (_) {}
      videoRef.current = null;
      stopScanner();
    };
  }, [scanning]);

  const renderCamera = () => {
    if (!scanning) return null;
    if (Platform.OS === 'web') {
      return (
        <View style={st.cameraWrap}>
          <View style={st.scanFrame}>
            <View style={[st.scanCorner, st.scanTL, { borderColor: ACCENT }]} />
            <View style={[st.scanCorner, st.scanTR, { borderColor: ACCENT }]} />
            <View style={[st.scanCorner, st.scanBL, { borderColor: ACCENT }]} />
            <View style={[st.scanCorner, st.scanBR, { borderColor: ACCENT }]} />
            <View ref={webCameraContainerRef} style={st.webVideoContainer} collapsable={false} />
          </View>
          <Text style={st.scanHint}>Point at the QR code on the report</Text>
          <Pressable style={st.cancelBtn} onPress={stopScanner}>
            <Text style={st.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }
    // Native
    let CameraView;
    try { CameraView = require('expo-camera').CameraView; }
    catch (_) {
      return (
        <View style={st.cameraWrap}>
          <Text style={st.errorText}>expo-camera not linked. Run: npx expo install expo-camera</Text>
          <Pressable style={st.cancelBtn} onPress={stopScanner}>
            <Text style={st.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={st.cameraWrap}>
        <View style={st.scanFrame}>
          <View style={[st.scanCorner, st.scanTL, { borderColor: ACCENT }]} />
          <View style={[st.scanCorner, st.scanTR, { borderColor: ACCENT }]} />
          <View style={[st.scanCorner, st.scanBL, { borderColor: ACCENT }]} />
          <View style={[st.scanCorner, st.scanBR, { borderColor: ACCENT }]} />
          <CameraView
            style={st.nativeCamera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'], interval: 1000 }}
            onBarcodeScanned={verifying ? undefined : onNativeBarcodeScanned}
          />
        </View>
        <Text style={st.scanHint}>Point at the QR code on the report</Text>
        <Pressable style={st.cancelBtn} onPress={stopScanner}>
          <Text style={st.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  };

  const isValid = status?.valid;

  return (
    <View style={st.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={st.title}>Verify Report</Text>
        <Text style={st.subtitle}>Authenticate signed assessment reports</Text>

        {/* Info card */}
        <View style={st.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="rgba(45,106,79,0.7)" style={{ marginTop: 1 }} />
          <Text style={st.infoText}>
            Scan the QR code on a signed assessment report to verify its authenticity via cryptographic signature.
          </Text>
        </View>

        {/* Action buttons */}
        {!scanning && (
          <View style={st.actionGroup}>
            <ActionBtn
              label="Scan with Camera"
              icon="qr-code-outline"
              onPress={Platform.OS === 'web' ? () => setScanning(true) : startNativeCamera}
              disabled={verifying}
              variant="primary"
            />
            {Platform.OS === 'web' ? (
              <>
                <ActionBtn
                  label="Upload QR Image"
                  icon="image-outline"
                  onPress={() => fileInputRef.current?.click?.()}
                  disabled={verifying}
                  variant="secondary"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleWebFile}
                />
              </>
            ) : (
              <ActionBtn
                label="Upload QR Image"
                icon="image-outline"
                onPress={pickImageAndDecode}
                disabled={verifying}
                variant="secondary"
              />
            )}
          </View>
        )}

        {/* Camera view */}
        {renderCamera()}

        {/* Verifying */}
        {verifying && (
          <View style={st.verifyingRow}>
            <ActivityIndicator color={ACCENT} size="small" />
            <Text style={st.verifyingText}>Verifying signature...</Text>
          </View>
        )}

        {/* Result */}
        {status && !verifying && (
          <View style={[st.resultCard, isValid ? st.resultValid : st.resultInvalid]}>
            {/* Top shimmer */}
            <View style={[st.resultShimmer, { backgroundColor: isValid ? '#10b981' : '#f43f5e' }]} />

            <View style={st.resultHeader}>
              <View style={[st.resultIconWrap, { backgroundColor: (isValid ? '#10b981' : '#f43f5e') + '18', borderColor: (isValid ? '#10b981' : '#f43f5e') + '35' }]}>
                <Ionicons
                  name={isValid ? 'shield-checkmark-outline' : 'shield-outline'}
                  size={24}
                  color={isValid ? '#10b981' : '#f43f5e'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.resultTitle, { color: isValid ? '#10b981' : '#f43f5e' }]}>
                  {isValid ? 'VALID REPORT' : (status.error || 'INVALID')}
                </Text>
                <Text style={st.resultSubtitle}>
                  {isValid ? 'Cryptographic signature verified' : 'Signature verification failed'}
                </Text>
              </View>
            </View>

            {isValid && (
              <View style={st.detailsSection}>
                {status.report_id  ? <DetailRow label="Report ID"     value={status.report_id}         mono /> : null}
                {status.issued_at  ? <DetailRow label="Issued"        value={status.issued_at}               /> : null}
                {status.alg        ? <DetailRow label="Algorithm"     value={status.alg}               mono /> : null}
                {status.assessment_db_id !== '' ? <DetailRow label="Assessment ID" value={status.assessment_db_id} mono /> : null}
              </View>
            )}

            {!isValid && status.error?.includes('fetch') && (
              <Text style={st.resultHint}>
                "Failed to fetch" — the backend may be offline. Start the server and check EXPO_PUBLIC_API_URL in .env.
              </Text>
            )}

            <Pressable style={st.scanAgainBtn} onPress={() => setStatus(null)}>
              <Ionicons name="refresh-outline" size={14} color="rgba(28,27,24,0.35)" />
              <Text style={st.scanAgainText}>Scan again</Text>
            </Pressable>
          </View>
        )}

        {/* Footer note */}
        <Text style={st.footer}>
          Verifies via cryptographic proof embedded in the QR code, not an Adobe PDF signature.
        </Text>
      </ScrollView>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const CORNER = 20;
const st = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F7F4ED' },
  content: { paddingHorizontal: 20, paddingTop: 20 },

  blob: {
    position: 'absolute', top: 80, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(45,106,79,0.05)',
  },

  title:    { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontStyle: 'italic', fontWeight: '700', color: '#1C1B18', letterSpacing: -0.5, lineHeight: 30, marginBottom: 4 },
  subtitle: { fontSize: 12, fontStyle: 'italic', color: 'rgba(28,27,24,0.45)', lineHeight: 18, marginBottom: 24 },

  /* Info card */
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(45,106,79,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(45,106,79,0.18)',
    padding: 14, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: 'rgba(28,27,24,0.6)', lineHeight: 20 },

  /* Buttons */
  actionGroup: { gap: 12, marginBottom: 20 },
  btn: {
    backgroundColor: '#2D6A4F',
    borderRadius: RADIUS.md, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  btnSecondary: {
    borderRadius: RADIUS.md, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(45,106,79,0.07)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(45,106,79,0.22)',
  },
  btnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Camera */
  cameraWrap: { alignItems: 'center', marginBottom: 20 },
  scanFrame: {
    width: '100%', maxWidth: 320, aspectRatio: 1,
    borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: '#000', position: 'relative',
    marginBottom: 14,
  },
  scanCorner: { position: 'absolute', width: CORNER, height: CORNER, borderWidth: 2.5 },
  scanTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  scanTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  scanBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  scanBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  webVideoContainer: { width: '100%', height: 240, backgroundColor: '#000' },
  nativeCamera: { width: '100%', height: '100%' },
  scanHint:  { fontSize: 13, color: 'rgba(28,27,24,0.45)', marginBottom: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText:{ color: 'rgba(28,27,24,0.45)', fontSize: 14 },
  errorText: { fontSize: 13, color: '#f43f5e', textAlign: 'center', padding: 16 },

  /* Verifying */
  verifyingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 28,
  },
  verifyingText: { fontSize: 14, color: 'rgba(28,27,24,0.5)' },

  /* Result card */
  resultCard: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, marginTop: 8,
  },
  resultValid:   { backgroundColor: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.22)' },
  resultInvalid: { backgroundColor: 'rgba(244,63,94,0.07)',  borderColor: 'rgba(244,63,94,0.22)'  },
  resultShimmer: { height: 1 },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,27,24,0.07)',
  },
  resultIconWrap: {
    width: 50, height: 50, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  resultTitle:    { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  resultSubtitle: { fontSize: 12, color: 'rgba(28,27,24,0.4)', marginTop: 3 },

  detailsSection: { paddingHorizontal: 16, paddingVertical: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,27,24,0.06)',
  },
  detailLabel: { fontSize: 12, color: 'rgba(28,27,24,0.45)', fontWeight: '600' },
  detailValue: { fontSize: 13, color: '#1C1B18', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  detailMono:  { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, fontSize: 12 },

  resultHint: {
    fontSize: 12, color: 'rgba(28,27,24,0.4)', fontStyle: 'italic',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13,
  },
  scanAgainText: { fontSize: 13, color: 'rgba(28,27,24,0.35)' },

  footer: {
    marginTop: 24, fontSize: 11, color: 'rgba(100,116,139,0.4)',
    textAlign: 'center', lineHeight: 17,
  },
});
