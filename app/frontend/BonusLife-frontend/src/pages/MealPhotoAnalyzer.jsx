import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, Loader2, Image as ImageIcon, Apple,
  CheckCircle, History, AlertCircle, X,
} from 'lucide-react';
import { analyzeMealPhoto, getMealLog, clearMealLog, getStoredToken } from '../services/api';

function resizeAndGetBase64(file, maxSize = 1200) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = w > maxSize || h > maxSize ? maxSize / Math.max(w, h) : 1;
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({ base64, dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export default function MealPhotoAnalyzer({ language }) {
  const isTr = language === 'turkish';
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [clearLogLoading, setClearLogLoading] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraMode, setCameraMode] = useState(false);
  const hasToken = !!getStoredToken();

  const reset = () => {
    setImageDataUrl(null);
    setImageBase64(null);
    setResult(null);
    setError('');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraMode(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const loadLog = async () => {
    if (!hasToken) return;
    setLogLoading(true);
    try {
      const data = await getMealLog(50);
      setLog(Array.isArray(data) ? data : []);
    } catch {
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    loadLog();
  }, [hasToken]);

  const handleFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    try {
      const { base64, dataUrl } = await resizeAndGetBase64(file);
      setImageBase64(base64);
      setImageDataUrl(dataUrl);
      setResult(null);
    } catch (err) {
      setError(err.message || (isTr ? 'Görsel yüklenemedi' : 'Failed to load image'));
    }
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraMode(true);
    } catch (err) {
      setError(err.message || (isTr ? 'Kamera erişilemedi' : 'Camera access denied'));
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    stopCamera();
    setImageBase64(base64);
    setImageDataUrl(dataUrl);
    setResult(null);
  };

  const analyze = async (saveToLog = false) => {
    if (!imageBase64) {
      setError(isTr ? 'Önce bir fotoğraf ekleyin veya çekin.' : 'Please add or take a photo first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await analyzeMealPhoto(imageBase64, saveToLog);
      setResult(data);
      if (saveToLog && data.saved_to_log) loadLog();
    } catch (err) {
      setError(err.message || (isTr ? 'Analiz başarısız.' : 'Analysis failed.'));
    } finally {
      setLoading(false);
    }
  };

  const carbColor = (level) => {
    if (level === 'low') return 'text-emerald-400';
    if (level === 'high') return 'text-amber-400';
    return 'text-cyan-400';
  };

  const carbLabel = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'low') return isTr ? 'Düşük' : 'Low';
    if (l === 'high') return isTr ? 'Yüksek' : 'High';
    return isTr ? 'Orta' : 'Medium';
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="relative z-10 min-h-screen pt-24 pb-12 px-6 sm:px-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-6 mt-12 sm:mt-16">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-10 flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Apple className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {isTr ? 'Öğün Analizi' : 'Meal Analyzer'}
              </h1>
            </div>
            <p className="text-base text-gray-500 mb-8 max-w-xl">
              {isTr ? 'Yemek fotoğrafı yükleyin veya çekin; öğün adı, karbonhidrat seviyesi ve daha sağlıklı alternatifler gösterilir.' : 'Upload or take a meal photo to get meal name, carb level, and healthier swap suggestions.'}
            </p>

            {/* Capture / Upload */}
            {!cameraMode && !imageDataUrl && (
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-3 px-5 py-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition text-base font-medium"
                >
                  <Camera className="w-5 h-5" />
                  {isTr ? 'Fotoğraf çek' : 'Take photo'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-3 px-5 py-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.08] transition text-base font-medium"
                >
                  <Upload className="w-5 h-5" />
                  {isTr ? 'Yükle' : 'Upload'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
            )}

            {cameraMode && (
              <div className="mb-6">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={captureFromCamera} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-medium">
                    {isTr ? 'Çek' : 'Capture'}
                  </button>
                  <button type="button" onClick={stopCamera} className="py-2.5 px-4 rounded-xl bg-white/10 text-gray-400 hover:text-white">
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {imageDataUrl && !cameraMode && (
              <div className="mb-6">
                <img src={imageDataUrl} alt="Meal" className="w-full rounded-xl object-cover max-h-56 bg-black/40" />
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => analyze(false)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {isTr ? 'Analiz et' : 'Analyze'}
                  </button>
                  {hasToken && (
                    <button
                      type="button"
                      onClick={() => analyze(true)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:text-white border border-white/10 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {isTr ? 'Analiz et ve kaydet' : 'Analyze & save to log'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition"
                  >
                    <X className="w-4 h-4" />
                    {isTr ? 'Temizle' : 'Clear'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="mb-6 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <p className="text-sm text-gray-400">
                  {isTr ? 'Öğün' : 'Meal'}: <span className="text-white font-medium">{result.meal_name}</span>
                </p>
                <p className="text-sm text-gray-400">
                  {isTr ? 'Karbonhidrat' : 'Carb level'}: <span className={carbColor(result.carb_level)}>{carbLabel(result.carb_level)}</span>
                </p>
                <p className="text-sm text-gray-400">
                  {isTr ? 'Daha sağlıklı alternatifler' : 'Healthier swaps'}: <span className="text-gray-300">{result.healthier_swaps}</span>
                </p>
                {result.saved_to_log && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {isTr ? 'Günlüğe kaydedildi.' : 'Saved to your log.'}
                  </p>
                )}
                <p className="text-xs text-gray-500 pt-1">
                  {isTr ? 'Başka öğün analiz etmek için Temizle\'ye tıklayın.' : 'Click Clear to analyze another meal.'}
                </p>
              </div>
            )}
          </div>

          {/* Meal history (logged-in users) */}
          {hasToken && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-8 sm:p-8 w-full sm:w-80 shrink-0 sm:order-3 sm:min-h-[200px]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-base font-semibold text-gray-300 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {isTr ? 'Öğün geçmişi' : 'Meal history'}
                </h2>
                {log.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      setClearLogLoading(true);
                      try {
                        await clearMealLog();
                        await loadLog();
                      } catch (e) {
                        setError(e.message || (isTr ? 'Geçmiş silinemedi.' : 'Could not clear history.'));
                      } finally {
                        setClearLogLoading(false);
                      }
                    }}
                    disabled={clearLogLoading}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                    title={isTr ? 'Geçmişi temizle' : 'Clear history'}
                  >
                    {clearLogLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span aria-hidden>🗑️</span>}
                  </button>
                )}
              </div>
              {logLoading ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isTr ? 'Yükleniyor...' : 'Loading...'}
                </p>
              ) : log.length === 0 ? (
                <p className="text-base text-gray-500">{isTr ? 'Henüz kayıtlı öğün yok.' : 'No meals saved yet.'}</p>
              ) : (
                <ul className="space-y-3 max-h-64 overflow-y-auto">
                  {log.map((entry) => (
                    <li key={entry.id} className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-sm font-medium text-white">{entry.meal_name}</p>
                      <p className="text-xs text-gray-500">
                        {carbLabel(entry.carb_level)} carb · {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                      </p>
                      {entry.healthier_swaps && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{entry.healthier_swaps}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
