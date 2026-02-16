import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Trap focus inside container. ESC calls onClose. Restore focus to previous activeElement on cleanup.
 */
export function useFocusTrap(active, onClose) {
  const containerRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    previousActiveRef.current = document.activeElement;
    const el = containerRef.current;
    const focusable = el.querySelectorAll(FOCUSABLE);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          if (last) last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          if (first) first.focus();
        }
      }
    }
    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      if (previousActiveRef.current && typeof previousActiveRef.current.focus === 'function') {
        previousActiveRef.current.focus();
      }
    };
  }, [active, onClose]);

  return containerRef;
}
