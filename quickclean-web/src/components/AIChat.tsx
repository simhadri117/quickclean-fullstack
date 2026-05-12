"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Zap, Bot, User, Sparkles, Loader2 } from 'lucide-react';

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hi! I'm your QuickClean Assistant. How can I help you sparkle today? ✨" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMsg = message;
    setMessage('');
    setHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: history.slice(-5) })
      });
      const data = await res.json();
      setHistory(prev => [...prev, { role: 'assistant', content: data.reply || data.error }]);
    } catch (err) {
      setHistory(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again later!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl z-[1000] cursor-pointer"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-indigo-400 rounded-full -z-10"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] glass-panel rounded-[2.5rem] flex flex-col z-[1000] overflow-hidden border-indigo-500/30"
          >
            {/* Header */}
            <div className="p-6 bg-indigo-600/10 border-b border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="font-black text-white">AI Concierge</h3>
                <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini 3.1 Live
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {history.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                    {msg.content}
                    {msg.role === 'assistant' && msg.content.includes('₹') && (
                      <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Checkout Required</p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-lg font-black text-white">
                            {msg.content.match(/₹\d+/)?.[0] || 'Total Amount'}
                          </span>
                          <button 
                            onClick={() => window.location.href = '/checkout'}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                          >
                            PAY NOW
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700">
                    <Loader2 size={18} className="animate-spin text-indigo-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-slate-800">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="p-4 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors text-white"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
