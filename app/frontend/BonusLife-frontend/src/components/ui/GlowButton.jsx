import React, { useId } from 'react';

export const GlowButton = ({ children, onClick, disabled, type = 'button', className = '' }) => {
  const id = useId().replace(/:/g, '');
  const f1 = `unopaq-${id}`;
  const f2 = `unopaq2-${id}`;
  const f3 = `unopaq3-${id}`;

  return (
    <div className={`relative group ${className}`}>
      {/* SVG Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={f1}>
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 9 0" />
        </filter>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={f2}>
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 3 0" />
        </filter>
        <filter width="300%" x="-100%" height="300%" y="-100%" id={f3}>
          <feColorMatrix values="1 0 0 0.15 0 0 1 0 0.15 0 0 0 1 0.15 0 0 0 0 2 0" />
        </filter>
      </svg>

      {/* Invisible native button for form submit / click */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="absolute inset-0 w-full h-full z-20 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-hidden="false"
      />

      {/* Outer glow */}
      <div
        className="absolute inset-0 -z-20 opacity-40 overflow-hidden rounded-2xl transition-opacity duration-300 group-hover:opacity-70 group-active:opacity-100"
        style={{ filter: `blur(1.5em) url(#${f1})` }}
      >
        <div
          className="absolute inset-[-150%] glow-speen"
          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 30%, transparent 50%, rgba(220,220,255,0.9) 70%)' }}
        />
      </div>

      {/* Middle glow */}
      <div
        className="absolute inset-[-2px] -z-20 opacity-40 overflow-hidden rounded-2xl transition-opacity duration-300 group-hover:opacity-70 group-active:opacity-100"
        style={{ filter: `blur(4px) url(#${f2})` }}
      >
        <div
          className="absolute inset-[-150%] glow-speen"
          style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 20%, transparent 45% 55%, rgba(200,210,255,0.8) 80%)' }}
        />
      </div>

      {/* Button surface */}
      <div className="p-px rounded-2xl bg-black/30">
        <div className="relative rounded-[inherit]">
          {/* Inner glow */}
          <div
            className="absolute inset-[-2px] -z-10 opacity-40 overflow-hidden rounded-[inherit] transition-opacity duration-300 group-hover:opacity-70 group-active:opacity-100"
            style={{ filter: `blur(2px) url(#${f3})` }}
          >
            <div
              className="absolute inset-[-150%] glow-speen"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 30%, transparent 45% 55%, rgba(210,220,255,0.6) 70%)' }}
            />
          </div>

          {/* Label */}
          <div
            className={`relative flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-[inherit] bg-[#111215] text-white font-bold text-sm overflow-hidden select-none ${disabled ? 'opacity-50' : ''}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
