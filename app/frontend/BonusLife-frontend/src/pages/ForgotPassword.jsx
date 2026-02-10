import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../config/constants';
import apiService from '../services/api';

export default function ForgotPassword({ language }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
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

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {isTr ? 'E-posta gönderildi' : 'Check your email'}
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              {isTr
                ? 'Bu e-posta adresiyle kayıtlı bir hesap varsa, yeni geçici şifrenizi e-posta ile gönderdik.'
                : 'If an account exists with this email, we sent you a new temporary password.'}
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-emerald-400 hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> {isTr ? 'Girişe dön' : 'Back to sign in'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {isTr ? 'Şifremi unuttum' : 'Forgot password'}
          </h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            {isTr ? 'E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.' : 'Enter your email and we\'ll send you a reset link.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'E-posta' : 'Email'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isTr ? 'Bağlantı gönder' : 'Send reset link')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to={ROUTES.LOGIN} className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> {isTr ? 'Girişe dön' : 'Back to sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
