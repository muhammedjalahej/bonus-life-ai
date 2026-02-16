/**
 * Verify Report – scan QR on signed assessment or upload QR image. Same API as web.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as api from '../services/api';

export default function VerifyReportScreen() {
  const [status, setStatus] = useState(null); // { valid, report_id, issued_at, alg, assessment_db_id, error }
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
      } catch (_) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => () => stopScanner(), []);

  const handleDecode = async (data) => {
    let payload;
    try {
      payload = JSON.parse(data);
    } catch (_) {
      setStatus({ valid: false, error: 'Invalid QR data.' });
      return;
    }
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

  // ---- Web: camera scan with qr-scanner ----
  const startWebCamera = async () => {
    setStatus(null);
    const video = videoRef.current;
    if (Platform.OS !== 'web' || !video) return;
    try {
      const QrScanner = (await import('qr-scanner')).default;
      const scanner = new QrScanner(video, (result) => handleDecode(result.data), {
        preferredCamera: 'environment',
      });
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
      setStatus({
        valid: false,
        error: 'Please upload a screenshot of the QR code, or use "Scan with camera".',
      });
      setVerifying(false);
      return;
    }
    try {
      const QrScanner = (await import('qr-scanner')).default;
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      await handleDecode(result.data);
    } catch (_) {
      setStatus({
        valid: false,
        error: 'No QR code found. Crop to the QR only or use "Scan with camera".',
      });
    } finally {
      setVerifying(false);
    }
  };

  // ---- Native: camera scan with expo-camera ----
  const startNativeCamera = async () => {
    setStatus(null);
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync?.();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to scan QR codes.');
        return;
      }
    } catch (_) {}
    setScanning(true);
  };

  const onNativeBarcodeScanned = ({ data }) => {
    if (!data || verifying) return;
    handleDecode(data);
  };

  // ---- Native: upload image (pick then decode with qr-scanner if available) ----
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]?.uri) {
        setVerifying(false);
        return;
      }
      const uri = result.assets[0].uri;
      const res = await fetch(uri);
      const blob = await res.blob();
      const QrScanner = (await import('qr-scanner')).default;
      const scanResult = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
      await handleDecode(scanResult.data);
    } catch (_) {
      setStatus({
        valid: false,
        error: 'No QR code found. Use a clear image of the QR, or use "Scan with camera".',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Web: inject <video> into DOM for qr-scanner
  const webCameraContainerRef = useRef(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !scanning) return;
    const container = webCameraContainerRef.current;
    if (!container?.appendChild) return;
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.style.cssText = 'width:100%;max-width:320px;height:240px;object-fit:cover;background:#000;';
    container.appendChild(video);
    videoRef.current = video;
    startWebCamera();
    return () => {
      try {
        container.removeChild(video);
      } catch (_) {}
      videoRef.current = null;
      stopScanner();
    };
  }, [scanning]);

  const renderWebCamera = () => {
    if (Platform.OS !== 'web' || !scanning) return null;
    return (
      <View style={styles.cameraWrap}>
        <View ref={webCameraContainerRef} style={styles.webVideoContainer} collapsable={false} />
        <TouchableOpacity style={styles.cancelBtn} onPress={stopScanner}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNativeCamera = () => {
    if (Platform.OS === 'web' || !scanning) return null;
    let CameraView;
    try {
      CameraView = require('expo-camera').CameraView;
    } catch (_) {
      return (
        <View style={styles.cameraWrap}>
          <Text style={styles.hint}>expo-camera not linked. Run: npx expo install expo-camera</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={stopScanner}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.nativeCamera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'], interval: 1000 }}
          onBarcodeScanned={verifying ? undefined : onNativeBarcodeScanned}
        />
        <TouchableOpacity style={styles.cancelBtn} onPress={stopScanner}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verify Report</Text>
      <Text style={styles.subtitle}>Verify signed assessment reports.</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Scan the QR code on a signed assessment report to verify its authenticity.
        </Text>
      </View>

      {!scanning && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, verifying && styles.buttonDisabled]}
            onPress={Platform.OS === 'web' ? () => setScanning(true) : startNativeCamera}
            disabled={verifying}
          >
            <Text style={styles.primaryButtonText}>Scan with camera</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' ? (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, verifying && styles.buttonDisabled]}
                onPress={() => fileInputRef.current?.click?.()}
                disabled={verifying}
              >
                <Text style={styles.secondaryButtonText}>Upload QR image</Text>
              </TouchableOpacity>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFile}
              />
            </>
          ) : (
            <TouchableOpacity style={[styles.secondaryButton, verifying && styles.buttonDisabled]} onPress={pickImageAndDecode} disabled={verifying}>
              <Text style={styles.secondaryButtonText}>Upload QR image</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderWebCamera()}
      {renderNativeCamera()}

      {verifying && (
        <View style={styles.verifyingRow}>
          <ActivityIndicator color="#10b981" size="small" />
          <Text style={styles.verifyingText}>Verifying...</Text>
        </View>
      )}

      {status && !verifying && (
        <View style={[styles.resultCard, status.valid ? styles.resultValid : styles.resultInvalid]}>
          <Text style={[styles.resultTitle, status.valid ? styles.resultTitleValid : styles.resultTitleInvalid]}>
            {status.valid ? 'VALID' : (status.error || 'INVALID')}
          </Text>
          {status.valid ? (
            <View style={styles.resultDetails}>
              {status.report_id ? (
                <>
                  <Text style={styles.resultLabel}>Report ID</Text>
                  <Text style={styles.resultValue} numberOfLines={1}>{status.report_id}</Text>
                </>
              ) : null}
              {status.issued_at ? (
                <>
                  <Text style={styles.resultLabel}>Issued</Text>
                  <Text style={styles.resultValue}>{status.issued_at}</Text>
                </>
              ) : null}
              {status.alg ? (
                <>
                  <Text style={styles.resultLabel}>Algorithm</Text>
                  <Text style={styles.resultValue}>{status.alg}</Text>
                </>
              ) : null}
              {status.assessment_db_id !== '' ? (
                <>
                  <Text style={styles.resultLabel}>Assessment ID</Text>
                  <Text style={styles.resultValue}>{status.assessment_db_id}</Text>
                </>
              ) : null}
            </View>
          ) : (
            <Text style={styles.resultHint}>
              If this is "Failed to fetch", the backend may be offline. Start it and set EXPO_PUBLIC_API_URL in app/mobile-frontend/.env if needed.
            </Text>
          )}
          <TouchableOpacity style={styles.scanAgainBtn} onPress={() => setStatus(null)}>
            <Text style={styles.scanAgainText}>Scan again</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.footer}>
        This verifies the report via cryptographic proof in the QR, not an Adobe PDF signature.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoText: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },
  cameraWrap: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webVideoContainer: { width: '100%', maxWidth: 320, height: 240, backgroundColor: '#000' },
  nativeCamera: { width: '100%', height: 280 },
  cancelBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  cancelBtnText: { color: '#94a3b8', fontSize: 14 },
  hint: { color: '#64748b', fontSize: 12, textAlign: 'center', padding: 16 },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  verifyingText: { color: '#94a3b8', fontSize: 14 },
  resultCard: {
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  resultValid: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  resultInvalid: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  resultTitleValid: { color: '#10b981' },
  resultTitleInvalid: { color: '#ef4444' },
  resultDetails: { marginBottom: 12 },
  resultLabel: { fontSize: 12, color: '#64748b', marginTop: 6 },
  resultValue: { fontSize: 14, color: '#e2e8f0', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  resultHint: { fontSize: 12, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  scanAgainBtn: { marginTop: 8 },
  scanAgainText: { color: '#94a3b8', fontSize: 13 },
  footer: { marginTop: 24, fontSize: 11, color: '#64748b', textAlign: 'center' },
});
