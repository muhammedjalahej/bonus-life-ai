import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LiquidMetalButton } from '../components/ui/LiquidMetalButton';
import { ROUTES } from '../config/constants';
import apiService from '../services/api';

export default function ForgotPassword({ language }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const isTr = language === 'turkish';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || (isTr ? 'Bir hata oluştu.' : 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
  };

  const inputCls = "w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 bg-white/[0.04] border border-white/[0.08] focus:bg-white/[0.07] focus:border-violet-500/50 focus:[box-shadow:0_0_0_3px_rgba(124,58,237,0.12)]";

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-[#050508]" style={{ fontFamily: "'Figtree','Inter',sans-serif" }}>
        <div className="w-full max-w-md rounded-2xl p-10 text-center" style={cardStyle}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">
            {isTr ? 'E-posta Gönderildi' : 'Check Your Email'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            {isTr
              ? 'Bu e-posta ile kayıtlı hesap varsa, geçici şifrenizi gönderdik.'
              : 'If an account exists with this email, we sent you a new temporary password.'}
          </p>
          <LiquidMetalButton onClick={() => window.location.href = ROUTES.LOGIN} width={160}>
            {isTr ? 'Girişe dön' : 'Back to sign in'}
          </LiquidMetalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-[#050508]" style={{ fontFamily: "'Figtree','Inter',sans-serif" }}>

      {/* Background blobs */}
      <div className="fixed top-1/3 left-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 70%)', filter: 'blur(80px)', animation: 'blob-move 20s ease-in-out infinite' }} />

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
        </div>

        <div className="rounded-2xl p-8" style={cardStyle}>
          <h1 className="text-2xl font-black text-white mb-2 text-center">
            {isTr ? 'Şifremi Unuttum' : 'Forgot Password?'}
          </h1>
          <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
            {isTr
              ? 'E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.'
              : "Enter your email and we'll send you a reset link."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {isTr ? 'E-posta' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" style={{ width: '15px', height: '15px' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputCls} placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>

            <div className="flex justify-center">
              <LiquidMetalButton type="submit" disabled={loading} width={200}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {isTr ? 'Gönderiliyor...' : 'Sending...'}</> : (isTr ? 'Bağlantı Gönder' : 'Send Reset Link')}
              </LiquidMetalButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
