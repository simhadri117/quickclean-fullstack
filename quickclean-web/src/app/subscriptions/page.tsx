"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, Sparkles, ShieldCheck, Star, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: "Starter Sparkle",
    price: "1,499",
    period: "/mo",
    description: "Perfect for busy individuals who need a regular hand.",
    features: ["2 Professional Cleanings", "Standard Kitchen & Bath", "Vacuum & Mop All Floors", "Dusting & Trash Removal"],
    color: "slate",
    recommended: false
  },
  {
    name: "Premium Purity",
    price: "3,999",
    period: "/mo",
    description: "Our most popular plan for families and high-traffic homes.",
    features: ["4 Professional Cleanings", "Priority Dispatch (10-min arrival)", "Deep Sanitization", "Eco-Friendly Supplies Included", "Interior Window Cleaning"],
    color: "indigo",
    recommended: true
  },
  {
    name: "Elite Estate",
    price: "8,999",
    period: "/mo",
    description: "Ultimate care for large homes and luxury spaces.",
    features: ["8 Professional Cleanings", "24/7 Dedicated Support", "Specialist Furniture Care", "Appliance Deep Clean", "Upholstery Sanitization"],
    color: "violet",
    recommended: false
  }
];

export default function SubscriptionsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans py-20 px-6">
      <div className="max-w-7xl mx-auto text-center mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest border border-indigo-500/20 mb-8"
        >
          <Zap size={14} className="fill-current" />
          SaaS Subscriptions Now Live
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black mb-8 text-gradient">
          A Clean Home, <br />
          <span className="text-indigo-500">On Autopilot.</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Save up to 30% with our subscription plans. Professional care, scheduled 
          regularly, so you never have to think about cleaning again.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`
              relative glass-panel rounded-[3rem] p-10 flex flex-col border-2 transition-all duration-500
              ${plan.recommended ? 'border-indigo-500 bg-indigo-500/5 animate-glow' : 'border-slate-800/50'}
              ${selectedPlan === plan.name ? 'scale-[1.02] border-indigo-500' : 'hover:scale-[1.01] hover:border-slate-700'}
            `}
            onClick={() => setSelectedPlan(plan.name)}
          >
            {plan.recommended && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                Most Popular
              </div>
            )}

            <div className="mb-10">
              <h3 className="text-2xl font-black mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-black">₹{plan.price}</span>
                <span className="text-slate-500 font-bold">{plan.period}</span>
              </div>
              <p className="text-slate-400 font-medium text-sm leading-relaxed">{plan.description}</p>
            </div>

            <div className="space-y-4 mb-12 flex-1">
              {plan.features.map(feature => (
                <div key={feature} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${plan.recommended ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-sm font-bold text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className={`
                w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-2
                ${plan.recommended ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-slate-800 text-white hover:bg-slate-700'}
              `}
            >
              Get Started <ArrowRight size={20} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Trust Badges */}
      <div className="max-w-4xl mx-auto mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">Insured</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Clock size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">24/7 Support</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Star size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">Top Rated</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Sparkles size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest">Satisfaction</span>
        </div>
      </div>
    </div>
  );
}
