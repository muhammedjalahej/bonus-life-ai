import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const words = ['Welcome', 'Bienvenue', 'Benvenuto', 'Bienvenido', 'ようこそ', 'Välkommen', 'Willkommen', 'স্বাগতম'];

const opacity = {
  initial: { opacity: 0 },
  enter: { opacity: 0.85, transition: { duration: 1, delay: 0.2 } },
};

const slideUp = {
  initial: { top: 0 },
  exit: {
    top: '-100vh',
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 },
  },
};

export default function Preloader({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setDimension({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    if (index === words.length - 1) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onComplete?.(), 1000);
      }, 1000);
      return;
    }
    const timer = setTimeout(() => setIndex(index + 1), index === 0 ? 1000 : 150);
    return () => clearTimeout(timer);
  }, [index, onComplete]);

  const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height} L0 0`;
  const targetPath  = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height} L0 0`;

  const curve = {
    initial: { d: initialPath, transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } },
    exit:    { d: targetPath,  transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.3 } },
  };

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate={isExiting ? 'exit' : 'initial'}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050508', zIndex: 999999999 }}
    >
      {dimension.width > 0 && (
        <>
          <motion.p
            variants={opacity}
            initial="initial"
            animate="enter"
            style={{ position: 'absolute', zIndex: 10, display: 'flex', alignItems: 'center', fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 600, color: 'white', letterSpacing: '-0.02em' }}
          >
            <span style={{ display: 'block', width: 10, height: 10, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', borderRadius: '50%', marginRight: 14, flexShrink: 0 }} />
            {words[index]}
          </motion.p>
          <svg style={{ position: 'absolute', top: 0, width: '100%', height: 'calc(100% + 300px)' }}>
            <motion.path variants={curve} initial="initial" animate={isExiting ? 'exit' : 'initial'} fill="#050508" />
          </svg>
        </>
      )}
    </motion.div>
  );
}
