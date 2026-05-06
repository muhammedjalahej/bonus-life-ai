import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { motion, useSpring } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, Star, Loader2 } from 'lucide-react';
import NumberFlow from '@number-flow/react';

// ─── Context ───────────────────────────────────────────────────────────────
const PricingCtx = createContext({ isMonthly: true, setIsMonthly: () => {} });

// ─── Interactive Starfield ──────────────────────────────────────────────────
function StarDot({ mousePosition, containerRef }) {
  const [pos] = useState({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
  });
  const cfg = { stiffness: 100, damping: 15, mass: 0.1 };
  const sx = useSpring(0, cfg);
  const sy = useSpring(0, cfg);

  useEffect(() => {
    if (!containerRef.current || mousePosition.x === null) {
      sx.set(0); sy.set(0); return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const starX = rect.left + (parseFloat(pos.left) / 100) * rect.width;
    const starY = rect.top  + (parseFloat(pos.top)  / 100) * rect.height;
    const dx = mousePosition.x - starX;
    const dy = mousePosition.y - starY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 600) {
      const f = 1 - dist / 600;
      sx.set(dx * f * 0.5);
      sy.set(dy * f * 0.5);
    } else {
      sx.set(0); sy.set(0);
    }
  }, [mousePosition, pos, containerRef, sx, sy]);

  return (
    <motion.div
      className="absolute rounded-full bg-white"
      style={{
        top: pos.top, left: pos.left,
        width:  `${1 + Math.random() * 2}px`,
        height: `${1 + Math.random() * 2}px`,
        x: sx, y: sy,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
    />
  );
}

function Starfield({ mousePosition, containerRef }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 150 }).map((_, i) => (
        <StarDot key={i} mousePosition={mousePosition} containerRef={containerRef} />
      ))}
    </div>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────────────────
