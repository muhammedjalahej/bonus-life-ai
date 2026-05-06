import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X, Home, MapPin, LayoutDashboard, Shield,
  LogIn, LogOut, Sparkles, ArrowRight, ChevronDown,
} from 'lucide-react';
import { ROUTES, getAvatarUrl } from '../config/constants';
import { useAuth } from '../context/AuthContext';

const LANGS = [
  { value: 'english', label: 'English', code: 'US' },
  { value: 'turkish', label: 'Türkçe',  code: 'TR' },
];

const NAV_ITEMS_PUBLIC = (isTr) => [
  { label: isTr ? 'Ana Sayfa'       : 'Home',           Icon: Home,            route: ROUTES.HOME },
  { label: isTr ? 'Hastane Bul'     : 'Find Hospitals', Icon: MapPin,          route: ROUTES.HOSPITALS },
  { label: isTr ? 'Fiyatlandırma'   : 'Pricing',        Icon: Shield,          route: ROUTES.PRICING },
];

const NAV_ITEMS_USER = (isTr) => [
  { label: isTr ? 'Ana Sayfa'       : 'Home',           Icon: Home,            route: ROUTES.HOME },
  { label: isTr ? 'Hastane Bul'     : 'Find Hospitals', Icon: MapPin,          route: ROUTES.HOSPITALS },
  { label: isTr ? 'Kontrol Paneli'  : 'Dashboard',      Icon: LayoutDashboard, route: ROUTES.DASHBOARD },
  { label: isTr ? 'Fiyatlandırma'   : 'Pricing',        Icon: Shield,          route: ROUTES.PRICING },
];

