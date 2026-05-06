import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function NumberField({
  label, value, onChange, required, hint, placeholder,
  icon: Icon, error, step = 1, min, max,
  accentColor = 'violet',
}) {
  const [flash, setFlash] = useState(null);

  const numVal = value === '' || value == null ? 0 : parseFloat(value) || 0;

  const fireChange = (newVal) => {
    if (min !== undefined && newVal < min) newVal = min;
    if (max !== undefined && newVal > max) newVal = max;
    onChange({ target: { value: String(newVal) } });
  };

  const increment = () => {
    fireChange(parseFloat((numVal + step).toFixed(4)));
    setFlash('up');
    setTimeout(() => setFlash(null), 600);
  };

  const decrement = () => {
    fireChange(parseFloat((numVal - step).toFixed(4)));
    setFlash('down');
    setTimeout(() => setFlash(null), 600);
  };

  const accentMap = {
    violet: { req: 'text-violet-400', ring: 'rgba(124,58,237,0.35)' },
    cyan:   { req: 'text-cyan-400',   ring: 'rgba(6,182,212,0.35)'  },
    pink:   { req: 'text-pink-400',   ring: 'rgba(236,72,153,0.35)' },
  };
  const ac = accentMap[accentColor] || accentMap.violet;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300">
        {label}
      </label>

      <div className="flex items-stretch gap-0 rounded-xl overflow-hidden"
        style={{
          border: error ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {/* Input area */}
        <div className="relative flex-1">
          {Icon && (
            <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none z-10" />
          )}
          <input
            type="text"
            inputMode="numeric"
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full h-full bg-transparent text-sm text-white placeholder-white/20 focus:outline-none px-4 py-3"
            style={{
              paddingLeft: Icon ? '2.5rem' : '1rem',
              WebkitAppearance: 'none',
              MozAppearance: 'textfield',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Stepper */}
        <div className="flex flex-col shrink-0" style={{ width: 40 }}>
          {/* Up */}
          <button
            type="button"
            onClick={increment}
            className="flex-1 flex items-center justify-center transition-all duration-200 group"
            style={{
              background: flash === 'up' ? 'rgba(34,197,94,0.12)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
            onMouseEnter={e => { if (flash !== 'up') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { if (flash !== 'up') e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronUp
              className="w-3.5 h-3.5 transition-colors duration-200"
              style={{ color: flash === 'up' ? '#4ade80' : 'rgba(255,255,255,0.25)' }}
            />
          </button>

          {/* NumberFlow value display */}
          <div
            className="flex items-center justify-center select-none"
            style={{
              padding: '2px 0',
              background: 'rgba(255,255,255,0.02)',
              borderTop: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <NumberFlow
              value={numVal}
              format={{ notation: 'compact', maximumFractionDigits: 1 }}
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                color: flash === 'up'
                  ? '#4ade80'
                  : flash === 'down'
                  ? '#f87171'
                  : 'rgba(255,255,255,0.22)',
                transition: 'color 0.3s',
                letterSpacing: '-0.02em',
              }}
            />
          </div>

          {/* Down */}
          <button
            type="button"
            onClick={decrement}
            className="flex-1 flex items-center justify-center transition-all duration-200"
            style={{
              background: flash === 'down' ? 'rgba(239,68,68,0.12)' : 'transparent',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
            onMouseEnter={e => { if (flash !== 'down') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { if (flash !== 'down') e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronDown
              className="w-3.5 h-3.5 transition-colors duration-200"
              style={{ color: flash === 'down' ? '#f87171' : 'rgba(255,255,255,0.25)' }}
            />
          </button>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
      {hint && !error && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
