import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

const Bubble = ({ index }: { index: number }) => {
  const size = Math.random() * 40 + 20;
  const initialX = Math.random() * 100;
  const duration = Math.random() * 4 + 4;
  const delay = Math.random() * 2;

  return (
    <motion.div
      initial={{ y: '110vh', x: `${initialX}vw`, opacity: 0, scale: 0 }}
      animate={{ 
        y: '-10vh', 
        opacity: [0, 0.4, 0.4, 0],
        scale: [0, 1, 1.2, 0.8],
        x: [`${initialX}vw`, `${initialX + (Math.random() * 10 - 5)}vw`]
      }}
      transition={{ 
        duration, 
        delay, 
        repeat: Infinity, 
        ease: "linear" 
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0) 100%)',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(2px)',
        zIndex: 0,
      }}
    />
  );
};

const Sparkle = ({ delay }: { delay: number }) => {
  const top = Math.random() * 100;
  const left = Math.random() * 100;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{ 
        scale: [0, 1.2, 0], 
        opacity: [0, 0.8, 0],
        rotate: [0, 180]
      }}
      transition={{ 
        duration: 1.5, 
        delay, 
        repeat: Infinity, 
        repeatDelay: Math.random() * 3 
      }}
      style={{
        position: 'absolute',
        top: `${top}%`,
        left: `${left}%`,
        fontSize: '12px',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      ✨
    </motion.div>
  );
};

const containerVariants: Variants = {
  initial: { opacity: 1 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.5,
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.8, ease: "easeInOut" }
  }
};

const logoVariants: Variants = {
  initial: { opacity: 0, scale: 0.5, y: 50 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2
    }
  }
};

const titleVariants: Variants = {
  initial: { clipPath: 'inset(0 100% 0 0)' },
  animate: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 0.8 }
  }
};

const CleaningStatus = () => {
  const [index, setIndex] = useState(0);
  const statuses = ["Dusting...", "Sanitizing...", "Polishing...", "Refreshing...", "Sparkling!"];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={statuses[index]}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: '12px', color: '#6366F1', fontWeight: '700', letterSpacing: '2px' }}
      >
        {statuses[index]}
      </motion.span>
    </AnimatePresence>
  );
};

export default function Splash() {
  const navigate = useNavigate();
  const [showShine, setShowShine] = useState(false);

  useEffect(() => {
    const shineTimer = setTimeout(() => setShowShine(true), 2000);
    const exitTimer = setTimeout(() => {
      navigate('/login');
    }, 4500);
    
    return () => {
      clearTimeout(shineTimer);
      clearTimeout(exitTimer);
    };
  }, [navigate]);

  return (
    <motion.div 
      className="page splash-page" 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ 
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: 'white', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        height: '100vh',
      }}
    >
      {/* Background Bubbles */}
      {[...Array(15)].map((_, i) => (
        <Bubble key={i} index={i} />
      ))}

      {/* Scattered Sparkles */}
      {[...Array(10)].map((_, i) => (
        <Sparkle key={i} delay={i * 0.4} />
      ))}

      {/* Central Content */}
      <div style={{ zIndex: 10, textAlign: 'center', position: 'relative' }}>
        <motion.div 
          variants={logoVariants}
          style={{
            width: '140px', height: '140px', 
            background: '#FFFFFF', 
            borderRadius: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            marginBottom: '32px',
            margin: '0 auto 32px',
            position: 'relative',
            overflow: 'hidden',
            padding: '15px'
          }}
        >
          <motion.img 
            src="/logo192.png"
            alt="QuickClean Logo"
            initial={{ rotate: -180, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 1, type: 'spring', bounce: 0.5 }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          
          {/* Internal Glow */}
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '28px',
              boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.3)',
              pointerEvents: 'none'
            }}
          />
        </motion.div>
        
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <motion.h1 
            variants={titleVariants}
            style={{ 
              color: 'white', fontSize: '56px', fontWeight: '900', 
              letterSpacing: '-2px', margin: 0,
              textShadow: '0 10px 20px rgba(0,0,0,0.3)',
              background: 'linear-gradient(to bottom, #FFFFFF 0%, #CBD5E1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            QuickClean
          </motion.h1>
          
          {/* Shine Effect */}
          <AnimatePresence>
            {showShine && (
              <motion.div
                initial={{ x: '-100%', skewX: -20 }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                  zIndex: 2,
                }}
              />
            )}
          </AnimatePresence>
        </div>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          style={{ 
            fontSize: '14px', color: '#94A3B8', fontWeight: '600', 
            letterSpacing: '4px', textTransform: 'uppercase',
            marginTop: '16px'
          }}
        >
          Purity in every corner
        </motion.p>

        {/* Dynamic Cleaning Status */}
        <div style={{ marginTop: '48px', height: '24px' }}>
          <CleaningStatus />
        </div>
      </div>

      {/* Decorative Squeegee Wipe Effect (Bottom Reveal) */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
        style={{
          position: 'absolute', bottom: '40px', left: '20%', right: '20%',
          height: '1px', background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)',
          opacity: 0.5
        }}
      />
    </motion.div>
  );
}
