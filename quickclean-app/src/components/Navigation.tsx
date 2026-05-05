import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, CreditCard, User, Zap, Bell } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [activeBookings, setActiveBookings] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data());
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { icon: <Home size={22} />, label: 'Home', path: '/home' },
    { icon: <Calendar size={22} />, label: 'Bookings', path: '/profile', state: 'bookings' },
    { icon: <CreditCard size={22} />, label: 'Payments', path: '/profile', state: 'payments' },
    { icon: <User size={22} />, label: 'Profile', path: '/profile', state: 'settings' },
  ];

  const handleNavClick = (item: any) => {
    if (item.path === '/profile' && item.state) {
      // If we're already on profile, we might need a way to trigger state change
      // But for now, just navigate. Profile.tsx will handle the state via query or similar if we improvise it.
      // For now, let's just navigate to the path.
      navigate(item.path, { state: { activeTab: item.state } });
    } else {
      navigate(item.path);
    }
  };

  const isActive = (path: string, state?: string) => {
    if (location.pathname !== path) return false;
    if (state && location.state?.activeTab !== state) return false;
    return true;
  };

  // Only show navigation on specific pages
  const showHeader = ['/home', '/profile', '/tracking', '/checkout'].includes(location.pathname);
  const showBottomNav = ['/home', '/profile'].includes(location.pathname);

  if (!showHeader) return null;

  return (
    <>
      {/* ─── Top Header (Branding & Profile) ─── */}
      <nav style={{ 
        borderBottom: '1px solid var(--color-border)', 
        position: 'sticky', 
        top: 0, 
        background: 'rgba(255,255,255,0.9)', 
        backdropFilter: 'blur(10px)', 
        zIndex: 100,
        height: '64px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/home')}>
            <div style={{ width: '36px', height: '36px', background: 'var(--color-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
              <Zap size={18} />
            </div>
            <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--color-text)' }}>QuickClean</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {user && (
              <div 
                className="hide-mobile"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', 
                  borderRadius: '100px', color: 'white', fontSize: '12px', fontWeight: '800'
                }}
              >
                ✨ {user.points || 0} PTS
              </div>
            )}
            <button style={{ padding: '8px', background: 'var(--color-primary-light)', border: 'none', borderRadius: '12px', color: 'var(--color-primary)', cursor: 'pointer' }}>
              <Bell size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Bottom Navigation (Mobile Only) ─── */}
      {showBottomNav && (
        <div className="bottom-nav">
          {navItems.map((item, idx) => (
            <button 
              key={idx}
              className={`nav-item ${isActive(item.path, item.state) ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <div className="nav-item-icon">
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
