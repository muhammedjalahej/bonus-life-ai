import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, getAvatarUrl } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import {
  HeartPulse, Menu, X, ChevronDown, Bell, Check,
  Home, Activity, MessageSquare, Mic, AlertTriangle, MapPin, Globe, LayoutDashboard, Shield, LogIn, UserPlus, LogOut,
  Users, BarChart3, Settings, Compass,
} from 'lucide-react';
import { useUXSettings } from '../context/UXSettingsContext';
import { useTour } from '../tour/TourContext';

const Header = ({ language, setLanguage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAdmin, logout, allowSignups } = useAuth();
  const { setUxModalOpen } = useUXSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load notifications for logged-in users
  useEffect(() => {
    if (!user || isAdmin) return;
    const load = async () => {
      try {
        const data = await getNotifications(20);
        setNotifications(Array.isArray(data) ? data : []);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const userLinks = [
    { path: ROUTES.HOME, label: language === 'turkish' ? 'Ana Sayfa' : 'Home', icon: Home, dataTour: 'nav-home' },
    { path: ROUTES.TEST, label: language === 'turkish' ? 'Değerlendirme' : 'Assessment', icon: Activity, dataTour: 'nav-assessment' },
    { path: ROUTES.CHAT, label: language === 'turkish' ? 'Yapay Zeka Sohbet' : 'AI Chat', icon: MessageSquare, dataTour: 'nav-chat' },
    { path: ROUTES.VOICE_CHAT, label: language === 'turkish' ? 'Ses' : 'Voice', icon: Mic, dataTour: 'nav-voice' },
    { path: ROUTES.EMERGENCY, label: language === 'turkish' ? 'Acil' : 'Emergency', icon: AlertTriangle, dataTour: 'nav-emergency' },
    { path: ROUTES.HOSPITALS, label: language === 'turkish' ? 'Hastaneler' : 'Hospitals', icon: MapPin, dataTour: 'nav-hospitals' },
  ];

  let links;
  if (user && isAdmin) {
    links = [];
  } else {
    links = [...userLinks];
    if (user) {
      links.push({ path: ROUTES.DASHBOARD, label: language === 'turkish' ? 'Panel' : 'Dashboard', icon: LayoutDashboard, dataTour: 'nav-dashboard' });
    }
  }

  const { start: startTour, restart: restartTour, completed: tourCompleted } = useTour();

  const languages = [
    { value: 'english', label: 'EN' },
    { value: 'turkish', label: 'TR' },
  ];

  const handleNav = (path) => { navigate(path); setMobileOpen(false); };

  const isAuthPage = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD, ROUTES.RESET_PASSWORD].includes(location.pathname);

  return (
    <header className={`fixed top-0 left-0 right-0 z-[10000] transition-all duration-500
      ${scrolled ? 'bg-[#060611]/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-2xl shadow-black/30' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Row 1: Logo (left) + right controls */}
        <div className="flex items-center justify-between h-16 shrink-0">
          {/* Logo — admin goes to /admin, user goes to / */}
          <button onClick={() => navigate(isAdmin ? ROUTES.ADMIN : ROUTES.HOME)} className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center
                            shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300
                            group-hover:scale-110">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block whitespace-nowrap overflow-visible">
              <span className="text-lg font-extrabold tracking-tight gradient-text">Bonus Life</span>
              <span className="text-lg font-extrabold tracking-tight text-white ml-1">AI</span>
            </div>
          </button>

          {/* Right side: bell, user, language, mobile toggle (minimal on auth pages) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Auth: Login/Register or User menu — hidden on login/register etc. */}
            {!authLoading && !isAuthPage && (
              <>
                {!user ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleNav(ROUTES.LOGIN)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition">
                      <LogIn className="w-4 h-4" /> {language === 'turkish' ? 'Giriş' : 'Login'}
                    </button>
                    {allowSignups && (
                      <button onClick={() => handleNav(ROUTES.REGISTER)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition">
                        <UserPlus className="w-4 h-4" /> {language === 'turkish' ? 'Kayıt' : 'Register'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Notification Bell */}
                    {!isAdmin && (
                      <div className="relative" ref={notifRef}>
                        <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] transition">
                          <Bell className="w-4 h-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                          )}
                        </button>
                        {notifOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#12121f] border border-white/[0.08] shadow-2xl shadow-black/40 z-50 overflow-hidden">
                              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">{language === 'turkish' ? 'Bildirimler' : 'Notifications'}</span>
                                {unreadCount > 0 && (
                                  <button onClick={handleMarkAllRead} className="text-[10px] text-emerald-400 hover:text-emerald-300">
                                    {language === 'turkish' ? 'Tümünü oku' : 'Mark all read'}
                                  </button>
                                )}
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                  <div className="px-4 py-6 text-center">
                                    <Bell className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">{language === 'turkish' ? 'Bildirim yok' : 'No notifications'}</p>
                                  </div>
                                ) : (
                                  notifications.slice(0, 10).map(n => (
                                    <button key={n.id} type="button" onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
                                      className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition ${!n.is_read ? 'bg-emerald-500/[0.03]' : ''}`}>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className={`text-sm font-medium ${!n.is_read ? 'text-white' : 'text-gray-400'}`}>{n.title}</p>
                                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                          <p className="text-[10px] text-gray-600 mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                                        </div>
                                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  <div className="relative">
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition">
                      {/* User Avatar */}
                      {user.avatar_url ? (
                        <img key={user.avatar_url} src={getAvatarUrl(user.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-medium text-emerald-400">
                          {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="max-w-[100px] truncate hidden sm:block">{user.full_name || user.email}</span>
                      <ChevronDown className={`w-4 h-4 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#12121f] border border-white/[0.08] shadow-2xl shadow-black/40 py-1 z-50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                            {/* Avatar in dropdown */}
                            {user.avatar_url ? (
                              <img key={user.avatar_url} src={getAvatarUrl(user.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center text-sm font-medium text-emerald-400">
                                {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              {isAdmin && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400">Admin</span>
                              )}
                            </div>
                          </div>
                          {isAdmin ? (
                            <button onClick={() => { handleNav(ROUTES.ADMIN); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                              <Shield className="w-4 h-4" /> {language === 'turkish' ? 'Yönetim Paneli' : 'Admin Panel'}
                            </button>
                          ) : (
                            <button onClick={() => { handleNav(ROUTES.DASHBOARD); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                              <LayoutDashboard className="w-4 h-4" /> {language === 'turkish' ? 'Panel' : 'Dashboard'}
                            </button>
                          )}
                          <div className="border-t border-white/[0.06] my-1"></div>
                          {!isAdmin && (
                            <button type="button" onClick={() => { (tourCompleted ? restartTour : startTour)(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                              <Compass className="w-4 h-4" /> {tourCompleted ? (language === 'turkish' ? 'Turu Tekrarla' : 'Restart Tour') : (language === 'turkish' ? 'Turu Başlat' : 'Start Tour')}
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" onClick={() => { setUxModalOpen(true); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
                              <Settings className="w-4 h-4" /> {language === 'turkish' ? 'UX Ayarları' : 'UX Settings'}
                            </button>
                          )}
                          <button type="button" onClick={() => { logout(); setUserMenuOpen(false); handleNav(ROUTES.HOME); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
                            <LogOut className="w-4 h-4" /> {language === 'turkish' ? 'Çıkış' : 'Logout'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                )}
              </>
            )}

            {/* UX Settings (admin only) + Language */}
            {isAdmin && (
              <button type="button" onClick={() => setUxModalOpen(true)} className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all focus:outline-none" aria-label="UX Settings">
                <Settings className="w-5 h-5" />
              </button>
            )}
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

        {/* Row 2: Full-width nav (desktop only) — hidden on auth pages */}
        {!isAuthPage && links.length > 0 && (
          <nav className="hidden lg:flex items-center gap-2 py-3 border-t border-white/[0.05]">
            {links.map(({ path, label, icon: Icon, dataTour }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  data-tour={dataTour}
                  onClick={() => handleNav(path)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap
                    ${active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 shadow-inner shadow-emerald-500/10'
                      : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                  {active && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#060611]/95 backdrop-blur-2xl border-t border-white/[0.04]">
          <nav className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {(isAuthPage ? [{ path: ROUTES.HOME, label: language === 'turkish' ? 'Ana Sayfa' : 'Home', icon: Home, dataTour: 'nav-home' }] : links).map(({ path, label, icon: Icon, dataTour }) => {
              const active = location.pathname === path;
              return (
                <button key={path} data-tour={dataTour} onClick={() => handleNav(path)}
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
                {allowSignups && (
                  <button onClick={() => handleNav(ROUTES.REGISTER)} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/10">
                    <UserPlus className="w-5 h-5" /> {language === 'turkish' ? 'Kayıt' : 'Register'}
                  </button>
                )}
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
