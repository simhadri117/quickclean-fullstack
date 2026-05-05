import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setIsExiting(true);
    }, 2500);
    
    const timer2 = setTimeout(() => {
      navigate('/login');
    }, 3000); // Wait for exit animation
    
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [navigate]);

  return (
    <div className="page" style={{ 
      background: 'linear-gradient(135deg, #0F172A 0%, var(--color-primary-dark) 100%)',
      color: 'white', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      opacity: isExiting ? 0 : 1,
      transform: isExiting ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Refined Ambient Glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100vw', height: '100vw',
        background: 'radial-gradient(circle, rgba(0,179,166,0.3) 0%, rgba(0,0,0,0) 70%)',
        animation: 'pulseGlow 4s ease-in-out infinite alternate',
        zIndex: 0
      }}></div>

      <div style={{ zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '80px', height: '80px', background: 'white', borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.8)',
          marginBottom: '24px',
          animation: 'logoReveal 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>
          <span style={{ fontSize: '40px' }}>✨</span>
        </div>
        
        <h1 style={{ 
          color: 'white', fontSize: '42px', fontWeight: '800', 
          letterSpacing: '-1px', marginBottom: '8px',
          animation: 'textFadeUp 0.8s ease-out 0.3s forwards', opacity: 0, transform: 'translateY(10px)'
        }}>
          QuickClean
        </h1>
        <p style={{ 
          fontSize: '16px', color: '#94A3B8', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase',
          animation: 'textFadeUp 0.8s ease-out 0.5s forwards', opacity: 0, transform: 'translateY(10px)'
        }}>
          Premium Home Services
        </p>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes logoReveal {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0px); }
        }
        @keyframes textFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
