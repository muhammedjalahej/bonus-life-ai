import React, { useRef, useEffect } from 'react';
import { Activity, Shield, Zap, TrendingUp } from 'lucide-react';
// import { HorizonHero } from '../components/ui/HorizonHero'; // REVERT: uncomment this + comment WebGLHero
import { WebGLHero } from '../components/ui/WebGLHero';

/* ─────────────── Scroll Reveal Hook ─────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─────────────── DATA ─────────────── */
const STEPS = [
  { n: '01', title: 'Create Your Health Profile', desc: 'Sign up in 30 seconds. Your data stays encrypted, private, and fully under your control.', Icon: Shield,    color: '#7C3AED' },
  { n: '02', title: 'Run AI Assessments',          desc: 'Take clinical-grade risk assessments for diabetes, heart disease, kidney health, and more.', Icon: Activity,  color: '#06B6D4' },
  { n: '03', title: 'Get Actionable Insights',     desc: 'Receive detailed risk reports and personalized recommendations from your AI health coach.',   Icon: TrendingUp, color: '#10B981' },
];

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─────────────── HOME PAGE ─────────────── */
export default function Home({ language, setLanguage }) {
  const stepsRef = useReveal();

  return (
    <div className="bg-[#050508] text-white" style={{ fontFamily: "'Figtree','Inter',sans-serif" }}>

      {/* ══ HERO — WebGL Rainbow Wave ══ */}
      {/* REVERT: replace with <HorizonHero language={language} setLanguage={setLanguage} /> */}
      <WebGLHero language={language} />



    </div>
  );
}
