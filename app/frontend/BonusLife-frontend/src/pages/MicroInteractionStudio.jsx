import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { ROUTES } from '../config/constants';

const STORAGE_KEY = 'bonuslife_studio';

const DEFAULTS = {
  enabled: false,
  duration: 250,
  ease: 'ease-out',
  hoverScale: 0.98,
  cardLift: 2,
};

const EASE_OPTIONS = [
  { value: 'ease', label: 'Ease', css: 'ease' },
  { value: 'ease-out', label: 'Ease out', css: 'ease-out' },
  { value: 'ease-in', label: 'Ease in', css: 'ease-in' },
  { value: 'ease-in-out', label: 'Ease in-out', css: 'ease-in-out' },
  { value: 'linear', label: 'Linear', css: 'linear' },
  { value: 'snap', label: 'Snap', css: 'cubic-bezier(0, 1, 0.5, 1)' },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyToDocument(state) {
  const root = document.documentElement;
  if (state.enabled) {
    root.setAttribute('data-studio', 'on');
    root.style.setProperty('--studio-duration', `${state.duration}ms`);
    const easeOption = EASE_OPTIONS.find((e) => e.value === state.ease);
    root.style.setProperty('--studio-ease', easeOption?.css || 'ease-out');
    root.style.setProperty('--studio-hover-scale', String(state.hoverScale));
    root.style.setProperty('--studio-card-lift', `${state.cardLift}px`);
  } else {
    root.removeAttribute('data-studio');
    root.style.removeProperty('--studio-duration');
    root.style.removeProperty('--studio-ease');
    root.style.removeProperty('--studio-hover-scale');
    root.style.removeProperty('--studio-card-lift');
  }
}

export default function MicroInteractionStudio({ language }) {
  const isTr = language === 'turkish';
  const [state, setState] = useState(load);
  const [easeDropdownOpen, setEaseDropdownOpen] = useState(false);
  const easeDropdownRef = useRef(null);

  useEffect(() => {
    applyToDocument(state);
  }, [state]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (easeDropdownRef.current && !easeDropdownRef.current.contains(e.target)) setEaseDropdownOpen(false);
    }
    if (easeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [easeDropdownOpen]);

  const update = useCallback((key, value) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULTS);
    save(DEFAULTS);
    applyToDocument(DEFAULTS);
  }, []);

  const previewEase = EASE_OPTIONS.find((e) => e.value === state.ease)?.css || 'ease-out';

  return (
    <div className="min-h-[80vh] max-w-2xl mx-auto px-6 py-24">
      <Link
        to={ROUTES.ADMIN}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        {isTr ? 'Yönetici Paneli' : 'Admin'}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isTr ? 'Mikro Etkileşim Stüdyosu' : 'Micro-interaction Studio'}
        </h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        {isTr
          ? 'Animasyonları özelleştirin; değişiklikler site genelinde uygulanır.'
          : 'Customize animations and see them applied site-wide.'}
      </p>

      <div className="space-y-6">
        {/* Enable */}
        <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <span className="text-sm font-medium text-gray-300">
            {isTr ? 'Stüdyo ayarlarını uygula' : 'Apply studio settings site-wide'}
          </span>
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50"
          />
        </label>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {isTr ? 'Geçiş süresi' : 'Transition duration'} ({state.duration}ms)
          </label>
          <input
            type="range"
            min="100"
            max="500"
            step="25"
            value={state.duration}
            onChange={(e) => update('duration', Number(e.target.value))}
            className="w-full h-2 rounded-full bg-white/10 accent-violet-500"
          />
        </div>

        {/* Easing */}
        <div ref={easeDropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {isTr ? 'Eğri' : 'Easing'}
          </label>
          <button
            type="button"
            onClick={() => setEaseDropdownOpen((o) => !o)}
            className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-left"
          >
            <span>{EASE_OPTIONS.find((o) => o.value === state.ease)?.label ?? state.ease}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${easeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {easeDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-xl py-1 max-h-56 overflow-y-auto">
              {EASE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    update('ease', opt.value);
                    setEaseDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${opt.value === state.ease ? 'bg-violet-500/20 text-violet-400' : 'text-gray-200 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover scale (button press) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {isTr ? 'Buton basılı ölçek' : 'Button press scale'} ({state.hoverScale})
          </label>
          <input
            type="range"
            min="0.92"
            max="1"
            step="0.01"
            value={state.hoverScale}
            onChange={(e) => update('hoverScale', Number(e.target.value))}
            className="w-full h-2 rounded-full bg-white/10 accent-violet-500"
          />
        </div>

        {/* Card lift */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {isTr ? 'Kart hover kaldırma (px)' : 'Card hover lift (px)'} ({state.cardLift})
          </label>
          <input
            type="range"
            min="0"
            max="8"
            step="1"
            value={state.cardLift}
            onChange={(e) => update('cardLift', Number(e.target.value))}
            className="w-full h-2 rounded-full bg-white/10 accent-violet-500"
          />
        </div>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          {isTr ? 'Varsayılana sıfırla' : 'Reset to default'}
        </button>
      </div>

      {/* Live preview — always uses current studio vars so preview works even when "Apply" is off */}
      <div
        data-studio-preview
        className="mt-12 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07]"
        style={{
          ['--studio-duration']: `${state.duration}ms`,
          ['--studio-ease']: previewEase,
          ['--studio-hover-scale']: String(state.hoverScale),
          ['--studio-card-lift']: `${state.cardLift}px`,
        }}
      >
        <h2 className="text-sm font-semibold text-gray-400 mb-4">
          {isTr ? 'Önizleme' : 'Live preview'}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="btn-primary">
            Primary button
          </button>
          <button type="button" className="btn-secondary">
            Secondary
          </button>
          <div className="card-hover w-48 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-sm text-gray-400">Hover card</p>
          </div>
        </div>
      </div>
    </div>
  );
}
