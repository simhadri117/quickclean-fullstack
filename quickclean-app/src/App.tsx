import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Navigation from './components/Navigation';
import AnimatedPage from './components/AnimatedPage';
import Chatbot from './components/Chatbot';

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
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/splash" element={<AnimatedPage><Splash /></AnimatedPage>} />
            <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
            <Route path="/home" element={<AnimatedPage><Home /></AnimatedPage>} />
            <Route path="/tracking" element={<AnimatedPage><Tracking /></AnimatedPage>} />
            <Route path="/checkout" element={<AnimatedPage><Checkout /></AnimatedPage>} />
            <Route path="/cleaner/dashboard" element={<AnimatedPage><CleanerDashboard /></AnimatedPage>} />
            <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
            <Route path="/admin" element={<AnimatedPage><AdminDashboard /></AnimatedPage>} />
            <Route path="/" element={<AnimatedPage><Splash /></AnimatedPage>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Chatbot />
      <VercelAnalytics />
    </div>
  );
}

export default App;