export default function SideNav({ language, setLanguage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout, allowSignups } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const go = (route) => { navigate(route); setOpen(false); };
  const isTr = language === 'turkish';

  // Inline language section — collapsed shows trigger, expanded replaces trigger with both options
  const LangSection = () => {
    const current = LANGS.find(l => l.value === language) || LANGS[0];
    const CodeBadge = ({ code }) => (
      <span style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.06em', flexShrink:0, width:18, textAlign:'center' }}>
        {code}
      </span>
    );
    const ActiveDot = () => (
      <span style={{ width:5, height:5, borderRadius:'50%', background:'linear-gradient(135deg,#f87171,#facc15,#4ade80,#60a5fa,#e879f9)', flexShrink:0 }} />
    );
    return (
      <div ref={langRef}>
        {!langOpen ? (
          <button
            type="button"
            onClick={() => setLangOpen(true)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.58rem 0.75rem', background:'none', border:'none', cursor:'pointer' }}
          >
            <CodeBadge code={current.code} />
            <span style={{ fontSize:'0.81rem', fontWeight:600, color:'rgba(255,255,255,0.5)', flex:1, textAlign:'left' }}>{current.label}</span>
            <ChevronDown style={{ width:11, height:11, color:'rgba(255,255,255,0.25)', flexShrink:0 }} />
          </button>
        ) : (
          LANGS.map((l, i) => {
            const active = language === l.value;
            return (
              <React.Fragment key={l.value}>
                {i > 0 && <div style={{ height:1, background:'rgba(255,255,255,0.05)' }} />}
                <button
                  type="button"
                  onClick={() => { setLanguage(l.value); setLangOpen(false); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.58rem 0.75rem', background: active ? 'rgba(255,255,255,0.07)' : 'none', border:'none', cursor:'pointer', transition:'background 0.15s' }}
                >
                  <CodeBadge code={l.code} />
                  <span style={{ fontSize:'0.81rem', fontWeight:600, color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)', flex:1, textAlign:'left' }}>{l.label}</span>
                  {active && <ActiveDot />}
                </button>
              </React.Fragment>
            );
          })
        )}
      </div>
    );
  };

  const S = {
    ham: { position:'fixed', left:'1.4rem', top:'50%', transform:'translateY(-50%)', zIndex:1000, cursor:'pointer', padding:'0.65rem', borderRadius:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', gap:'5px', transition:'all 0.2s', backdropFilter:'blur(10px)' },
    line: { width:'20px', height:'1.5px', background:'rgba(255,255,255,0.7)', borderRadius:'999px' },
    bg: { position:'fixed', inset:0, zIndex:1001, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' },
    panel: (open) => ({ position:'fixed', left:0, top:0, height:'100vh', width:'min(300px,82vw)', zIndex:1002, background:'linear-gradient(160deg, rgba(38,38,38,0.72) 0%, rgba(8,8,8,0.88) 45%, rgba(28,28,28,0.75) 100%)', backdropFilter:'blur(48px) saturate(180%) brightness(1.05)', WebkitBackdropFilter:'blur(48px) saturate(180%) brightness(1.05)', borderRight:'1px solid rgba(255,255,255,0.12)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(255,255,255,0.04), 6px 0 40px rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', transform: open ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.35s cubic-bezier(0.23,1,0.32,1)', fontFamily:"'Figtree','Inter',sans-serif", overflow:'hidden' }),
    closeBtn: { padding:'0.4rem', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', color:'rgba(255,255,255,0.6)', display:'flex' },
  };

  return (
    <>
      {/* Hamburger button */}
      <button style={S.ham} onClick={() => setOpen(true)} aria-label={isTr ? 'Menüyü aç' : 'Open menu'}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}>
        <div style={S.line} />
        <div style={S.line} />
        <div style={S.line} />
      </button>

      {/* Backdrop */}
      {open && <div style={S.bg} onClick={() => setOpen(false)} />}

      {/* Panel */}
      <nav style={S.panel(open)}>
        {/* Liquid metal shimmer layers */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'35%', background:'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)', borderRadius:'inherit' }} />
          <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60%', height:'60%', background:'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)', transform:'rotate(-20deg)' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'25%', background:'linear-gradient(0deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />
          <div style={{ position:'absolute', top:0, right:0, width:1, height:'100%', background:'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.08) 70%, transparent 100%)' }} />
        </div>

        {/* Close button row */}
        <div style={{ position:'relative', zIndex:1, padding:'1rem 1.2rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'flex-end' }}>
          <button style={S.closeBtn} onClick={() => setOpen(false)}>
            <X style={{ width:15, height:15 }} />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ position:'relative', zIndex:1, flex:1, overflowY:'auto', padding:'0.8rem 0' }}>
          {(user && !isAdmin ? NAV_ITEMS_USER(isTr) : NAV_ITEMS_PUBLIC(isTr)).map(({ label, Icon, route }) => {
            const isActive = location.pathname === route;
            return (
              <motion.div
                key={route}
                initial="initial"
                whileHover="hover"
                onClick={() => go(route)}
                style={{ display:'flex', alignItems:'center', padding:'0.7rem 1.1rem', cursor:'pointer', overflow:'hidden', gap:'0.5rem' }}
              >
                <motion.div
                  variants={{ initial: { x: '-120%', opacity: 0 }, hover: { x: 0, opacity: 1 } }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ flexShrink: 0, color: '#ffffff' }}
                >
                  <ArrowRight strokeWidth={2.5} style={{ width: 16, height: 16 }} />
                </motion.div>
                <motion.div
                  variants={{ initial: { x: -20 }, hover: { x: 4 } }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}
                >
                  <motion.span
                    variants={{ initial: { color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)' }, hover: { color: '#ffffff' } }}
                    style={{ fontSize:'0.9rem', fontWeight: isActive ? 600 : 500 }}
                  >
                    {label}
                  </motion.span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="nav-active-dot"
                    style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'linear-gradient(135deg,#f87171,#facc15,#4ade80,#60a5fa,#e879f9)', flexShrink:0 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom — unified card */}
        <div style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(255,255,255,0.08)', padding:'0.75rem', background:'rgba(255,255,255,0.01)' }}>

          {user ? (
            <div style={{ borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', overflow:'hidden' }}>
              {/* User row */}
              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.65rem 0.75rem' }}>
                {user.avatar_url
                  ? <img src={getAvatarUrl(user.avatar_url)} alt="" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                  : <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,rgba(248,113,113,0.4),rgba(96,165,250,0.4),rgba(232,121,249,0.4))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {(user.full_name || user.email || '?').slice(0,2).toUpperCase()}
                    </div>
                }
                <div style={{ minWidth:0, flex:1 }}>
                  <p style={{ margin:0, fontSize:'0.8rem', fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.full_name || user.email}</p>
                  <p style={{ margin:0, fontSize:'0.68rem', color:'rgba(255,255,255,0.28)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
                </div>
              </div>

              <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />

              {/* Language */}
              {setLanguage && <LangSection />}

              <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />

              {/* Sign out */}
              <button onClick={() => { logout(); navigate(ROUTES.HOME); setOpen(false); }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.6rem 0.75rem', background:'none', border:'none', cursor:'pointer', color:'rgba(248,113,113,0.7)', fontSize:'0.83rem', fontWeight:600, transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}
              >
                <LogOut style={{ width:13, height:13 }} />
                {language === 'turkish' ? 'Çıkış Yap' : 'Sign out'}
              </button>
            </div>

          ) : (
            <div style={{ borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)', overflow:'hidden' }}>
              <button onClick={() => go(ROUTES.LOGIN)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.65rem 0.75rem', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:'0.83rem', fontWeight:600 }}>
                <LogIn style={{ width:13, height:13 }} />
                {isTr ? 'Giriş Yap' : 'Login'}
              </button>
              {allowSignups && (
                <>
                  <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />
                  <button onClick={() => go(ROUTES.REGISTER)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.65rem 0.75rem', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.6)', fontSize:'0.83rem', fontWeight:700 }}>
                    <Sparkles style={{ width:13, height:13 }} />
                    {isTr ? 'Ücretsiz Başla' : 'Get Started Free'}
                  </button>
                </>
              )}
              {setLanguage && (
                <>
                  <div style={{ height:1, background:'rgba(255,255,255,0.06)' }} />
                  <LangSection />
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
