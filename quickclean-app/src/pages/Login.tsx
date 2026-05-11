import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, CheckCircle, RefreshCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<'user' | 'cleaner'>('user');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Initialize RecaptchaVerifier for Invisible ReCaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    }

    if (timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timer]);

  const saveUserToFirestore = async (user: any, authRole: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || 'New User',
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: authRole,
          points: 0,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.warn("Could not save user to Firestore. Proceeding with login anyway.", err);
      // We don't throw the error so the user can still proceed to the app
      // if Firestore is blocked by an ad-blocker or temporary network issue.
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isOtpStep) {
      const isValid = /^[0-9]{10}$/.test(phone);

      if (isValid) {
        setIsLoading(true);
        try {
          const appVerifier = window.recaptchaVerifier;
          const formattedPhone = `+91${phone}`;
          const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
          window.confirmationResult = confirmationResult;
          
          setIsOtpStep(true);
          setTimer(30);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Failed to send OTP');
          // Reset recaptcha so they can try again
          if (window.recaptchaVerifier) window.recaptchaVerifier.render().then((id: any) => window.recaptchaVerifier.reset(id));
        } finally {
          setIsLoading(false);
        }
      }
    } else if (isOtpStep && otp.length === 6) {
      setIsLoading(true);

      try {
        const confirmationResult = window.confirmationResult as any;
        const result = await confirmationResult.confirm(otp);
        
        await saveUserToFirestore(result.user, role);
        
        const token = await result.user.getIdToken();
        localStorage.setItem('token', token);
        
        navigate(role === 'cleaner' ? '/cleaner/dashboard' : '/home');
      } catch (err: any) {
        console.error(err);
        setError('Invalid OTP or Verification failed.');
        setOtp('');
        document.getElementById('otp-0')?.focus();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resendOtp = () => {
    if (timer === 0) {
      handleContinue({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      localStorage.setItem('auth-role', role); // Store role choice
      const result = await signInWithPopup(auth, googleProvider);
      
      await saveUserToFirestore(result.user, role);

      const token = await result.user.getIdToken();
      localStorage.setItem('token', token);
      
      navigate(role === 'cleaner' ? '/cleaner/dashboard' : '/home');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page" style={{ 
      display: 'flex', flexDirection: 'row', minHeight: '100vh', background: 'var(--color-bg)'
    }}>
      {/* Invisible ReCaptcha Container */}
      <div id="recaptcha-container"></div>

      {/* Left Promotional Side (Hidden on Mobile) */}
      <div className="desktop-only" style={{ 
        flex: 1, background: 'linear-gradient(135deg, #0F172A 0%, var(--color-primary-dark) 100%)', 
        display: 'flex', flexDirection: 'column', padding: '64px', color: 'white', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px' }}>✨</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>QuickClean</h1>
        </div>

        <div style={{ marginTop: 'auto', zIndex: 1, maxWidth: '500px' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1.1, marginBottom: '24px', color: '#F8FAFC' }}>
            {role === 'cleaner' ? (
              <>Earn on your schedule,<br/><span style={{ color: 'var(--color-secondary)', textShadow: '0 0 30px rgba(245, 158, 11, 0.3)' }}>Partner with us.</span></>
            ) : (
              <>Premium home cleaning,<br/><span style={{ color: 'var(--color-secondary)', textShadow: '0 0 30px rgba(245, 158, 11, 0.3)' }}>in 10 minutes.</span></>
            )}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(role === 'cleaner' ? [
              'Zero commission for your first 30 days.',
              'Instant payouts after every job.',
              'Choose when and where you work.'
            ] : [
              'Vetted, professional background-checked cleaners.',
              '100% satisfaction guarantee.',
              'Instant booking, zero hassle.'
            ]).map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={24} color="var(--color-success)" />
                <span style={{ fontSize: '18px', fontWeight: '500', opacity: 0.9 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Login Form Side */}
      <div style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
        padding: '24px', background: 'var(--color-bg)', position: 'relative'
      }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px', zIndex: 1, position: 'relative' }}>
          
          <div className="mobile-only" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--color-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--color-primary-dark)' }}>QuickClean</h1>
          </div>

          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            {!isOtpStep && (
              <>
                <div style={{ display: 'flex', background: 'rgba(99, 102, 241, 0.08)', padding: '6px', borderRadius: '16px', marginBottom: '32px' }}>
                  <button type="button" onClick={() => setRole('user')} style={{ flex: 1, padding: '12px', background: role === 'user' ? 'var(--color-surface)' : 'transparent', borderRadius: '12px', fontWeight: '700', fontSize: '16px', color: role === 'user' ? 'var(--color-primary)' : 'var(--color-text-light)', boxShadow: role === 'user' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>Customer</button>
                  <button type="button" onClick={() => setRole('cleaner')} style={{ flex: 1, padding: '12px', background: role === 'cleaner' ? 'var(--color-surface)' : 'transparent', borderRadius: '12px', fontWeight: '700', fontSize: '16px', color: role === 'cleaner' ? 'var(--color-primary)' : 'var(--color-text-light)', boxShadow: role === 'cleaner' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)' }}>Partner</button>
                </div>
                <div className="desktop-only" style={{ width: '64px', height: '64px', background: 'var(--color-primary-light)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-primary-dark)', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.15)' }}>
                  <Phone size={32} />
                </div>
              </>
            )}

               <div style={{ animation: 'scaleIn 0.3s ease-out' }}>
                <h2 style={{ fontSize: '32px', marginBottom: '12px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--color-text)' }}>
                  {isOtpStep ? 'Verification PIN' : 'Log in or Sign up'}
                </h2>
                <p className="text-sm" style={{ fontSize: '17px', opacity: 0.9, lineHeight: 1.5, color: 'var(--color-text)' }}>
                  {isOtpStep 
                    ? <>Enter the secure 6-digit PIN sent to<br/><strong style={{ color: 'var(--color-primary-dark)' }}>+91 {phone}</strong></>
                    : role === 'cleaner' ? 'Enter your details to register as a Partner.' : 'Enter your details to instantly log into your account.'}
                </p>
               </div>

            {error && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', color: '#B91C1C', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', animation: 'scaleIn 0.2s ease-out' }}>
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>

            <form onSubmit={handleContinue} className="flex flex-col gap-6">
              {!isOtpStep ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                    display: 'flex', alignItems: 'center', 
                    background: 'var(--color-surface)', padding: '20px 24px',
                    borderRadius: '20px', border: `2px solid ${phone.length === 10 ? 'var(--color-success)' : 'var(--color-border)'}`,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    boxShadow: phone.length === 10 ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                  }}>
                    <span style={{ fontWeight: '800', fontSize: '20px', color: 'var(--color-text)', marginRight: '16px' }}>+91</span>
                    <div style={{ width: '2px', height: '32px', background: 'var(--color-border)', marginRight: '16px' }}></div>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                      required
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '22px', width: '100%', fontWeight: '700', padding: 0, letterSpacing: '1px' }}
                      autoFocus
                    />
                    {phone.length === 10 && (
                      <div style={{ color: 'var(--color-success)', marginLeft: '12px', animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                        <CheckCircle size={24} />
                      </div>
                    )}
                  </motion.div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '16px 0' }}>
                  {[0, 1, 2, 3, 4, 5].map(index => {
                    const otpArray = otp.split('');
                    return (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={otpArray[index] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (!val && e.target.value !== '') return; // Ignore non-numeric
                          
                          let newOtp = [...otpArray];
                          newOtp[index] = val;
                          const joinedOtp = newOtp.join('').slice(0, 6);
                          setOtp(joinedOtp);

                          // Auto-advance
                          if (val && index < 5) {
                            document.getElementById(`otp-${index + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          // Auto-backspace
                          if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
                            document.getElementById(`otp-${index - 1}`)?.focus();
                          }
                        }}
                        onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--color-primary)'}
                        onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'rgba(99, 102, 241, 0.15)'}
                        className="glass-card"
                        style={{ 
                          width: '56px', height: '64px', fontSize: '28px', textAlign: 'center', 
                          fontWeight: '800', color: 'var(--color-text)', 
                          border: '2px solid var(--color-border)', borderRadius: '16px', 
                          outline: 'none', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)', 
                          background: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' 
                        }}
                        autoFocus={index === 0}
                      />
                    );
                  })}
                </div>
              )}

              {isOtpStep && (
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <button 
                    type="button"
                    onClick={resendOtp}
                    disabled={timer > 0 || isLoading}
                    style={{ 
                      background: 'transparent', border: 'none', cursor: timer > 0 ? 'default' : 'pointer',
                      color: timer > 0 ? 'var(--color-text-light)' : 'var(--color-primary)',
                      fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto'
                    }}
                  >
                    <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    {timer > 0 ? `Resend PIN in ${timer}s` : 'Resend PIN Now'}
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary mt-2 flex items-center justify-center font-bold"
                disabled={isLoading || (!isOtpStep ? phone.length !== 10 : otp.length !== 6)}
                style={{ 
                  padding: '22px', fontSize: '20px', borderRadius: '20px',
                  opacity: isLoading || (!isOtpStep && phone.length !== 10) || (isOtpStep && otp.length !== 6) ? 0.4 : 1
                }}
              >
                {isLoading ? 'Processing...' : isOtpStep ? 'Verify PIN & Secure Login' : 'Continue Securely'}
                <ArrowRight size={24} style={{ marginLeft: '12px' }} />
              </button>

              {!isOtpStep && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '16px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)', opacity: 0.5 }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-border)', opacity: 0.5 }}></div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      width: '100%', padding: '18px', borderRadius: '20px', border: '2px solid var(--color-border)',
                      background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: '700', fontSize: '16px',
                      cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget;
                      btn.style.borderColor = 'var(--color-primary)';
                      btn.style.transform = 'translateY(-2px)';
                      btn.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget;
                      btn.style.borderColor = 'var(--color-border)';
                      btn.style.transform = 'translateY(0)';
                      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}
              
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-light)', marginTop: '16px', padding: '0 20px', lineHeight: 1.5 }}>
                By seamlessly logging in or registering, you agree to our <strong style={{color: 'var(--color-primary)'}}>Terms of Service</strong> and <strong style={{color: 'var(--color-primary)'}}>Privacy Policy</strong>.
              </p>
            </form>
          </div>
        </div>
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
