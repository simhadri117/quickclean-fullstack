import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2, Sparkles } from 'lucide-react';

const provider = new GoogleAuthProvider();

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged in App.tsx will handle routing to /
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else {
        setError('Sign-in failed. Please try again.');
        console.error('[CleanerLogin] Firebase error:', err.code, err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '-20%', left: '-20%',
        width: '60vw', height: '60vw', maxWidth: 400,
        background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-20%',
        width: '50vw', height: '50vw', maxWidth: 360,
        background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 400, zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            borderRadius: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 16px 48px rgba(124,58,237,0.5)',
            fontSize: 32, fontWeight: 900, color: 'white'
          }}>Q</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', marginBottom: 8 }}>
            QuickClean Partner
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            Sign in to start accepting jobs
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 28, paddingBottom: 20,
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <Sparkles size={16} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              CLEANER PORTAL
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, textAlign: 'center', marginBottom: 8 }}>
              Use your Google account to sign in to the Partner Hub
            </p>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12,
                color: '#f87171',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.12)',
                background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)';
              }}
              onMouseLeave={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
              }}
            >
              {loading ? (
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          For cleaners only · Powered by QuickClean
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
