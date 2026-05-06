import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ellipsis, Loader2 } from 'lucide-react';

/**
 * AnimatedActionMenu — framer-motion dropdown for item actions.
 * Props:
 *   items: Array<{ label, icon: ReactNode, onClick, destructive?: bool, disabled?: bool }>
 *   loading?: bool  — shows spinner on trigger instead of ellipsis
 *   align?: 'left' | 'right'  (default 'right')
 */
export function AnimatedActionMenu({ items = [], loading = false, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (item) => {
    if (item.disabled) return;
    setIsOpen(false);
    item.onClick?.();
  };

  const separatorIdxs = items.reduce((acc, item, i) => { if (item.separator) acc.push(i); return acc; }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen((v) => !v)}
        className="p-1.5 rounded-lg bg-transparent hover:bg-white/[0.08] text-gray-500 hover:text-white transition-colors focus:outline-none"
        aria-label="Options"
        aria-expanded={isOpen}
        type="button"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Ellipsis className="w-4 h-4" />}
      </motion.button>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-[9999] mt-1 min-w-[160px] rounded-xl border border-white/[0.1] overflow-hidden shadow-2xl shadow-black/50"
            style={{
              background: 'rgba(10,10,18,0.97)',
              backdropFilter: 'blur(16px)',
              [align === 'right' ? 'right' : 'left']: 0,
            }}
          >
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <div key={`sep-${index}`} className="h-px bg-white/[0.07] mx-1 my-0.5" />
                );
              }
              return (
                <motion.button
                  key={item.label}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.04 }}
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none
                    ${item.destructive
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                >
                  {item.icon && <span className="w-4 h-4 shrink-0 flex items-center">{item.icon}</span>}
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
