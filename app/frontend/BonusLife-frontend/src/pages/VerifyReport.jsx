import React, { useState, useRef, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Upload, Loader2 } from 'lucide-react';
import { verifyReportSignature } from '../services/api';

export default function VerifyReport({ language, embedded = false }) {
  const isTr = language === 'turkish';
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
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const handleDecode = async (data) => {
    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      setStatus({ valid: false, error: isTr ? 'Geçersiz QR verisi.' : 'Invalid QR data.' });
      return;
    }
    const { payload_hash, signature_b64, report_id, issued_at, alg, assessment_db_id } = payload;
    if (!payload_hash || !signature_b64) {
      setStatus({ valid: false, error: isTr ? 'QR imza bilgisi eksik.' : 'Missing signature data in QR.' });
      return;
    }
    setVerifying(true);
    setStatus(null);
    try {
      const result = await verifyReportSignature(payload_hash, signature_b64);
      setStatus({
        valid: result.valid,
        report_id: report_id || '',
        issued_at: issued_at || '',
        alg: alg || 'ES256',
        assessment_db_id: assessment_db_id != null ? assessment_db_id : '',
      });
    } catch (err) {
      setStatus({ valid: false, error: err.message || (isTr ? 'Doğrulama başarısız.' : 'Verification failed.') });
    } finally {
      setVerifying(false);
      stopScanner();
    }
  };

  const startCamera = async () => {
    setStatus(null);
    if (!videoRef.current) return;
    try {
      const QrScanner = (await import('qr-scanner')).default;
      const scanner = new QrScanner(videoRef.current, (result) => handleDecode(result.data), { preferredCamera: 'environment' });
      await scanner.start();
      scannerRef.current = scanner;
      setScanning(true);
    } catch (err) {
      setStatus({ valid: false, error: err.message || (isTr ? 'Kamera açılamadı.' : 'Could not access camera.') });
    }
  };

  const scanFileWithQrScanner = (fileOrBlob) => {
    return import('qr-scanner').then(({ default: QrScanner }) =>
      QrScanner.scanImage(fileOrBlob, { returnDetailedScanResult: true })
    );
  };

  const resizeImageIfNeeded = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 1600;
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w <= 0 || h <= 0 || (w <= maxDim && h <= maxDim)) {
          resolve(file);
          return;
        }
        const scale = maxDim / Math.max(w, h);
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(
          (blob) => resolve(blob || file),
          'image/png',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setVerifying(true);
    e.target.value = '';

    if (file.type === 'application/pdf') {
      setStatus({
        valid: false,
        error: isTr
          ? 'Lütfen PDF\'teki yalnızca QR kodun ekran görüntüsünü yükleyin veya "Kamerayı Aç" ile tarayın.'
          : 'Please upload a screenshot of just the QR code on the PDF, or use "Scan with camera".',
      });
      setVerifying(false);
      return;
    }

    try {
      const toScan = await resizeImageIfNeeded(file);
      const result = await scanFileWithQrScanner(toScan);
      await handleDecode(result.data);
    } catch {
      setStatus({
        valid: false,
        error: isTr
          ? 'QR kod bulunamadı. Sadece QR kodu kırpıp yükleyin veya "Kamerayı Aç" ile deneyin.'
          : 'No QR code found. Try cropping to just the QR code, or use "Scan with camera".',
      });
    } finally {
      setVerifying(false);
    }
  };

  const content = (
    <>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{isTr ? 'Rapor Doğrula' : 'Verify Report'}</h1>
              <p className="text-sm text-gray-500">{isTr ? 'İmzalı PDF üzerindeki QR kodu tarayın veya QR ekran görüntüsü yükleyin' : 'Scan the QR on your signed PDF, or upload a screenshot of the QR code'}</p>
            </div>
          </div>

          {!scanning && !status && (
            <div className="space-y-3">
              <button type="button" onClick={startCamera} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition font-medium">
                <QrCode className="w-5 h-5" /> {isTr ? 'Kamerayı Aç' : 'Scan with camera'}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] text-gray-300 border border-white/[0.08] hover:bg-white/[0.08] transition font-medium">
                <Upload className="w-5 h-5" /> {isTr ? 'QR Görseli Yükle' : 'Upload QR image'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            </div>
          )}

          {scanning && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-64">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              </div>
              <button type="button" onClick={stopScanner} className="w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.05]">
                {isTr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          )}

          {verifying && (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> {isTr ? 'Doğrulanıyor...' : 'Verifying...'}
            </div>
          )}

          {status && !verifying && (
            <div className={`rounded-xl border p-4 ${status.valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                {status.valid ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <XCircle className="w-8 h-8 text-red-400" />}
                <span className={`text-lg font-bold ${status.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {status.valid ? (isTr ? 'GEÇERLİ' : 'VALID') : (status.error || (isTr ? 'GEÇERSİZ' : 'INVALID'))}
                </span>
              </div>
              {status.valid && (
                <dl className="text-sm space-y-1 text-gray-300">
                  {status.report_id && <><dt className="text-gray-500">Report ID</dt><dd className="font-mono truncate">{status.report_id}</dd></>}
                  {status.issued_at && <><dt className="text-gray-500">Issued</dt><dd>{status.issued_at}</dd></>}
                  {status.alg && <><dt className="text-gray-500">Algorithm</dt><dd>{status.alg}</dd></>}
                  {status.assessment_db_id !== '' && <><dt className="text-gray-500">Assessment ID</dt><dd>{status.assessment_db_id}</dd></>}
                </dl>
              )}
              <button type="button" onClick={() => { setStatus(null); }} className="mt-4 text-sm text-gray-400 hover:text-white">
                {isTr ? 'Yeni tarama' : 'Scan again'}
              </button>
            </div>
          )}
    </>
  );

  if (embedded) {
    return (
      <div className="relative">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          {content}
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          {isTr ? 'Bu, Adobe PDF imzası değildir; rapor içeriğinin kriptografik kanıtı QR ile doğrulanır.' : 'This is not an Adobe PDF signature; it verifies the report via cryptographic proof in the QR.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="relative z-10 min-h-screen pt-24 pb-12 px-6 sm:px-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6">
            {content}
          </div>
          <p className="text-xs text-gray-600 mt-4 text-center">
            {isTr ? 'Bu, Adobe PDF imzası değildir; rapor içeriğinin kriptografik kanıtı QR ile doğrulanır.' : 'This is not an Adobe PDF signature; it verifies the report via cryptographic proof in the QR.'}
          </p>
        </div>
      </div>
    </div>
  );
}
