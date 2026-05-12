"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Bubble = ({ index }: { index: number }) => {
  const [coords, setCoords] = useState({ size: 0, initialX: 0, duration: 0, delay: 0 });

  useEffect(() => {
    setCoords({
      size: Math.random() * 40 + 20,
      initialX: Math.random() * 100,
      duration: Math.random() * 4 + 4,
      delay: Math.random() * 2
    });
  }, []);

  if (coords.size === 0) return null;

  return (
    <motion.div
      initial={{ y: '110vh', x: `${coords.initialX}vw`, opacity: 0, scale: 0 }}
      animate={{ 
        y: '-10vh', 
        opacity: [0, 0.4, 0.4, 0],
        scale: [0, 1, 1.2, 0.8],
        x: [`${coords.initialX}vw`, `${coords.initialX + (Math.random() * 10 - 5)}vw`]
      }}
      transition={{ 
        duration: coords.duration, 
        delay: coords.delay, 
        repeat: Infinity, 
        ease: "linear" 
      }}
      style={{
        position: 'absolute',
        width: coords.size,
        height: coords.size,
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
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setPos({
      top: Math.random() * 100,
      left: Math.random() * 100
    });
  }, []);

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
        top: `${pos.top}%`,
        left: `${pos.left}%`,
        fontSize: '12px',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      ✨
    </motion.div>
  );
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
        style={{ fontSize: '14px', color: '#6366F1', fontWeight: '700', letterSpacing: '2px' }}
      >
        {statuses[index]}
      </motion.span>
    </AnimatePresence>
  );
};

export default function Splash({ onFinish }: { onFinish: () => void }) {
  const [showShine, setShowShine] = useState(false);

  useEffect(() => {
    const shineTimer = setTimeout(() => setShowShine(true), 2000);
    const exitTimer = setTimeout(() => {
      onFinish();
    }, 4500);
    
    return () => {
      clearTimeout(shineTimer);
      clearTimeout(exitTimer);
    };
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      style={{ 
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: 'white', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {/* Background Bubbles */}
      {[...Array(20)].map((_, i) => (
        <Bubble key={i} index={i} />
      ))}

      {/* Scattered Sparkles */}
      {[...Array(15)].map((_, i) => (
        <Sparkle key={i} delay={i * 0.4} />
      ))}

      {/* Central Content */}
      <div style={{ zIndex: 10, textAlign: 'center', position: 'relative' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          style={{
            width: '120px', height: '120px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            marginBottom: '40px',
            margin: '0 auto 40px',
            position: 'relative'
          }}
        >
          <motion.span 
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 1, type: 'spring', bounce: 0.5 }}
            style={{ fontSize: '56px' }}
          >
            ✨
          </motion.span>
          
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '32px',
              boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.3)',
              pointerEvents: 'none'
            }}
          />
        </motion.div>
        
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <motion.h1 
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 0.8 }}
            style={{ 
              color: 'white', fontSize: '72px', fontWeight: '900', 
              letterSpacing: '-3px', margin: 0,
              textShadow: '0 10px 20px rgba(0,0,0,0.3)',
              background: 'linear-gradient(to bottom, #FFFFFF 0%, #CBD5E1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            QuickClean
          </motion.h1>
          
          <AnimatePresence>
            {showShine && (
              <motion.div
                initial={{ x: '-100%', skewX: -20 }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '60px',
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
            fontSize: '16px', color: '#94A3B8', fontWeight: '600', 
            letterSpacing: '6px', textTransform: 'uppercase',
            marginTop: '24px'
          }}
        >
          Premium Web Experience
        </motion.p>

        <div style={{ marginTop: '64px', height: '24px' }}>
          <CleaningStatus />
        </div>
      </div>
    </motion.div>
  );
}
