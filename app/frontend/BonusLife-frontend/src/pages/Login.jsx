import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, User, Shield, ScanFace, Sparkles, RefreshCw } from 'lucide-react';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { Particles } from '../components/ui/particles';
import { ROUTES } from '../config/constants';
import { haptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

const LOGIN_AS_USER  = 'user';
const LOGIN_AS_ADMIN = 'admin';


export default function Login({ language }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login, loginWithFace } = useAuth();

  const [loginAs,          setLoginAs]          = useState(LOGIN_AS_USER);
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [error,            setError]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [faceLoginOpen,    setFaceLoginOpen]    = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceModelsReady,  setFaceModelsReady]  = useState(false);
  const [faceError,        setFaceError]        = useState('');
  const [faceLoading,      setFaceLoading]      = useState(false);
  const [faceStage,        setFaceStage]        = useState('idle'); // idle | scanning | detected | verifying | failed

  const emailRef             = useRef(null);
  const videoRef             = useRef(null);
  const canvasRef            = useRef(null);
  const streamRef            = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const faceCheckTimeoutRef  = useRef(null);
  const faceVerifyingRef     = useRef(false);

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const isTr = language === 'turkish';

  useEffect(() => {
    return () => {
      if (faceCheckIntervalRef.current) clearTimeout(faceCheckIntervalRef.current);
      if (faceCheckTimeoutRef.current)  clearTimeout(faceCheckTimeoutRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!faceLoginOpen) return;
    setFaceCameraActive(false);
    setFaceError('');
    setFaceModelsReady(false);
    setFaceLoading(false);
    setFaceStage('idle');
    import('../utils/faceEmbedding').then((m) => {
      m.preloadFaceModels().then(() => setFaceModelsReady(true));
    });
  }, [faceLoginOpen]);

  useEffect(() => {
    if (!faceLoginOpen || !faceModelsReady || !videoRef.current) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        setFaceCameraActive(true);
      })
      .catch((e) => setFaceError(e.message || (isTr ? 'Kamera erişilemedi.' : 'Camera access denied.')));
    return () => { cancelled = true; };
  }, [faceLoginOpen, faceModelsReady, language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), (password || '').trim());
      const user = data?.user ?? null;
      haptic('success');
      if (loginAs === LOGIN_AS_ADMIN) {
        if (user?.role !== 'admin') {
          setError(isTr ? 'Bu hesap yönetici değil. Yukarıdan "Kullanıcı" seçip tekrar giriş yapın.' : 'This account is not an admin. Switch to "User" above and sign in again.');
          setLoading(false);
          return;
        }
        navigate(ROUTES.ADMIN, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.message || (isTr ? 'Giriş başarısız.' : 'Login failed.');
      setError(msg);
      requestAnimationFrame(() => { emailRef.current?.focus(); });
    } finally {
      setLoading(false);
    }
  };

  const runFaceVerify = useCallback(async (embedding) => {
    if (faceVerifyingRef.current) return;
    faceVerifyingRef.current = true;
    if (faceCheckIntervalRef.current) clearTimeout(faceCheckIntervalRef.current);
    if (faceCheckTimeoutRef.current)  clearTimeout(faceCheckTimeoutRef.current);
    setFaceLoading(true);
    setFaceStage('verifying');
    try {
      const data = await loginWithFace(embedding);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      setFaceLoginOpen(false);
      haptic('success');
      navigate(loginAs === LOGIN_AS_ADMIN && data?.user?.role === 'admin' ? ROUTES.ADMIN : from, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      const isNoMatch = msg.includes('401') || msg.toLowerCase().includes('no matching face') || msg.toLowerCase().includes('confidence too low');
      setFaceStage('failed');
      if (isNoMatch) {
        setFaceError(isTr
          ? 'Yüz tanınmadı. Dashboard\'da "Yüzle giriş" kurun veya iyi ışıkta tekrar deneyin.'
          : 'Face not recognized. Set up face login in Dashboard first, or try again in good lighting.');
      } else {
        setFaceError(msg || (isTr ? 'Yüz doğrulama başarısız.' : 'Face verification failed.'));
      }
      setFaceLoading(false);
    } finally {
      faceVerifyingRef.current = false;
    }
  }, [loginWithFace, loginAs, from, isTr, navigate]);

  // Draw face bounding box on the overlay canvas
  const drawBox = useCallback((box) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const scaleX = canvas.width  / (video.videoWidth  || 1);
    const scaleY = canvas.height / (video.videoHeight || 1);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!box) return;
    ctx.strokeStyle = 'rgba(124,58,237,0.9)';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    const x = box.x * scaleX, y = box.y * scaleY;
    const w = box.width * scaleX, h = box.height * scaleY;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,      x + w, y + r,      r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x,      y + h, x,      y + h - r, r);
    ctx.lineTo(x, y + r);     ctx.arcTo(x,      y,     x + r,  y,          r);
    ctx.closePath();
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!faceLoginOpen || !faceCameraActive || faceLoading) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.clientWidth;
    canvas.height = video.clientHeight;

    let running = true;
    let modCache = null;
    const getmod = async () => {
      if (!modCache) modCache = await import('../utils/faceEmbedding');
      return modCache;
    };

    const startVerify = async () => {
      if (faceVerifyingRef.current || !running) return;
      setFaceStage('scanning');
      const mod = await getmod();
      const embedding = await mod.getVerificationEmbedding(video, (result) => {
        if (!running) return;
        if (result) { setFaceStage('detected'); drawBox(result.box); }
        else        { setFaceStage('scanning'); drawBox(null); }
      });
      if (!running) return;
      if (embedding) {
        runFaceVerify(embedding);
      } else {
        faceCheckIntervalRef.current = setTimeout(startVerify, 600);
      }
    };

    faceCheckTimeoutRef.current = setTimeout(() => {
      if (!running || faceVerifyingRef.current) return;
      running = false;
      setFaceError(isTr ? 'Yüz algılanamadı. İptal edip tekrar deneyin.' : 'No face detected. Cancel and try again.');
      setFaceStage('failed');
    }, 30000);

    startVerify();

    return () => {
      running = false;
      if (faceCheckIntervalRef.current) clearTimeout(faceCheckIntervalRef.current);
      if (faceCheckTimeoutRef.current)  clearTimeout(faceCheckTimeoutRef.current);
    };
  }, [faceLoginOpen, faceCameraActive, faceLoading, isTr, runFaceVerify, drawBox]);

  const closeFaceLogin = () => {
    if (faceCheckIntervalRef.current) clearTimeout(faceCheckIntervalRef.current);
    if (faceCheckTimeoutRef.current)  clearTimeout(faceCheckTimeoutRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    faceVerifyingRef.current = false;
    setFaceCameraActive(false);
    setFaceLoginOpen(false);
    setFaceError('');
    setFaceStage('idle');
  };

  const retryFaceScan = () => {
    setFaceError('');
    setFaceStage('scanning');
    setFaceLoading(false);
    faceVerifyingRef.current = false;
    setFaceCameraActive(false);
    requestAnimationFrame(() => setFaceCameraActive(true));
  };

  /* ── Input shared style ── */
  const inputCls = "w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
    + " bg-white/[0.05] border border-white/[0.1]"
    + " focus:bg-white/[0.08] focus:border-white/30"
    + " [box-shadow:none] focus:[box-shadow:0_0_0_3px_rgba(255,255,255,0.05)]";

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0c0c0c', fontFamily: "'Figtree','Inter',sans-serif" }}>

      {/* Particles background */}
      <Particles color="#ffffff" quantity={160} ease={40} size={0.6} staticity={30} className="absolute inset-0" />

      {/* Centred form */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">

          <div>
            <h1 className="text-2xl font-bold tracking-wide text-white">
              {isTr ? 'Hoş Geldiniz' : 'Welcome back'}
            </h1>
            <p className="text-gray-500 text-base mt-1">
              {isTr ? 'Hesabınıza giriş yapın' : 'Sign in to your account to continue'}
            </p>
          </div>

          {/* User / Admin toggle */}
          <div className="flex p-1 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button type="button" onClick={() => setLoginAs(LOGIN_AS_USER)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${loginAs === LOGIN_AS_USER ? 'text-white' : 'text-gray-500 hover:text-white'}`}
              style={loginAs === LOGIN_AS_USER ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' } : {}}>
              <User style={{ width: '15px', height: '15px' }} />
              {isTr ? 'Kullanıcı' : 'User'}
            </button>
            <button type="button" onClick={() => setLoginAs(LOGIN_AS_ADMIN)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${loginAs === LOGIN_AS_ADMIN ? 'text-white' : 'text-gray-500 hover:text-white'}`}
              style={loginAs === LOGIN_AS_ADMIN ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' } : {}}>
              <Shield style={{ width: '15px', height: '15px' }} />
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'login-error' : undefined}>
            {error && (
              <div id="login-error" role="alert" aria-live="assertive"
                className="p-3.5 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {isTr ? 'E-posta' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input ref={emailRef} id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" required autoComplete="email"
                  aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {isTr ? 'Şifre' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls} placeholder="••••••••" required autoComplete="current-password"
                  aria-invalid={!!error} />
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
                {isTr ? 'Şifremi unuttum' : 'Forgot password?'}
              </Link>
            </div>

            {/* Submit */}
            <div className="flex justify-center">
              <LiquidMetalButton type="submit" disabled={loading} width={180}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isTr ? 'Giriş yapılıyor...' : 'Signing in...'}</> : <><Sparkles className="w-4 h-4" /> {isTr ? 'Giriş Yap' : 'Sign in'}</>}
              </LiquidMetalButton>
            </div>

            {/* Face login */}
            <button type="button" onClick={() => setFaceLoginOpen(true)} disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-gray-300 text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:text-white hover:bg-white/[0.07] disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <ScanFace style={{ width: '16px', height: '16px' }} />
              {isTr ? 'Yüzümle giriş yap' : 'Sign in with face'}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-gray-600">
            {isTr ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
            <Link to={ROUTES.REGISTER} className="text-gray-300 hover:text-white font-semibold transition-colors">
              {isTr ? 'Kayıt ol' : 'Get started free'}
            </Link>
          </p>
        </div>
      </div>

      {/* ── Face Login Modal ── */}
      {faceLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label={isTr ? 'Yüz girişi' : 'Face sign-in'}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ background: '#0d0d18', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
            <div className="p-6 pb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <ScanFace className="h-5 w-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{isTr ? 'Yüzünüzü tanıyın' : 'Sign in with your face'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{isTr ? 'Otomatik giriş' : 'Automatic sign-in'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                {isTr ? 'Kameraya bakın — yüzünüz tanındığında otomatik giriş yapılacak.' : "Look at the camera — you'll be signed in automatically when recognized."}
              </p>

              {/* Video + canvas overlay */}
              <div className="relative rounded-xl overflow-hidden bg-black/80 aspect-video mb-4"
                style={{ border: `1px solid ${faceStage === 'detected' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.3s' }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
                {/* Corner guide lines while scanning */}
                {faceCameraActive && faceStage === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    {[['top-2 left-2','border-t-2 border-l-2'],['top-2 right-2','border-t-2 border-r-2'],
                      ['bottom-2 left-2','border-b-2 border-l-2'],['bottom-2 right-2','border-b-2 border-r-2']].map(([pos, border]) => (
                      <div key={pos} className={`absolute ${pos} w-6 h-6 ${border} border-purple-500/50 rounded-sm`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div className="min-h-[2.25rem] flex items-center gap-2 mb-4 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {!faceModelsReady && (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    {isTr ? 'Yüz tanıma hazırlanıyor…' : 'Preparing face recognition…'}
                  </p>
                )}
                {faceModelsReady && !faceCameraActive && !faceError && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    {isTr ? 'Kamera açılıyor…' : 'Starting camera…'}
                  </p>
                )}
                {faceModelsReady && faceCameraActive && faceStage === 'scanning' && !faceError && (
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
                    {isTr ? 'Yüzünüz aranıyor…' : 'Scanning for your face…'}
                  </p>
                )}
                {faceStage === 'detected' && !faceLoading && !faceError && (
                  <p className="text-sm text-purple-300 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    {isTr ? 'Yüz tespit edildi, analiz ediliyor…' : 'Face detected, analyzing…'}
                  </p>
                )}
                {faceStage === 'verifying' && (
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    {isTr ? 'Giriş yapılıyor…' : 'Signing you in…'}
                  </p>
                )}
                {faceError && <p className="text-sm text-red-400 flex-1">{faceError}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center">
                {faceStage === 'failed' ? (
                  <button type="button" onClick={retryFaceScan}
                    className="py-2.5 px-4 rounded-xl text-sm font-semibold text-purple-300 hover:text-white hover:bg-purple-500/10 transition-all duration-200 flex items-center gap-2"
                    style={{ border: '1px solid rgba(124,58,237,0.25)' }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isTr ? 'Tekrar dene' : 'Try again'}
                  </button>
                ) : <div />}
                <button type="button" onClick={closeFaceLogin}
                  className="py-2.5 px-5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                  style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
