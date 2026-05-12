"use client";

import { useState } from 'react';
import { Briefcase, Building2, ShieldCheck, CheckCircle2, Zap, ArrowRight, Star, Users, MapPin, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CommercialPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Cinematic Hero */}
      <div className="relative pt-40 pb-60 px-6">
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[#0F172A] opacity-80"></div>
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover" alt="Office" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0F172A]/50 to-[#0F172A]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest border border-indigo-500/30 mb-8"
          >
            <Building2 size={14} className="fill-current" />
            Enterprise Solutions
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
            Smart Cleaning <br />
            <span className="text-indigo-500">For Modern Business.</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-12">
            Automated facility management for offices, coworking spaces, and retail. 
            Scale your operations with QuickClean Enterprise.
          </p>
          <div className="flex flex-col md:flex-row gap-6">
            <button className="btn-premium px-10 py-5 text-xl">Request a Quote</button>
            <button className="glass-panel px-10 py-5 text-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
              View Case Studies <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-20">
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { label: "Partner Offices", value: "500+" },
            { label: "Cleaners Dispatched", value: "10k+" },
            { label: "Satisfaction Rate", value: "99.8%" },
            { label: "States Covered", value: "12" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 rounded-[2.5rem] text-center border-indigo-500/10"
            >
              <p className="text-4xl font-black text-indigo-500 mb-2">{stat.value}</p>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Enterprise Features */}
      <div className="max-w-7xl mx-auto px-6 py-40">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black mb-6">Why Enterprises Trust Us</h2>
          <div className="w-24 h-2 bg-indigo-600 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {[
            { 
              icon: <ShieldCheck className="w-10 h-10 text-indigo-500" />, 
              title: "Compliance First", 
              desc: "Fully insured and compliant with all local labor and safety regulations." 
            },
            { 
              icon: <Zap className="w-10 h-10 text-amber-500" />, 
              title: "Real-time Dispatch", 
              desc: "On-demand cleaning for spills, events, or urgent sanitation needs." 
            },
            { 
              icon: <Briefcase className="w-10 h-10 text-emerald-500" />, 
              title: "Centralized Billing", 
              desc: "One dashboard to manage hundreds of locations and consolidated invoicing." 
            }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8"
            >
              <div className="mb-8 p-6 bg-slate-900/50 rounded-3xl border border-slate-800 w-fit">{f.icon}</div>
              <h3 className="text-2xl font-black mb-4">{f.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonial / Trust */}
      <div className="bg-indigo-600/5 py-40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-12 mb-16 opacity-30 grayscale invert">
            <Building2 size={48} />
            <Briefcase size={48} />
            <Users size={48} />
            <MapPin size={48} />
          </div>
          <blockquote className="text-3xl md:text-5xl font-black max-w-4xl mx-auto leading-tight mb-12">
            "QuickClean has streamlined our facility management across 15 cities. Their tech-first approach is exactly what we needed."
          </blockquote>
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-800 rounded-full border-2 border-indigo-500 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" alt="CTO" />
            </div>
            <div>
              <p className="font-black">David Chen</p>
              <p className="text-slate-500 font-bold text-sm">Ops Director, TechHub Global</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA / Form */}
      <div id="contact" className="py-40 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-5xl md:text-7xl font-black mb-12">Ready to Upgrade?</h2>
        
        <LeadForm />
      </div>
    </div>
  );
}

function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    // Simulate Slack Webhook call
    // fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', { method: 'POST', body: JSON.stringify({ text: "New B2B Lead!" })})
    
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 2000);
  };

  if (sent) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-12 rounded-[3rem] border-emerald-500/30">
      <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />
      <h3 className="text-3xl font-black mb-4">Request Received!</h3>
      <p className="text-slate-400 font-bold">Your dedicated account manager will contact you within 2 hours. <br /> (Our team has been notified via Slack ⚡)</p>
    </motion.div>
  );

  return (
    <div className="glass-panel p-10 md:p-16 rounded-[3rem] border-indigo-500/10 text-left">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Company Name</label>
            <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold" placeholder="Google India" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Work Email</label>
            <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold" placeholder="ops@company.com" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Requirements</label>
          <textarea required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold" placeholder="Tell us about your space and cleaning frequency..."></textarea>
        </div>
        <button disabled={loading} className="btn-premium w-full py-5 text-xl flex items-center justify-center gap-3">
          {loading ? <Loader2 className="animate-spin" /> : <><Send size={24} /> Send Inquiry</>}
        </button>
      </form>
    </div>
  );
}
