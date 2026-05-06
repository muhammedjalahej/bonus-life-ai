import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

const AVATARS = [
  {
    id: 1,
    label: 'Sunset',
    svg: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <mask id="av1mask" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
          <rect width="36" height="36" rx="72" fill="#FFFFFF" />
        </mask>
        <g mask="url(#av1mask)">
          <rect width="36" height="36" fill="#ff005b" />
          <rect x="0" y="0" width="36" height="36" transform="translate(9 -5) rotate(219 18 18) scale(1)" fill="#ffb238" rx="6" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" stroke="#000000" fill="none" strokeLinecap="round" />
            <rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000000" />
            <rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000000" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Night',
    svg: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <mask id="av2mask" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
          <rect width="36" height="36" rx="72" fill="#FFFFFF" />
        </mask>
        <g mask="url(#av2mask)">
          <rect width="36" height="36" fill="#ff7d10" />
          <rect x="0" y="0" width="36" height="36" transform="translate(5 -1) rotate(55 18 18) scale(1.1)" fill="#0a0310" rx="6" />
          <g transform="translate(7 -6) rotate(-5 18 18)">
            <path d="M15 20c2 1 4 1 6 0" stroke="#FFFFFF" fill="none" strokeLinecap="round" />
            <rect x="14" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF" />
            <rect x="20" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Dusk',
    svg: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <mask id="av3mask" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
          <rect width="36" height="36" rx="72" fill="#FFFFFF" />
        </mask>
        <g mask="url(#av3mask)">
          <rect width="36" height="36" fill="#0a0310" />
          <rect x="0" y="0" width="36" height="36" transform="translate(-3 7) rotate(227 18 18) scale(1.2)" fill="#ff005b" rx="36" />
          <g transform="translate(-3 3.5) rotate(7 18 18)">
            <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFFFFF" />
            <rect x="12" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF" />
            <rect x="22" y="14" width="1.5" height="2" rx="1" fill="#FFFFFF" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    id: 4,
    label: 'Mint',
    svg: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <mask id="av4mask" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
          <rect width="36" height="36" rx="72" fill="#FFFFFF" />
        </mask>
        <g mask="url(#av4mask)">
          <rect width="36" height="36" fill="#d8fcb3" />
          <rect x="0" y="0" width="36" height="36" transform="translate(9 -5) rotate(219 18 18) scale(1)" fill="#89fcb3" rx="6" />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path d="M15 19c2 1 4 1 6 0" stroke="#000000" fill="none" strokeLinecap="round" />
            <rect x="10" y="14" width="1.5" height="2" rx="1" fill="#000000" />
            <rect x="24" y="14" width="1.5" height="2" rx="1" fill="#000000" />
          </g>
        </g>
      </svg>
    ),
  },
];

export function AvatarPicker({ onSelect, saving }) {
  const [selected, setSelected] = useState(null);
  const [rotation, setRotation] = useState(0);
  const previewRef = useRef(null);

  const handlePick = (avatar) => {
    setSelected(avatar);
    setRotation(r => r + 1080);
  };

  const handleApply = () => {
    if (!selected || !previewRef.current) return;
    const svgEl = previewRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgString = svgEl.outerHTML;
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    onSelect(dataUrl);
  };

  return (
    <div className="mt-4">
      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Illustrations</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Preview + options row */}
      <div className="flex items-center gap-5">
        {/* Animated preview */}
        <div className="shrink-0 w-16 h-16 rounded-2xl border-2 border-white/[0.08] bg-white/[0.03] overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                className="w-full h-full"
                animate={{ rotate: rotation }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                ref={previewRef}
              >
                {selected.svg}
              </motion.div>
            ) : (
              <motion.span
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/10 text-xs select-none"
              >
                ?
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden ref div used for outerHTML capture */}
        {selected && (
          <div ref={previewRef} style={{ display: 'none' }}>
            {selected.svg}
          </div>
        )}

        {/* Avatar options */}
        <div className="flex gap-2.5 flex-wrap">
          {AVATARS.map((av) => (
            <motion.button
              key={av.id}
              type="button"
              onClick={() => handlePick(av)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.92 }}
              className="relative w-11 h-11 rounded-full overflow-hidden focus:outline-none"
              style={{
                border: selected?.id === av.id
                  ? '2px solid rgba(255,255,255,0.35)'
                  : '2px solid rgba(255,255,255,0.08)',
              }}
              aria-label={av.label}
              aria-pressed={selected?.id === av.id}
            >
              <div className="w-full h-full">{av.svg}</div>
              {selected?.id === av.id && (
                <motion.div
                  layoutId="av-ring"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Apply button — only shows when one is selected */}
      <AnimatePresence>
        {selected && (
          <motion.button
            type="button"
            onClick={handleApply}
            disabled={saving}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/60 text-sm font-medium hover:bg-white/[0.08] hover:text-white/80 transition disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            Use {selected.label}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
