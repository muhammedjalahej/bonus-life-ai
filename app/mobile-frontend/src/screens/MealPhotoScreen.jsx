import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as api from '../services/api';

// Web-only: overlay with live camera and Capture/Cancel (uses DOM video for real camera)
function WebCameraOverlay({ videoRef, onCapture, onCancel }) {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !container.appendChild) return; // RNW: ref is DOM node
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = 'width:100%;max-width:400px;height:auto;max-height:50vh;object-fit:cover;border-radius:12px;background:#000;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;';
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:12px;';
    const captureBtn = document.createElement('button');
    captureBtn.textContent = 'Capture photo';
    captureBtn.onclick = onCapture;
    captureBtn.style.cssText = 'padding:14px 24px;background:#10b981;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = onCancel;
    cancelBtn.style.cssText = 'padding:14px 24px;background:rgba(255,255,255,0.1);color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:16px;cursor:pointer;';
    btnWrap.appendChild(captureBtn);
    btnWrap.appendChild(cancelBtn);
    wrap.appendChild(video);
    wrap.appendChild(btnWrap);
    container.appendChild(wrap);
    videoRef.current = video;
    return () => {
      try {
        container.removeChild(wrap);
      } catch (_) {}
      videoRef.current = null;
    };
  }, [onCapture, onCancel, videoRef]);
  return (
    <View
      ref={containerRef}
      style={StyleSheet.absoluteFill}
      collapsable={false}
    />
  );
}

export default function MealPhotoScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showWebCamera, setShowWebCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Web: start/stop camera stream when overlay is shown/hidden
  useEffect(() => {
    if (Platform.OS !== 'web' || !showWebCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let stream = null;
    const start = () => {
      const media = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if (!media) {
        Alert.alert('Not supported', 'Camera is not available in this browser.');
        setShowWebCamera(false);
        return;
      }
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
        .then((s) => {
          stream = s;
          streamRef.current = s;
          video.srcObject = s;
        })
        .catch((err) => {
          Alert.alert('Camera error', err?.message || 'Could not access camera.');
          setShowWebCamera(false);
        });
    };
    const t = setTimeout(start, 100);
    return () => {
      clearTimeout(t);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [showWebCamera]);

  const runWithImage = (getBase64) => {
    setLoading(true);
    setResult(null);
    getBase64()
      .then((base64) => (base64 ? analyze(base64) : undefined))
      .catch((e) => {
        if (Platform.OS !== 'web') {
          const msg = e?.message || '';
          if (msg.includes('expo-image-picker')) {
            Alert.alert('Install required', 'Run: npx expo install expo-image-picker');
          } else {
            Alert.alert('Error', msg || 'Failed to get or analyze image');
          }
        }
      })
      .finally(() => setLoading(false));
  };

  const captureWebPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.srcObject || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    setShowWebCamera(false);
    runWithImage(() => Promise.resolve(base64));
  };

  const takePhotoAndAnalyze = async () => {
    if (Platform.OS === 'web') {
      setShowWebCamera(true);
      return;
    }
    runWithImage(async () => {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync?.();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera access to take meal photos.');
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.base64) return null;
      return result.assets[0].base64;
    });
  };

  const pickAndAnalyze = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) { setLoading(false); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          runWithImage(() => Promise.resolve(base64));
        };
        reader.readAsDataURL(file);
      };
      input.click();
      setLoading(false);
      return;
    }
    runWithImage(async () => {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
      if (perm && perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to analyze meal photos.');
        return null;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
      if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return null;
      return pickerResult.assets[0].base64;
    });
  };

  const analyze = async (base64) => {
    setLoading(true);
    try {
      const res = await api.analyzeMealPhoto(base64, false);
      setResult(res);
    } catch (e) {
      Alert.alert('Error', e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meal Analyzer</Text>
        <Text style={styles.subtitle}>Take or pick a photo of your meal. Same AI as web.</Text>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={takePhotoAndAnalyze} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Take photo & analyze</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.buttonSecondary, loading && styles.buttonDisabled]} onPress={pickAndAnalyze} disabled={loading}>
          <Text style={styles.buttonSecondaryText}>Pick from gallery</Text>
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <Text style={styles.hint}>If the button does nothing, run: npx expo install expo-image-picker</Text>
        )}
        {result && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text style={styles.resultLabel}>Meal: {result.meal_name || '—'}</Text>
            <Text style={styles.resultLabel}>Carb level: {result.carb_level || '—'}</Text>
            {result.healthier_swaps && (
              <Text style={styles.resultText}>Suggestions: {result.healthier_swaps}</Text>
            )}
          </View>
        )}
      </ScrollView>
      {Platform.OS === 'web' && showWebCamera && (
        <View style={styles.cameraOverlayWrap}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24, paddingBottom: 48 },
  cameraOverlayWrap: {
    position: 'fixed',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,18,0.98)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  button: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  buttonSecondary: { backgroundColor: 'transparent', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#10b981' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 12, textAlign: 'center' },
  result: { marginTop: 24, backgroundColor: '#1e293b', borderRadius: 12, padding: 16 },
  resultTitle: { fontSize: 18, fontWeight: '600', color: '#10b981', marginBottom: 10 },
  resultLabel: { fontSize: 15, color: '#fff', marginBottom: 4 },
  resultText: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});
