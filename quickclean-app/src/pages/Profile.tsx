import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, CalendarRange, Sparkles, CreditCard, Settings, LogOut,
  Search, Bell, MapPin, Phone, Edit2, CheckCircle2, XCircle,
  Loader2, Zap, ArrowUpRight, Activity, Briefcase
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';

interface Booking {
  id: string;
  createdAt: string;
  status: string;
  totalPrice: number;
  service: {
    name: string;
    icon: string;
  };
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        fetchProfile(currentUser.uid);
        setupRealtimeBookings(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubAuth();
  }, [navigate]);

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUser(userDoc.data());
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const setupRealtimeBookings = (uid: string) => {
    const q = query(collection(db, 'bookings'), where('userId', '==', uid));
    return onSnapshot(q, async (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      const enrichedData = await Promise.all(data.map(async (booking) => {
        let serviceInfo = { name: 'Premium Service', icon: '✨', price: 299 };
        if (booking.serviceId) {
          const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
          if (serviceDoc.exists()) serviceInfo = serviceDoc.data() as any;
        }
        return {
          id: booking.id,
          createdAt: booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toISOString() : new Date().toISOString(),
          status: booking.status || 'pending',
          totalPrice: booking.price || serviceInfo.price,
          service: { name: booking.serviceName || serviceInfo.name, icon: booking.serviceIcon || serviceInfo.icon }
        };
      }));
      
      setBookings(enrichedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
  };

  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const completed = bookings.filter(b => b.status === 'completed').length;
    const active = bookings.filter(b => ['pending', 'confirmed', 'progress'].includes(b.status)).length;
    return { totalSpent, totalBookings: bookings.length, completed, active };
  }, [bookings]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({ name: m, spend: Math.floor(Math.random() * 5000) + 1000 }));
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* ─── FUTURISTIC SIDEBAR ─── */}
      <aside className="hidden md:flex flex-col w-72 bg-[#1E293B]/50 backdrop-blur-2xl border-r border-white/5 p-8 z-20">
        <div className="flex items-center gap-3 mb-12 cursor-pointer" onClick={() => navigate('/home')}>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10 overflow-hidden p-1">
            <img src="/logo192.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">QuickClean</span>
        </div>

        <div className="mb-10 p-5 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center font-black text-lg border-2 border-indigo-400/50">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-sm truncate">{user?.name || 'Customer'}</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Premium Member</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeNav === 'dashboard'} onClick={() => setActiveNav('dashboard')} />
          <SidebarItem icon={<CalendarRange size={20}/>} label="My Bookings" active={activeNav === 'bookings'} onClick={() => setActiveNav('bookings')} badge={stats.active} />
          <SidebarItem icon={<Sparkles size={20}/>} label="Services" active={false} onClick={() => navigate('/home')} />
          <SidebarItem icon={<CreditCard size={20}/>} label="Payments" active={activeNav === 'payments'} onClick={() => setActiveNav('payments')} />
          <SidebarItem icon={<Bell size={20}/>} label="Notifications" active={activeNav === 'notif'} onClick={() => setActiveNav('notif')} />
          <SidebarItem icon={<Settings size={20}/>} label="Settings" active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} />
        </nav>

        <button onClick={() => signOut(auth)} className="mt-auto flex items-center gap-3 px-6 py-4 text-sm font-bold text-slate-300 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all">
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-3xl font-black tracking-tight capitalize">{activeNav}</h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Search analytics..." className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-80" />
            </div>
            <button className="p-3 bg-white/5 rounded-xl text-slate-200 hover:text-white transition-colors relative">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-indigo-500 border-2 border-[#0F172A] rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          
          {/* Notifications Tab */}
          {activeNav === 'notif' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
              <div className="glass-panel rounded-[2.5rem] p-10 border-indigo-500/20">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black">Push Notifications</h3>
                  <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer p-1">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="font-bold">Booking Updates</p>
                      <p className="text-xs text-slate-300 font-bold uppercase">Real-time status changes</p>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full p-1"><div className="w-3 h-3 bg-white rounded-full ml-auto"></div></div>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="font-bold">Cleaner Arriving</p>
                      <p className="text-xs text-slate-300 font-bold uppercase">When pro is 2 mins away</p>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full p-1"><div className="w-3 h-3 bg-white rounded-full ml-auto"></div></div>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="font-bold text-emerald-400 flex items-center gap-2">WhatsApp Updates <img src="/logo192.png" alt="Logo" style={{ width: '12px', height: '12px', objectFit: 'contain' }} /></p>
                      <p className="text-xs text-slate-300 font-bold uppercase">Booking status via WhatsApp</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full p-1"><div className="w-3 h-3 bg-white rounded-full ml-auto"></div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 1. Analytics Overview */}
          {activeNav === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={<Briefcase />} color="indigo" growth="+12%" />
                <StatCard title="Active Services" value={stats.active} icon={<Activity />} color="purple" growth="Live" />
                <StatCard title="Completed" value={stats.completed} icon={<CheckCircle2 />} color="emerald" growth="94%" />
                <StatCard title="Total Spent" value={`₹${stats.totalSpent}`} icon={<CreditCard />} color="pink" growth="+5.2%" />
              </div>

              {/* 2. Chart & Profile Summary Row */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-8 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black">Booking Trends</h3>
                      <p className="text-sm text-slate-300 font-bold">Your activity over the last 6 months</p>
                    </div>
                    <div className="flex gap-2">
                      {['Week', 'Month', 'Year'].map(f => (
                        <button key={f} className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${f === 'Month' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} dy={10} />
                        <Tooltip contentStyle={{background: '#1e293b', border: 'none', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)'}} />
                        <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="xl:col-span-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-20 h-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center font-black text-3xl border border-white/20">
                        {user?.name?.charAt(0)}
                      </div>
                      <button className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl hover:bg-white/30 transition-all border border-white/10"><Edit2 size={18}/></button>
                    </div>
                    <h3 className="text-3xl font-black mb-1">{user?.name || 'Customer'}</h3>
                    <p className="text-indigo-200 font-bold text-sm mb-8">{user?.email}</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-black/10 p-4 rounded-2xl border border-white/5">
                        <Phone size={18} className="text-indigo-300"/>
                        <span className="text-sm font-bold">{user?.phone || '+91 98765 43210'}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-black/10 p-4 rounded-2xl border border-white/5">
                        <MapPin size={18} className="text-indigo-300"/>
                        <span className="text-sm font-bold truncate">{user?.address || 'Mumbai, Maharashtra'}</span>
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black mt-8 hover:bg-indigo-50 transition-all shadow-xl">Upgrade to Platinum</button>
                </div>
              </div>
            </>
          )}

          {activeNav === 'bookings' && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black">Recent History</h3>
                <button className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">View All Bookings</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-300 font-black text-xs uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="pb-6 px-4">Service</th>
                      <th className="pb-6 px-4">Date</th>
                      <th className="pb-6 px-4">Status</th>
                      <th className="pb-6 px-4">Price</th>
                      <th className="pb-6 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookings.slice(0, 5).map((booking) => (
                      <tr key={booking.id} className="group hover:bg-white/5 transition-all">
                        <td className="py-6 px-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/5 group-hover:scale-110 transition-transform">{booking.service.icon}</div>
                            <span className="font-bold">{booking.service.name}</span>
                          </div>
                        </td>
                        <td className="py-6 px-4 font-bold text-slate-200 text-sm">{new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="py-6 px-4"><StatusBadge status={booking.status} /></td>
                        <td className="py-6 px-4 font-black text-lg">₹{booking.totalPrice}</td>
                        <td className="py-6 px-4">
                          <div className="flex gap-2">
                            <button className="p-2 bg-white/5 rounded-xl hover:bg-indigo-500/20 text-slate-200 hover:text-indigo-400 transition-all"><ArrowUpRight size={18}/></button>
                            <button className="p-2 bg-white/5 rounded-xl hover:bg-red-500/20 text-slate-200 hover:text-red-400 transition-all"><XCircle size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#1E293B]/95 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
        <MobileNavItem icon={<LayoutDashboard size={20}/>} active={activeNav === 'dashboard'} onClick={() => setActiveNav('dashboard')} />
        <MobileNavItem icon={<CalendarRange size={20}/>} active={activeNav === 'bookings'} onClick={() => setActiveNav('bookings')} />
        <MobileNavItem icon={<img src="/logo192.png" alt="Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />} active={false} onClick={() => navigate('/home')} />
        <MobileNavItem icon={<Settings size={20}/>} active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} />
      </nav>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-300 hover:text-slate-300 hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-4">
        {icon} <span className="text-sm">{label}</span>
      </div>
      {badge > 0 && <span className="bg-indigo-400 text-[#0F172A] text-[10px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300'}`}>
      {icon}
    </button>
  );
}

function StatCard({ title, value, icon, color, growth }: any) {
  const colors: any = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };
  return (
    <motion.div whileHover={{ y: -5 }} className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl border ${colors[color]}`}>{icon}</div>
        <span className={`text-xs font-black px-2 py-1 rounded-lg ${growth.startsWith('+') ? 'bg-emerald-400/10 text-emerald-400' : 'bg-indigo-400/10 text-indigo-400'}`}>{growth}</span>
      </div>
      <h4 className="text-3xl font-black mb-1">{value}</h4>
      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{title}</p>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const base = "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border";
  if (s === 'completed') return <span className={`${base} bg-emerald-400/10 text-emerald-400 border-emerald-400/20`}>Completed</span>;
  if (s === 'cancelled') return <span className={`${base} bg-red-400/10 text-red-400 border-red-400/20`}>Cancelled</span>;
  if (s === 'pending') return <span className={`${base} bg-amber-400/10 text-amber-400 border-amber-400/20`}>Pending</span>;
  return <span className={`${base} bg-indigo-400/10 text-indigo-400 border-indigo-400/20`}>{status}</span>;
}
