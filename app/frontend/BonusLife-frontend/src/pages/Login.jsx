import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HeartPulse, Mail, Lock, Loader2, User, Shield, ScanFace } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { haptic } from '../utils/haptics';
import { useAuth } from '../context/AuthContext';

const LOGIN_AS_USER = 'user';
const LOGIN_AS_ADMIN = 'admin';

export default function Login({ language }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithFace } = useAuth();
  const [loginAs, setLoginAs] = useState(LOGIN_AS_USER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceLoginOpen, setFaceLoginOpen] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceModelsReady, setFaceModelsReady] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceLoading, setFaceLoading] = useState(false);
  const emailRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const faceCheckTimeoutRef = useRef(null);
  const faceVerifyingRef = useRef(false);

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const isTr = language === 'turkish';

  useEffect(() => {
    return () => {
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
      if (faceCheckTimeoutRef.current) clearTimeout(faceCheckTimeoutRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // When face modal opens: preload models, then auto-start camera
  useEffect(() => {
    if (!faceLoginOpen) return;
    setFaceCameraActive(false);
    setFaceError('');
    setFaceModelsReady(false);
    setFaceLoading(false);
    import('../utils/faceEmbedding').then((m) => {
      m.preloadFaceModels().then(() => setFaceModelsReady(true));
    });
  }, [faceLoginOpen]);

  // When models are ready, auto-start camera (no Start camera button)
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
      .catch((e) => setFaceError(e.message || (language === 'turkish' ? 'Kamera erişilemedi.' : 'Camera access denied.')));
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

  const runFaceVerify = React.useCallback(async (embedding) => {
    if (faceVerifyingRef.current) return;
    faceVerifyingRef.current = true;
    if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    if (faceCheckTimeoutRef.current) clearTimeout(faceCheckTimeoutRef.current);
    setFaceLoading(true);
    try {
      const data = await loginWithFace(embedding);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      setFaceLoginOpen(false);
      haptic('success');
      navigate(loginAs === LOGIN_AS_ADMIN && data?.user?.role === 'admin' ? ROUTES.ADMIN : from, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      const isNoMatch = msg.includes('401') || msg.toLowerCase().includes('no matching face') || msg.toLowerCase().includes('confidence too low');
      if (isNoMatch) {
        setFaceError(isTr
          ? 'Yüz tanınmadı. Önce Dashboard\'da "Yüzle giriş" kurun veya iyi ışıkta tekrar deneyin. E-posta ve şifre ile de giriş yapabilirsiniz.'
          : 'Face not recognized. Set up face login in Dashboard first, or try again in good lighting. You can also sign in with email and password.');
      } else {
        setFaceError(msg || (isTr ? 'Yüz doğrulama başarısız.' : 'Face verification failed.'));
      }
      setFaceLoading(false);
    } finally {
      faceVerifyingRef.current = false;
    }
  }, [loginWithFace, loginAs, from, isTr, navigate]);

  // Auto-detect face and verify: poll every 800ms once camera is active (stop when verifying)
  useEffect(() => {
    if (!faceLoginOpen || !faceCameraActive || faceLoading) return;
    const video = videoRef.current;
    if (!video) return;

    const AUTO_CAPTURE_INTERVAL_MS = 800;
    const GIVE_UP_MS = 25000;

    const tryCapture = async () => {
      if (faceVerifyingRef.current) return;
      const { getFaceEmbedding } = await import('../utils/faceEmbedding');
      const embedding = await getFaceEmbedding(video);
      if (embedding && embedding.length > 0) runFaceVerify(embedding);
    };

    faceCheckIntervalRef.current = setInterval(tryCapture, AUTO_CAPTURE_INTERVAL_MS);
    faceCheckTimeoutRef.current = setTimeout(() => {
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
      if (!faceLoading) setFaceError(isTr ? 'Yüz algılanamadı. İptal edip tekrar deneyin.' : 'No face detected. Cancel and try again.');
    }, GIVE_UP_MS);

    return () => {
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
      if (faceCheckTimeoutRef.current) clearTimeout(faceCheckTimeoutRef.current);
    };
  }, [faceLoginOpen, faceCameraActive, faceLoading, isTr, runFaceVerify]);

  const closeFaceLogin = () => {
    if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    if (faceCheckTimeoutRef.current) clearTimeout(faceCheckTimeoutRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    faceVerifyingRef.current = false;
    setFaceCameraActive(false);
    setFaceLoginOpen(false);
    setFaceError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <HeartPulse className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            {isTr ? 'Giriş Yap' : 'Sign in'}
          </h1>
          <p className="text-gray-500 text-center text-sm mb-4">
            {isTr ? 'Hesabınıza erişin' : 'Access your account'}
          </p>

          {/* User / Admin toggle */}
          <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => setLoginAs(LOGIN_AS_USER)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${loginAs === LOGIN_AS_USER ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
            >
              <User className="w-4 h-4" /> {isTr ? 'Kullanıcı' : 'User'}
            </button>
            <button
              type="button"
              onClick={() => setLoginAs(LOGIN_AS_ADMIN)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${loginAs === LOGIN_AS_ADMIN ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-white'}`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'login-error' : undefined}>
            {error && (
              <div id="login-error" role="alert" aria-live="assertive" className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'E-posta' : 'Email'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'Şifre' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  aria-invalid={!!error}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isTr ? 'Giriş Yap' : 'Sign in')}
            </button>

            <button
              type="button"
              onClick={() => setFaceLoginOpen(true)}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ScanFace className="w-5 h-5" />
              {isTr ? 'Yüzümle giriş yap' : 'Sign in with your face'}
            </button>
          </form>

          {faceLoginOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={isTr ? 'Yüz girişi' : 'Face sign-in'}>
              <div className="rounded-2xl w-full max-w-md bg-gradient-to-b from-[#0f0f18] to-[#0a0a10] border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden">
                <div className="p-6 pb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                      <ScanFace className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{isTr ? 'Yüzünüzü tanıyın' : 'Sign in with your face'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{isTr ? 'Otomatik giriş' : 'Automatic sign-in'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                    {isTr ? 'Kameraya bakın — yüzünüz tanındığında otomatik giriş yapılacak.' : 'Look at the camera — you’ll be signed in automatically when recognized.'}
                  </p>
                  <div className="relative rounded-xl overflow-hidden bg-black/80 aspect-video mb-4 ring-2 ring-white/[0.06] ring-inset">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {faceCameraActive && !faceLoading && (
                      <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/20 rounded-xl" aria-hidden />
                    )}
                  </div>
                  <div className="min-h-[2.25rem] flex items-center gap-2 mb-4 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                    {!faceModelsReady && (
                      <p className="text-sm text-emerald-400/90 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        {isTr ? 'Yüz tanıma hazırlanıyor…' : 'Preparing face recognition…'}
                      </p>
                    )}
                    {faceModelsReady && !faceCameraActive && !faceError && (
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        {isTr ? 'Kamera açılıyor…' : 'Starting camera…'}
                      </p>
                    )}
                    {faceModelsReady && faceCameraActive && !faceLoading && !faceError && (
                      <p className="text-sm text-emerald-400/90 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isTr ? 'Yüzünüz aranıyor…' : 'Looking for your face…'}
                      </p>
                    )}
                    {faceLoading && (
                      <p className="text-sm text-emerald-400 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        {isTr ? 'Giriş yapılıyor…' : 'Signing you in…'}
                      </p>
                    )}
                    {faceError && (
                      <p className="text-sm text-red-400/95 flex-1">{faceError}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeFaceLogin}
                      className="py-2.5 px-5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.12] transition"
                    >
                      {isTr ? 'İptal' : 'Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-sm">
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-emerald-400 hover:underline font-medium">
              {isTr ? 'Şifremi unuttum' : 'Forgot password?'}
            </Link>
          </p>
          <p className="mt-4 text-center text-sm text-gray-500">
            {isTr ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
            <Link to={ROUTES.REGISTER} className="text-emerald-400 hover:underline font-medium">
              {isTr ? 'Kayıt ol' : 'Register'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
