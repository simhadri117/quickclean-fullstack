"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Sparkles, ArrowRight, Smartphone, KeyRound } from "lucide-react";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await confirmationResult.confirm(otp);
      router.push("/home");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the ID token to send to backend or just rely on Firebase auth state
      const token = await result.user.getIdToken();
      
      router.push("/home");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white mb-4 shadow-xl shadow-blue-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">QuickClean</h1>
          <p className="text-slate-500 mt-2 font-medium">Your home, sparkling clean.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sign in to continue</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isPhoneMode ? (
              <>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 py-4 px-6 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {isLoading ? "Signing in..." : "Continue with Google"}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">or</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <button 
                  className="w-full flex items-center justify-between bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group"
                  onClick={() => setIsPhoneMode(true)}
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-blue-200" />
                    <span>Use Phone Number</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            ) : (
              <form onSubmit={!confirmationResult ? handlePhoneLogin : handleVerifyOtp} className="space-y-4">
                {!confirmationResult ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                      <input 
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter 10-digit number"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {isLoading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
                      <input 
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {isLoading ? "Verifying..." : "Verify & Login"}
                    </button>
                  </>
                )}
                
                <button 
                  type="button"
                  onClick={() => {
                    setIsPhoneMode(false);
                    setConfirmationResult(null);
                    setError(null);
                  }}
                  className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Back to options
                </button>
              </form>
            )}
          </div>
          
          <div id="recaptcha-container"></div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
