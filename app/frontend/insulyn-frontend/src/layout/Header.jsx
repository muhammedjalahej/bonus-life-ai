import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse, Menu, X, ChevronDown,
  Home, Activity, MessageSquare, Mic, Salad, AlertTriangle, Globe, LayoutDashboard, Shield, LogIn, UserPlus, LogOut,
} from 'lucide-react';

const Header = ({ language, setLanguage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const mainLinks = [
    { path: ROUTES.HOME, label: language === 'turkish' ? 'Ana Sayfa' : 'Home', icon: Home },
    { path: ROUTES.TEST, label: language === 'turkish' ? 'Değerlendirme' : 'Assessment', icon: Activity },
    { path: ROUTES.CHAT, label: language === 'turkish' ? 'Yapay Zeka Sohbet' : 'AI Chat', icon: MessageSquare },
    { path: ROUTES.VOICE_CHAT, label: language === 'turkish' ? 'Ses' : 'Voice', icon: Mic },
    { path: ROUTES.DIET_PLAN, label: language === 'turkish' ? 'Diyet' : 'Diet', icon: Salad },
    { path: ROUTES.EMERGENCY, label: language === 'turkish' ? 'Acil' : 'Emergency', icon: AlertTriangle },
  ];
  const links = [...mainLinks];
  if (user) {
    links.push({ path: ROUTES.DASHBOARD, label: language === 'turkish' ? 'Panel' : 'Dashboard', icon: LayoutDashboard });
    if (isAdmin) links.push({ path: ROUTES.ADMIN, label: 'Admin', icon: Shield });
  }

  const languages = [
    { value: 'english', label: 'EN' },
    { value: 'turkish', label: 'TR' },
  ];

  const handleNav = (path) => { navigate(path); setMobileOpen(false); };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500
      ${scrolled ? 'bg-[#060611]/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-2xl shadow-black/30' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button onClick={() => navigate(ROUTES.HOME)} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center
                              shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300
                              group-hover:scale-110">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-[#060611]" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-extrabold tracking-tight gradient-text">More Life</span>
              <span className="text-lg font-extrabold tracking-tight text-white ml-1">AI</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            {links.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 shadow-inner shadow-emerald-500/10'
                      : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Auth: Login/Register or User menu */}
            {!authLoading && (
              <>
                {!user ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleNav(ROUTES.LOGIN)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition">
                      <LogIn className="w-4 h-4" /> {language === 'turkish' ? 'Giriş' : 'Login'}
                    </button>
                    <button onClick={() => handleNav(ROUTES.REGISTER)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">
                      <UserPlus className="w-4 h-4" /> {language === 'turkish' ? 'Kayıt' : 'Register'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition">
                      <span className="max-w-[120px] truncate">{user.email}</span>
                      <ChevronDown className={`w-4 h-4 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#12121f] border border-white/[0.08] shadow-2xl shadow-black/40 py-1 z-50 overflow-hidden">
                          <div className="px-4 py-2 border-b border-white/[0.06]">
                            <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          <button onClick={() => { handleNav(ROUTES.DASHBOARD); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                            <LayoutDashboard className="w-4 h-4" /> {language === 'turkish' ? 'Panel' : 'Dashboard'}
                          </button>
                          {isAdmin && (
                            <button onClick={() => { handleNav(ROUTES.ADMIN); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                              <Shield className="w-4 h-4" /> Admin
                            </button>
                          )}
                          <button onClick={() => { logout(); setUserMenuOpen(false); handleNav(ROUTES.HOME); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
                            <LogOut className="w-4 h-4" /> {language === 'turkish' ? 'Çıkış' : 'Logout'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Language */}
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white/[0.03] border border-white/[0.06]
                           hover:bg-white/[0.06] hover:text-white transition-all">
                <Globe className="w-3.5 h-3.5" />
                {languages.find(l => l.value === language)?.label}
                <ChevronDown className="w-3 h-3" />
              </button>

              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-32 rounded-xl bg-[#12121f] border border-white/[0.08] shadow-2xl shadow-black/40 py-1 z-50 overflow-hidden">
                    {languages.map((lang) => (
                      <button key={lang.value}
                        onClick={() => { setLanguage(lang.value); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-all
                          ${language === lang.value ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#060611]/95 backdrop-blur-2xl border-t border-white/[0.04]">
          <nav className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {links.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <button key={path} onClick={() => handleNav(path)}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all
                    ${active ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              );
            })}
            {!authLoading && !user && (
              <>
                <button onClick={() => handleNav(ROUTES.LOGIN)} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04]">
                  <LogIn className="w-5 h-5" /> {language === 'turkish' ? 'Giriş' : 'Login'}
                </button>
                <button onClick={() => handleNav(ROUTES.REGISTER)} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/10">
                  <UserPlus className="w-5 h-5" /> {language === 'turkish' ? 'Kayıt' : 'Register'}
                </button>
              </>
            )}
            {!authLoading && user && (
              <button onClick={() => { logout(); handleNav(ROUTES.HOME); setMobileOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10">
                <LogOut className="w-5 h-5" /> {language === 'turkish' ? 'Çıkış' : 'Logout'}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
