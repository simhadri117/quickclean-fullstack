"use client";

import { useState, useEffect } from 'react';
import { CloudRain, Sun, Wind, Cloud, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WeatherBanner() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    // Real Weather API Integration
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        // Using a free, no-key weather proxy for demonstration, or standard OWM structure
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        const code = data.current_weather.weathercode;
        
        // Map WMO codes to our custom UX
        let type = 'Clear';
        let icon = <Sun className="text-amber-400" />;
        let msg = "Perfect day for a fresh start! Book a window cleaning to let the sunshine in.";

        if (code >= 51 && code <= 67) {
          type = 'Rain';
          icon = <CloudRain className="text-blue-400" />;
          msg = "It's raining outside! Our pros carry extra shoe covers to keep your floors pristine.";
        } else if (code >= 1 && code <= 3) {
          type = 'Clouds';
          icon = <Cloud className="text-slate-400" />;
          msg = "Looks like a cozy indoor day. Time for a deep sofa cleaning?";
        }

        setWeather({ type, icon, msg, temp: Math.round(data.current_weather.temperature) });
      } catch (err) {
        console.error("Weather fetch failed", err);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Fallback to default city (Hyderabad/Mumbai) if location denied
        fetchWeather(17.3850, 78.4867);
      }
    );
  }, []);

  return (
    <AnimatePresence>
      {weather && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-indigo-600/10 border-b border-indigo-500/20 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              {weather.icon}
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Live: {weather.temp}°C</span>
            </div>
            <p className="text-xs font-bold text-slate-300">
              {weather.msg}
            </p>
            <motion.div 
              animate={{ x: [0, 5, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="hidden md:block"
            >
              <Zap size={12} className="text-indigo-500 fill-current" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
