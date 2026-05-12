"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, Zap, MapPin } from 'lucide-react';

const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
const SERVICES = ['Deep Home Cleaning', 'Kitchen Sanitization', 'Bathroom Scrub', 'Elite Package'];

export default function SocialProof() {
  const [current, setCurrent] = useState<any>(null);

  useEffect(() => {
    const showNotification = () => {
      const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
      const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const time = Math.floor(Math.random() * 5) + 1;

      setCurrent({ location, service, time });

      setTimeout(() => {
        setCurrent(null);
      }, 5000);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.5) showNotification();
    }, 15000);

    // Show initial after 3 seconds
    const initial = setTimeout(showNotification, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, []);

  return (
    <div className="fixed bottom-10 left-10 z-[1000] pointer-events-none">
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            className="glass-panel p-5 rounded-2xl flex items-center gap-4 border-indigo-500/30 shadow-2xl min-w-[300px]"
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Recent Booking</p>
              <h4 className="text-sm font-black text-white leading-tight">
                Someone in <span className="text-indigo-400">{current.location}</span> <br />
                booked <span className="text-indigo-400">{current.service}</span>
              </h4>
              <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1">
                <Zap size={10} className="fill-current" /> {current.time} mins ago • Verified ✅
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
