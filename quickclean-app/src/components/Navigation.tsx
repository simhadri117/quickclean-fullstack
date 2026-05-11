import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Zap, Bell, Sun, Moon, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Only show navigation on specific pages
  const showHeader = ['/home', '/profile', '/tracking', '/checkout'].includes(location.pathname);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  if (!showHeader) return null;

  return (
    <>
      {/* ─── Top Header (Branding & Profile) ─── */}
      <nav style={{ 
        borderBottom: '1px solid var(--color-border)', 
        position: 'sticky', 
        top: 0, 
        background: 'var(--color-surface)', 
        backdropFilter: 'blur(16px)', 
        zIndex: 100,
        height: '64px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', width: '100%' }}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
            onClick={() => navigate('/home')}
          >
            <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden', padding: '4px' }}>
              <img src="/logo192.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--color-text)' }}>QuickClean</span>
          </motion.div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              style={{ padding: '8px', background: 'var(--color-primary-light)', border: 'none', borderRadius: '12px', color: 'var(--color-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </motion.button>
            
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ 
                  padding: '8px', 
                  background: showNotifications ? 'var(--color-primary)' : 'var(--color-primary-light)', 
                  border: 'none', 
                  borderRadius: '12px', 
                  color: showNotifications ? 'white' : 'var(--color-primary)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <Bell size={20} />
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    style={{
                      position: 'absolute',
                      top: '52px',
                      right: 0,
                      width: '320px',
                      background: 'var(--color-surface)',
                      backdropFilter: 'blur(32px)',
                      borderRadius: '20px',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                      padding: '24px',
                      zIndex: 200,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text)' }}>Notifications</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>0 New</span>
                    </div>

                    <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '64px', height: '64px', background: 'var(--color-primary-light)', 
                        borderRadius: '20px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', color: 'var(--color-primary)',
                        opacity: 0.8
                      }}>
                        <BellOff size={32} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '4px' }}>
                          No notification history
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-light)', lineHeight: '1.4' }}>
                          We'll notify you here about updates to your bookings and services.
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowNotifications(false)}
                      style={{ 
                        width: '100%', padding: '12px', background: 'var(--color-primary-light)', 
                        border: 'none', borderRadius: '12px', color: 'var(--color-primary)', 
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '8px'
                      }}
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/profile')} 
              style={{ padding: '8px', background: 'var(--color-primary-light)', border: 'none', borderRadius: '12px', color: 'var(--color-primary)', cursor: 'pointer' }}
            >
              <User size={20} />
            </motion.button>
          </div>
        </div>
      </nav>
    </>
  );
}
