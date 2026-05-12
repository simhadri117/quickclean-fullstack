'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    console.error('Captured Runtime Error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl shadow-slate-200 border border-slate-100 text-center"
      >
        <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="text-amber-600 w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-slate-500 mb-8 font-medium">
          Our team has been notified and we're looking into it. In the meantime, you can try refreshing.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <RefreshCw size={20} />
            Try again
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            <Home size={20} />
            Back to Home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-[10px] text-slate-300 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  );
}