function PricingToggle({ isTr }) {
  const { isMonthly, setIsMonthly } = useContext(PricingCtx);
  const monthlyRef = useRef(null);
  const annualRef  = useRef(null);
  const [pill, setPill] = useState({});

  useEffect(() => {
    const btn = isMonthly ? monthlyRef : annualRef;
    if (btn.current) {
      setPill({ width: btn.current.offsetWidth, transform: `translateX(${btn.current.offsetLeft}px)` });
    }
  }, [isMonthly]);

  const toggle = (monthly) => {
    if (isMonthly === monthly) return;
    setIsMonthly(monthly);
    if (!monthly && annualRef.current) {
      const r = annualRef.current.getBoundingClientRect();
      confetti({
        particleCount: 80, spread: 80,
        origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
        colors: ['#7C3AED', '#A78BFA', '#C4B5FD'],
        ticks: 300, gravity: 1.2, decay: 0.94, startVelocity: 30,
      });
    }
  };

  return (
    <div className="flex justify-center">
      <div className="relative flex w-fit items-center rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-violet-600"
          style={pill}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
        <button ref={monthlyRef} type="button" onClick={() => toggle(true)}
          className={`relative z-10 rounded-full px-5 sm:px-6 py-2 text-sm font-semibold transition-colors ${isMonthly ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
          {isTr ? 'Aylık' : 'Monthly'}
        </button>
        <button ref={annualRef} type="button" onClick={() => toggle(false)}
          className={`relative z-10 rounded-full px-5 sm:px-6 py-2 text-sm font-semibold transition-colors ${!isMonthly ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
          {isTr ? 'Yıllık' : 'Annual'}
          <span className={`hidden sm:inline ml-1 text-xs ${!isMonthly ? 'text-violet-200' : 'text-emerald-400'}`}>
            ({isTr ? '%20 tasarruf' : 'Save 20%'})
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
function PricingCard({ plan, index, isDesktop }) {
  const { isMonthly } = useContext(PricingCtx);

  const displayPrice    = isMonthly ? plan.price    : plan.yearlyPrice;
  const displayPriceTr  = isMonthly ? plan.priceTr  : plan.priceTrYear;
  const periodLabel     = isMonthly ? plan.period   : plan.yearlyPeriod;
  const periodLabelTr   = isMonthly ? plan.periodTr : plan.yearlyPeriodTr;
  const isFree          = plan.price === 0;

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: plan.isPopular && isDesktop ? -20 : 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 20, delay: index * 0.15 }}
      className="relative flex flex-col h-full"
      style={{ paddingTop: plan.isPopular ? '1.5rem' : 0 }}
    >
      {/* Most Popular badge — outside the card so it's never clipped */}
      {plan.isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-600 shadow-lg shadow-violet-500/40 whitespace-nowrap">
            <Star className="w-3.5 h-3.5 text-white fill-white shrink-0" />
            <span className="text-white text-xs font-bold">{plan.isTr ? 'En Popüler' : 'Most Popular'}</span>
          </div>
        </div>
      )}

    <div
      className="relative flex flex-col flex-1 rounded-2xl p-8"
      style={plan.isPopular ? {
        background: 'rgba(124,58,237,0.08)',
        border: '2px solid rgba(124,58,237,0.5)',
        boxShadow: '0 0 60px rgba(124,58,237,0.18)',
        backdropFilter: 'blur(12px)',
      } : {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top gradient line for popular */}
      {plan.isPopular && (
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.7), rgba(167,139,250,0.5), transparent)' }} />
      )}

      {/* Name & description */}
      <h3 className="text-xl font-bold text-white mt-2">{plan.name}</h3>
      <p className="mt-1.5 text-sm text-gray-400">{plan.description}</p>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1">
        {plan.isTr ? (
          <>
            <span className="text-5xl font-black text-white">₺{displayPriceTr ?? displayPrice}</span>
            <span className="text-sm text-gray-500 ml-1">/ {periodLabelTr ?? periodLabel}</span>
          </>
        ) : (
          <>
            <span className="text-5xl font-black text-white">
              {isFree ? (
                <span>$0</span>
              ) : (
                <NumberFlow
                  value={displayPrice}
                  format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 0 }}
                />
              )}
            </span>
            <span className="text-sm text-gray-500 ml-1">/ {periodLabel}</span>
          </>
        )}
      </div>
      <p className="text-xs text-gray-600 mt-1">
        {isMonthly ? (plan.isTr ? 'Aylık faturalandırılır' : 'Billed monthly') : (plan.isTr ? 'Yıllık faturalandırılır' : 'Billed annually')}
      </p>

      {/* Features */}
      <ul className="mt-8 space-y-3 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-gray-400">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: plan.isPopular ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.12)' }}>
              <Check className="w-3 h-3" style={{ color: plan.isPopular ? '#A78BFA' : '#10B981' }} />
            </div>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8">
        <button
          type="button"
          onClick={plan.onClick}
          disabled={plan.loading}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
          style={plan.isPopular ? {
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          } : {
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {plan.loading
            ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            : plan.buttonText}
        </button>
      </div>

      {isFree && (
        <p className="text-center text-gray-600 text-xs mt-3">
          {plan.isTr ? 'Tüm özellikler ücretsiz.' : 'All features free, no limits.'}
        </p>
      )}
    </div>
    </motion.div>
  );
}

// ─── PricingSection (exported) ───────────────────────────────────────────────
export function PricingSection({ plans, title, description, isTr }) {
  const [isMonthly, setIsMonthly] = useState(true);
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: null, y: null });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // inject isTr into each plan so cards can read it
  const enrichedPlans = plans.map((p) => ({ ...p, isTr }));

  return (
    <PricingCtx.Provider value={{ isMonthly, setIsMonthly }}>
      <div
        ref={containerRef}
        onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMouse({ x: null, y: null })}
        className="relative w-full min-h-screen py-20 sm:py-24"
        style={{ background: '#000000' }}
      >
        <Starfield mousePosition={mouse} containerRef={containerRef} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4"
            >
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-gray-400 text-lg"
            >
              {description}
            </motion.p>
          </div>

          <PricingToggle isTr={isTr} />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 items-stretch gap-8">
            {enrichedPlans.map((plan, i) => (
              <PricingCard key={plan.id} plan={plan} index={i} isDesktop={isDesktop} />
            ))}
          </div>
        </div>
      </div>
    </PricingCtx.Provider>
  );
}
