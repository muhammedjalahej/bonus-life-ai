/**
 * ShineBorder — animated radial-gradient border effect.
 * Adapted from the shadcn/magicui component for this JSX + Tailwind v3 project.
 */
export function ShineBorder({
  borderRadius = 16,
  borderWidth = 2,
  duration = 10,
  color = ['#7C3AED', '#A78BFA', '#6D28D9'],
  className = '',
  style = {},
  children,
}) {
  const colorStr = Array.isArray(color) ? color.join(',') : color;

  return (
    <div
      style={{ '--border-radius': `${borderRadius}px`, borderRadius: `${borderRadius}px`, ...style }}
      className={`relative ${className}`}
    >
      {/* Animated shine border layer */}
      <div
        style={{
          '--border-width': `${borderWidth}px`,
          '--shine-pulse-duration': `${duration}s`,
          '--mask-linear-gradient': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          '--background-radial-gradient': `radial-gradient(transparent, transparent, ${colorStr}, transparent, transparent)`,
          position: 'absolute',
          inset: 0,
          borderRadius: `${borderRadius}px`,
          padding: `${borderWidth}px`,
          backgroundImage: 'var(--background-radial-gradient)',
          backgroundSize: '300% 300%',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          WebkitMask: 'var(--mask-linear-gradient)',
          mask: 'var(--mask-linear-gradient)',
          animation: `shine-pulse var(--shine-pulse-duration) infinite linear`,
          willChange: 'background-position',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}
