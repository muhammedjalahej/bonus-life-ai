import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HeartPulse, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../config/constants';
import apiService from '../services/api';

export default function ResetPassword({ language }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isTr = language === 'turkish';

  useEffect(() => {
    if (!token) setError(isTr ? 'Geçersiz veya eksik sıfırlama bağlantısı.' : 'Invalid or missing reset link.');
  }, [token, isTr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(isTr ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError(isTr ? 'Şifre en az 6 karakter olmalıdır.' : 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || (isTr ? 'Bağlantı geçersiz veya süresi dolmuş.' : 'Invalid or expired link.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {isTr ? 'Şifre güncellendi' : 'Password updated'}
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              {isTr ? 'Yeni şifrenizle giriş yapabilirsiniz.' : 'You can now sign in with your new password.'}
            </p>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:opacity-90"
            >
              {isTr ? 'Giriş yap' : 'Sign in'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 shadow-2xl text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-emerald-400 hover:underline font-medium">
              {isTr ? 'Yeni bağlantı iste' : 'Request a new link'}
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
            {isTr ? 'Yeni şifre belirle' : 'Set new password'}
          </h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            {isTr ? 'En az 6 karakter girin.' : 'Enter at least 6 characters.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'Yeni şifre' : 'New password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'Şifre tekrar' : 'Confirm password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isTr ? 'Şifreyi güncelle' : 'Update password')}
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
