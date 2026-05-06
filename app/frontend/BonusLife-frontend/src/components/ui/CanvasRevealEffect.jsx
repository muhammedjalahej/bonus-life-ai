import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

/* ─── CSS-based animated dot matrix (no WebGL / R3F required) ─────────────
   Creates a grid of dots that fade in from the center outward,
   matching the visual of the original shader-based component.
──────────────────────────────────────────────────────────────────────────── */

const STYLES = `
@keyframes cre-dot-fade {
  0%   { opacity: 0; transform: scale(0.5); }
  60%  { opacity: 1; transform: scale(1);   }
  100% { opacity: var(--dot-max-opacity);   }
}
.cre-dot {
  position: absolute;
  border-radius: 50%;
  animation: cre-dot-fade var(--dot-duration) ease-out forwards;
  animation-delay: var(--dot-delay);
  opacity: 0;
}
`;

export const CanvasRevealEffect = ({
  colors = [[124, 58, 237]],
  dotSize = 3,
  containerClassName,
  showGradient = true,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const W = el.offsetWidth  || 600;
    const H = el.offsetHeight || 800;
    const STEP = 22;
    const cols = Math.ceil(W / STEP);
    const rows = Math.ceil(H / STEP);
    const cx = cols / 2;
    const cy = rows / 2;
    const maxDist = Math.hypot(cx, cy);

    const colorStr = colors[0];

    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.hypot(c - cx, r - cy);
        const normalised = dist / maxDist;
        const delay = normalised * 1.2 + Math.random() * 0.3;
        const maxOp = (0.2 + Math.random() * 0.5).toFixed(2);
        const duration = (1.5 + Math.random() * 1.5).toFixed(2);

        const dot = document.createElement('div');
        dot.className = 'cre-dot';
        dot.style.cssText = `
          left: ${c * STEP + STEP / 2 - dotSize / 2}px;
          top: ${r * STEP + STEP / 2 - dotSize / 2}px;
          width: ${dotSize}px;
          height: ${dotSize}px;
          background: rgb(${colorStr[0]},${colorStr[1]},${colorStr[2]});
          --dot-delay: ${delay}s;
          --dot-duration: ${duration}s;
          --dot-max-opacity: ${maxOp};
        `;
        frag.appendChild(dot);
      }
    }

    el.appendChild(frag);
    return () => { while (el.firstChild) el.removeChild(el.firstChild); };
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className={cn('h-full relative w-full overflow-hidden', containerClassName)}>
        <div ref={containerRef} className="absolute inset-0" />
        {showGradient && (
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        )}
      </div>
    </>
  );
};
