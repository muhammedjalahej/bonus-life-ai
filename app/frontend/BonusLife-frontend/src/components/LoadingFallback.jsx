import React from 'react';
import { motion } from 'framer-motion';

const LoadingFallback = ({ language = 'english' }) => {
  const text = language === 'turkish' ? 'Yükleniyor' : 'Loading';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#050508',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        zIndex: 9999,
      }}
    >
      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -18, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
        ))}
      </div>

      {/* Label */}
      <p style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontFamily: "'Figtree','Inter',sans-serif",
      }}>
        {text}
      </p>
    </div>
  );
};

export default LoadingFallback;
