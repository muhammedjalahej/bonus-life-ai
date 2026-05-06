import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { Particles } from '../components/ui/particles';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';


export default function Register({ language }) {
  const navigate    = useNavigate();
  const { register: doRegister, allowSignups } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const isTr = language === 'turkish';

  /* Registration closed */
  if (allowSignups === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0c0c0c' }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <AlertCircle className="w-7 h-7 text-gray-300" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">
            {isTr ? 'Kayıt kapalı' : 'Registration Disabled'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {isTr ? 'Yeni hesap oluşturma şu an kapalı.' : 'New account registration is currently disabled.'}
          </p>
          <Link to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-gray-300 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {isTr ? 'Giriş yap' : 'Go to Login'}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await doRegister(email.trim(), password, fullName.trim());
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err.message || (isTr ? 'Kayıt başarısız.' : 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200"
    + " bg-white/[0.05] border border-white/[0.1]"
    + " focus:bg-white/[0.08] focus:border-white/30"
    + " [box-shadow:none] focus:[box-shadow:0_0_0_3px_rgba(255,255,255,0.05)]";

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0c0c0c', fontFamily: "'Figtree','Inter',sans-serif" }}>

      <Particles color="#ffffff" quantity={160} ease={40} size={0.6} staticity={30} className="absolute inset-0" />

<div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">

          <div className="mb-2">
            <h1 className="text-3xl font-black text-white leading-tight">
              {isTr ? 'Hesap Oluşturun' : 'Create your account'}
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              {isTr ? 'Bonus Life AI ile sağlığınıza yatırım yapın' : 'Join thousands taking control of their health with AI'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3.5 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {isTr ? 'Ad Soyad' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                  placeholder={isTr ? 'Adınız Soyadınız' : 'Your full name'}
                  autoComplete="name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {isTr ? 'E-posta' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {isTr ? 'Şifre' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Min. 6 characters" required minLength={6}
                  autoComplete="new-password" />
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <LiquidMetalButton type="submit" disabled={loading} width={180}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {isTr ? 'Kayıt Olunuyor...' : 'Creating...'}</>
                  : <><Sparkles className="w-4 h-4" /> {isTr ? 'Ücretsiz Kayıt Ol' : 'Create Free Account'}</>}
              </LiquidMetalButton>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {isTr ? 'Zaten hesabınız var mı?' : 'Already have an account?'}{' '}
            <Link to={ROUTES.LOGIN} className="text-gray-300 hover:text-white font-semibold transition-colors">
              {isTr ? 'Giriş yap' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
