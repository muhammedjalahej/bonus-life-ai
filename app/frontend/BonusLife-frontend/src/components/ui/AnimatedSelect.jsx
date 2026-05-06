import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * AnimatedSelect — drop-in replacement for <select> with framer-motion animated dropdown.
 * Props:
 *   value: string          — currently selected value
 *   onChange: fn           — called as onChange({ target: { value } })
 *   options: Array<{ value: string, label: string }>
 *   className?: string
 */
export function AnimatedSelect({ value, onChange, options = [], placeholder = null, disabled = false, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (optValue) => {
    setIsOpen(false);
    onChange({ target: { value: String(optValue) } });
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        className="w-full flex items-center justify-between rounded-xl bg-white/[0.06] backdrop-blur-sm px-4 py-3.5 text-sm text-white cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 hover:bg-white/[0.09] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className={selected ? 'text-white' : 'text-gray-500'}>
          {selected ? selected.label : (placeholder ?? '—')}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 ml-2"
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 z-[9999] mt-1.5 overflow-hidden rounded-xl shadow-2xl shadow-black/60"
            style={{
              background: 'rgba(10,10,20,0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
            >
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 border-b border-white/[0.05] last:border-b-0
                      ${isSelected
                        ? 'bg-violet-500/15 text-violet-300 font-medium'
                        : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'
                      }`}
                  >
                    {opt.label}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
