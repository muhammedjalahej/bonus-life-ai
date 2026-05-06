import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, getAvatarUrl } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api';
import {
  HeartPulse, Menu, X, ChevronDown, Bell, Check,
  Home, Activity, MessageSquare, Mic, AlertTriangle, MapPin, Globe, LayoutDashboard, Shield, LogIn, UserPlus, LogOut,
  Users, BarChart3, Settings, Compass, Trash2, ExternalLink, Sparkles,
} from 'lucide-react';
import { useUXSettings } from '../context/UXSettingsContext';
import { useTour } from '../tour/TourContext';

const Header = ({ language, setLanguage }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, loading: authLoading, isAdmin, logout, allowSignups } = useAuth();
  const { setUxModalOpen } = useUXSettings();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [langOpen,     setLangOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  /* Scroll detection */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Load notifications */
  useEffect(() => {
    if (!user || isAdmin) return;
    const load = async () => {
      try { const d = await getNotifications(20); setNotifications(Array.isArray(d) ? d : []); } catch {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [user, isAdmin]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id) => {
    try { await markNotificationRead(id); setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n)); } catch {}
  };
  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead(); setNotifications(p => p.map(n => ({ ...n, is_read: true }))); } catch {}
  };
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try { await deleteNotification(id); setNotifications(p => p.filter(n => n.id !== id)); } catch {}
  };

  const userLinks = [
    { path: ROUTES.HOME,             label: language === 'turkish' ? 'Ana Sayfa'       : 'Home',            icon: Home,           dataTour: 'nav-home' },
    { path: ROUTES.TEST,             label: language === 'turkish' ? 'Değerlendirme'   : 'Assessment',       icon: Activity,       dataTour: 'nav-assessment' },
    { path: ROUTES.CHAT,             label: language === 'turkish' ? 'Yapay Zeka'      : 'AI Chat',          icon: MessageSquare,  dataTour: 'nav-chat' },
    { path: ROUTES.VOICE_CHAT,       label: language === 'turkish' ? 'Ses'             : 'Voice',            icon: Mic,            dataTour: 'nav-voice' },
    { path: ROUTES.SYMPTOM_CHECKER,  label: language === 'turkish' ? 'Belirti'         : 'Symptoms',         icon: AlertTriangle,  dataTour: 'nav-symptom-checker' },
    { path: ROUTES.HOSPITALS,        label: language === 'turkish' ? 'Hastaneler'      : 'Hospitals',        icon: MapPin,         dataTour: 'nav-hospitals' },
  ];

  let links = [];
  if (user && isAdmin) {
    links = [];
  } else {
    links = [...userLinks];
    if (user) links.push({ path: ROUTES.DASHBOARD, label: language === 'turkish' ? 'Panel' : 'Dashboard', icon: LayoutDashboard, dataTour: 'nav-dashboard' });
  }

  const { start: startTour, restart: restartTour, completed: tourCompleted } = useTour();
  const languages = [{ value: 'english', label: 'EN' }, { value: 'turkish', label: 'TR' }];
  const handleNav = (path) => { navigate(path); setMobileOpen(false); };
  const isAuthPage = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.FORGOT_PASSWORD, ROUTES.RESET_PASSWORD].includes(location.pathname);

  /* Frosted pill header background */
  const headerStyle = scrolled
    ? { background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }
    : { background: 'transparent' };

  return (
    <header className="fixed top-0 left-0 right-0 z-[10000] transition-all duration-500" style={headerStyle}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">

        {/* ── Top row: logo | nav pill | actions ── */}
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <button
            onClick={() => navigate(isAdmin ? ROUTES.ADMIN : ROUTES.HOME)}
            className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 20px rgba(124,58,237,0.35)' }}>
              <HeartPulse className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-black tracking-tight gradient-text-violet">Bonus Life</span>
              <span className="text-base font-black tracking-tight text-white ml-1">AI</span>
            </div>
          </button>

          {/* Center pill nav — desktop only, hidden on auth pages */}
          {!isAuthPage && links.length > 0 && (
            <nav className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}>
              {links.map(({ path, label, icon: Icon, dataTour }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={path}
                    data-tour={dataTour}
                    onClick={() => handleNav(path)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                      ${active
                        ? 'text-white'
                        : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'}`}
                    style={active ? { background: 'rgba(124,58,237,0.2)', color: '#A78BFA', boxShadow: '0 0 15px rgba(124,58,237,0.2) inset' } : {}}
                  >
                    <Icon style={{ width: '14px', height: '14px' }} />
                    <span>{label}</span>
                    {active && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" style={{ boxShadow: '0 0 6px rgba(139,92,246,0.9)' }} />}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right side: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Auth actions */}
            {!authLoading && !isAuthPage && (
              <>
                {!user ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleNav(ROUTES.LOGIN)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
                      <LogIn style={{ width: '14px', height: '14px' }} />
                      {language === 'turkish' ? 'Giriş' : 'Login'}
                    </button>
                    {allowSignups && (
                      <button onClick={() => handleNav(ROUTES.REGISTER)}
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 18px rgba(124,58,237,0.3)' }}>
                        <Sparkles style={{ width: '14px', height: '14px' }} />
                        {language === 'turkish' ? 'Kayıt' : 'Get Started'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">

                    {/* Notification Bell */}
                    {!isAdmin && (
                      <div className="relative" ref={notifRef}>
                        <button onClick={() => setNotifOpen(!notifOpen)}
                          className="relative p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
                          <Bell style={{ width: '16px', height: '16px' }} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>

                        {notifOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                            <div className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
                              style={{ background: '#080810', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                              <div className="px-4 py-3 flex items-center justify-between"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="text-sm font-bold text-white">{language === 'turkish' ? 'Bildirimler' : 'Notifications'}</span>
                                {unreadCount > 0 && (
                                  <button onClick={handleMarkAllRead} className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                                    {language === 'turkish' ? 'Tümünü oku' : 'Mark all read'}
                                  </button>
                                )}
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                  <div className="px-4 py-8 text-center">
                                    <Bell className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                                    <p className="text-xs text-gray-600">{language === 'turkish' ? 'Bildirim yok' : 'No notifications'}</p>
                                  </div>
                                ) : (
                                  notifications.slice(0, 10).map(n => (
                                    <div key={n.id}
                                      className={`px-4 py-3 transition-colors ${!n.is_read ? 'bg-violet-500/[0.04]' : ''}`}
                                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                      <div className="flex items-start justify-between gap-2">
                                        <button type="button" onClick={() => { if (!n.is_read) handleMarkRead(n.id); }} className="min-w-0 flex-1 text-left">
                                          <p className={`text-sm font-semibold ${!n.is_read ? 'text-white' : 'text-gray-400'}`}>{n.title}</p>
                                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                                          <p className="text-[10px] text-gray-700 mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                                        </button>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-violet-400 mt-1" />}
                                          <button type="button" onClick={(e) => handleDeleteNotification(e, n.id)}
                                            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title={language === 'turkish' ? 'Sil' : 'Delete'}>
                                            <Trash2 style={{ width: '14px', height: '14px' }} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* User menu */}
                    <div className="relative">
                      <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-all duration-200"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {user.avatar_url ? (
                          <img key={user.avatar_url} src={getAvatarUrl(user.avatar_url)} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.3))', color: '#A78BFA' }}>
                            {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="max-w-[90px] truncate hidden sm:block">{user.full_name || user.email}</span>
                        <ChevronDown style={{ width: '13px', height: '13px', transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} />
                      </button>

                      {userMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                          <div className="absolute right-0 mt-2 w-56 rounded-2xl py-1.5 z-50 overflow-hidden"
                            style={{ background: '#080810', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

                            {/* User info */}
                            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              {user.avatar_url ? (
                                <img key={user.avatar_url} src={getAvatarUrl(user.avatar_url)} alt="" className="w-9 h-9 rounded-full object-cover" />
                              ) : (
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))', color: '#A78BFA' }}>
                                  {(user.full_name || user.email || '?').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white truncate">{user.full_name || user.email}</p>
                                <p className="text-xs text-gray-600 truncate">{user.email}</p>
                                {isAdmin && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Admin</span>}
                              </div>
                            </div>

                            {/* Menu items */}
                            <div className="py-1">
                              {isAdmin ? (
                                <MenuBtn onClick={() => { handleNav(ROUTES.ADMIN); setUserMenuOpen(false); }} icon={Shield}>
                                  {language === 'turkish' ? 'Yönetim Paneli' : 'Admin Panel'}
                                </MenuBtn>
                              ) : (
                                <MenuBtn onClick={() => { handleNav(ROUTES.DASHBOARD); setUserMenuOpen(false); }} icon={LayoutDashboard}>
                                  {language === 'turkish' ? 'Panel' : 'Dashboard'}
                                </MenuBtn>
                              )}
                              <div className="my-1 mx-3" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                              {!isAdmin && (
                                <MenuBtn onClick={() => { (tourCompleted ? restartTour : startTour)(); setUserMenuOpen(false); }} icon={Compass}>
                                  {tourCompleted ? (language === 'turkish' ? 'Turu Tekrarla' : 'Restart Tour') : (language === 'turkish' ? 'Turu Başlat' : 'Start Tour')}
                                </MenuBtn>
                              )}
                              {isAdmin && (
                                <MenuBtn onClick={() => { setUxModalOpen(true); setUserMenuOpen(false); }} icon={Settings}>
                                  {language === 'turkish' ? 'UX Ayarları' : 'UX Settings'}
                                </MenuBtn>
                              )}
                              {!isAdmin && (
                                <MenuBtn onClick={() => { handleNav(ROUTES.PRICING); setUserMenuOpen(false); }} icon={ExternalLink}>
                                  {language === 'turkish' ? 'Fiyatlandırma' : 'Pricing'}
                                </MenuBtn>
                              )}
                              <div className="my-1 mx-3" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                              <button type="button"
                                onClick={() => { logout(); setUserMenuOpen(false); handleNav(ROUTES.HOME); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                                <LogOut style={{ width: '14px', height: '14px' }} />
                                {language === 'turkish' ? 'Çıkış' : 'Logout'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Admin UX Settings */}
            {isAdmin && (
              <button type="button" onClick={() => setUxModalOpen(true)}
                className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
                <Settings style={{ width: '16px', height: '16px' }} />
              </button>
            )}

            {/* Language switcher */}
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-white transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Globe style={{ width: '13px', height: '13px' }} />
                {languages.find(l => l.value === language)?.label}
                <ChevronDown style={{ width: '11px', height: '11px' }} />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-28 rounded-xl py-1 z-50 overflow-hidden"
                    style={{ background: '#080810', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                    {languages.map(lang => (
                      <button key={lang.value} onClick={() => { setLanguage(lang.value); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-all
                          ${language === lang.value ? '' : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'}`}
                        style={language === lang.value ? { background: 'rgba(124,58,237,0.15)', color: '#A78BFA' } : {}}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
              {mobileOpen ? <X style={{ width: '18px', height: '18px' }} /> : <Menu style={{ width: '18px', height: '18px' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Nav ── */}
      {mobileOpen && (
        <div className="lg:hidden" style={{ background: 'rgba(5,5,8,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <nav className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {(isAuthPage ? [{ path: ROUTES.HOME, label: language === 'turkish' ? 'Ana Sayfa' : 'Home', icon: Home, dataTour: 'nav-home' }] : links).map(({ path, label, icon: Icon, dataTour }) => {
              const active = location.pathname === path;
              return (
                <button key={path} data-tour={dataTour} onClick={() => handleNav(path)}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-all
                    ${active ? 'text-violet-300' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
                  style={active ? { background: 'rgba(124,58,237,0.12)' } : {}}>
                  <Icon style={{ width: '16px', height: '16px' }} />
                  {label}
                </button>
              );
            })}
            {!authLoading && !user && (
              <>
                <button onClick={() => handleNav(ROUTES.LOGIN)}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all">
                  <LogIn style={{ width: '16px', height: '16px' }} />
                  {language === 'turkish' ? 'Giriş' : 'Login'}
                </button>
                {allowSignups && (
                  <button onClick={() => handleNav(ROUTES.REGISTER)}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    {language === 'turkish' ? 'Kayıt Ol' : 'Get Started Free'}
                  </button>
                )}
              </>
            )}
            {!authLoading && user && (
              <button onClick={() => { logout(); handleNav(ROUTES.HOME); setMobileOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all">
                <LogOut style={{ width: '16px', height: '16px' }} />
                {language === 'turkish' ? 'Çıkış' : 'Logout'}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

/* Small helper */
const MenuBtn = ({ onClick, icon: Icon, children }) => (
  <button type="button" onClick={onClick}
    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
    <Icon style={{ width: '14px', height: '14px' }} />
    {children}
  </button>
);

export default Header;
