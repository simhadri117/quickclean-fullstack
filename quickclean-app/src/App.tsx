import { Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Navigation from './components/Navigation';

const Splash = lazy(() => import('./pages/Splash'));
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CleanerDashboard = lazy(() => import('./pages/CleanerDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function PageLoader() {
  return (
    <div className="page-loader">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{
          width: '44px', height: '44px', background: 'var(--color-primary)',
          borderRadius: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
        }}>✨</div>
        <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-primary-dark)', letterSpacing: '-0.5px' }}>QuickClean</span>
      </div>
      <div className="loader-spinner" />
      <p style={{ fontSize: '14px', color: 'var(--color-text-light)', fontWeight: '600' }}>Loading, please wait...</p>
    </div>
  );
}

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/splash', '/'].includes(location.pathname);

  useEffect(() => {
    const unsubscribeFb = onAuthStateChanged(auth, async (user) => {
      console.log('🔔 Firebase Auth Event:', user ? 'SIGNED_IN' : 'SIGNED_OUT');
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    });

    return () => unsubscribeFb();
  }, []);

  return (
    <div className={`app-container ${!isAuthPage ? 'pb-nav' : ''}`}>
      {!isAuthPage && <Navigation />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/cleaner/dashboard" element={<CleanerDashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/" element={<Splash />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
