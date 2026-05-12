"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Clock, Star, MapPin, CheckCircle2, Users, Briefcase, Zap } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Splash from "@/components/Splash";
import BookingWizard from "@/components/BookingWizard";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [services, setServices] = useState<any[]>([]);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "services"));
        const servicesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);
      } catch (err) {
        console.error("Firestore Error:", err);
      }
    };
    fetchServices();
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && <Splash onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      <div className={`min-h-screen transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <header className="fixed top-0 w-full bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800/50 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Zap className="text-white w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Quick<span className="text-indigo-500">Clean</span>
              </span>
            </div>
            
            <div className="flex items-center gap-8">
              <nav className="hidden md:flex gap-10 text-sm font-bold text-slate-400">
                <a href="#services" className="hover:text-white transition-colors">Services</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">Process</a>
                <a href="#partners" className="hover:text-white transition-colors">Partners</a>
              </nav>
              <Link href="/login" className="btn-premium py-2 px-6 text-sm">
                Sign In
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-20 -left-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-[120px] -z-10"></div>
          <div className="absolute top-80 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px] -z-10"></div>

          <div className="text-center mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest border border-indigo-500/20 mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Now serving your city
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-black leading-[0.95] tracking-tighter mb-8 text-gradient">
              Experience Purity <br />
              <span className="text-indigo-500">Redefined.</span>
            </h1>
            
            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto font-medium">
              Professional home cleaning dispatched in under 10 minutes. 
              State-of-the-art care for your sanctuary.
            </p>
          </div>

          {/* Booking Wizard Section */}
          <section id="services" className="mb-40">
            <BookingWizard />
          </section>

          {/* Features Grid */}
          <section className="grid md:grid-cols-3 gap-8 mb-40">
            {[
              { icon: <ShieldCheck className="w-8 h-8 text-indigo-500" />, title: "Vetted Professionals", desc: "Every cleaner undergoes rigorous background checks and quality training." },
              { icon: <Clock className="w-8 h-8 text-amber-500" />, title: "10-Min Arrival", desc: "Our real-time dispatch system ensures your cleaner arrives faster than a pizza." },
              { icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />, title: "Premium Standards", desc: "Eco-friendly products and hotel-grade sanitization for every home." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-8 rounded-[2rem] hover:border-indigo-500/50 transition-colors group"
              >
                <div className="mb-6 p-4 bg-slate-900/50 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </section>

          {/* Partner Section */}
          <section id="partners" className="glass-panel rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-600/10 to-transparent -z-10"></div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                  Earn while you <br />
                  <span className="text-indigo-500">make homes happy.</span>
                </h2>
                <p className="text-lg text-slate-400 mb-10 font-medium leading-relaxed">
                  Join our elite network of cleaning professionals. Earn up to ₹25,000/month with flexible hours and instant payouts.
                </p>
                <div className="flex flex-col gap-6 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="font-bold">Flexible Schedules</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-indigo-500" />
                    </div>
                    <span className="font-bold">Weekly Performance Bonuses</span>
                  </div>
                </div>
                <button className="btn-premium px-10">Apply as Partner</button>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] -z-10 opacity-50"></div>
                <div className="bg-slate-900/50 rounded-[2.5rem] border border-slate-800 p-8 transform group-hover:scale-[1.02] transition-transform">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-full overflow-hidden border-2 border-indigo-500">
                      <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" alt="Partner" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Priya Sharma</h4>
                      <div className="flex text-amber-500 gap-1">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>
                  <blockquote className="text-xl italic text-slate-300 font-medium">
                    "QuickClean changed my life. I can work when I want and the payments are always on time. Highly recommended for anyone looking for reliable income!"
                  </blockquote>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 bg-[#0F172A] py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Zap className="text-indigo-500 w-6 h-6" />
              <span className="text-xl font-black text-white">QuickClean</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">© 2026 QuickClean Premium Services. All rights reserved.</p>
            <div className="flex gap-8 text-sm font-bold text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
