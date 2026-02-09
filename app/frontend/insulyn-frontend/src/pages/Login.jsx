import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HeartPulse, Mail, Lock, Loader2, User, Shield } from 'lucide-react';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';

const LOGIN_AS_USER = 'user';
const LOGIN_AS_ADMIN = 'admin';

export default function Login({ language }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loginAs, setLoginAs] = useState(LOGIN_AS_USER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
  const isTr = language === 'turkish';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), (password || '').trim());
      const user = data?.user ?? null;
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
      setError(err.message || (isTr ? 'Giriş başarısız.' : 'Login failed.'));
    } finally {
      setLoading(false);
    }
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
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{isTr ? 'Şifre' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
          </form>

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
