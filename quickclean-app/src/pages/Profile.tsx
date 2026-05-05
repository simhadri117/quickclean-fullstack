import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, CalendarRange, Sparkles, CreditCard, Settings, LogOut,
  Search, Bell, MapPin, Phone, Edit2, CheckCircle2, Clock, XCircle,
  Calendar, User, ChevronRight, TrendingUp, Save, Camera, CreditCard as CardIcon, Loader2
} from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface Booking {
  id: string;
  createdAt: string;
  status: string;
  totalPrice: number;
  serviceId?: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{type: 'cancel' | 'reschedule', bookingId: string} | null>(null);
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [updating, setUpdating] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveNav(location.state.activeTab);
    }
  }, [location.state]);

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
        const data = userDoc.data();
        setUser(data);
        setEditForm({
          name: data.name || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), editForm);
      setUser((prev: any) => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const setupRealtimeBookings = (uid: string) => {
    const q = query(collection(db, 'bookings'), where('userId', '==', uid));
    
    return onSnapshot(q, async (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
      
      data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      const enrichedData = await Promise.all(data.map(async (booking) => {
        let serviceInfo = { name: 'Cleaning Service', icon: '🧹', price: 0 };
        if (booking.serviceId) {
          const serviceDoc = await getDoc(doc(db, 'services', booking.serviceId));
          if (serviceDoc.exists()) serviceInfo = serviceDoc.data() as any;
        }
        return {
          id: booking.id,
          createdAt: booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toISOString() : new Date().toISOString(),
          status: booking.status || 'pending',
          totalPrice: serviceInfo.price || 0,
          service: { name: serviceInfo.name, icon: serviceInfo.icon }
        };
      }));
      
      setBookings(enrichedData);
      setLoading(false);
    }, (error) => {
      console.error("Real-time bookings error:", error);
      setLoading(false);
    });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleAction = async () => {
    if (!selectedAction) return;
    try {
      if (selectedAction.type === 'cancel') {
        const bookingRef = doc(db, 'bookings', selectedAction.bookingId);
        await updateDoc(bookingRef, { status: 'cancelled' });
      } else if (selectedAction.type === 'reschedule') {
        alert("Reschedule logic would open a date picker here.");
      }
    } catch (err) {
      console.error("Failed to update booking", err);
    } finally {
      setIsModalOpen(false);
      setSelectedAction(null);
    }
  };

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Initialize months with 0
    const data = months.map(name => ({ name, spend: 0, count: 0 }));
    
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        data[monthIndex].spend += (Number(booking.totalPrice) || 0);
        data[monthIndex].count += 1;
      }
    });
    
    return data;
  }, [bookings]);

  const stats = useMemo(() => {
    const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const completed = bookings.filter(b => b.status === 'completed').length;
    const active = bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length;
    return {
      totalSpent,
      totalBookings: bookings.length,
      completed,
      active
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 p-4 gap-4">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 glass-card p-6 gap-4" style={{ background: 'var(--color-surface)', height: 'calc(100vh - 32px)' }}>
          <Skeleton height="40px" width="100%" />
          <div className="mt-8 flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} height="48px" width="100%" borderRadius="16px" />)}
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex justify-between items-center px-4">
            <Skeleton height="32px" width="240px" />
            <Skeleton height="44px" width="44px" borderRadius="50%" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} height="140px" width="100%" borderRadius="24px" />)}
          </div>
          
          <div className="px-4">
            <Skeleton height="320px" width="100%" borderRadius="24px" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            <Skeleton height="400px" width="100%" borderRadius="24px" />
            <Skeleton height="400px" width="100%" borderRadius="24px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row overflow-hidden selection:bg-pink-500/30">
      
      {/* --- LEFT SIDEBAR (Deep Purple) --- */}
      <aside className="hidden md:flex flex-col w-[280px] bg-gradient-to-b from-[#2a1b54] to-[#1a103c] border-r border-indigo-900/30 p-6 z-20 shadow-2xl relative text-white">
        <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate('/home')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">Q</div>
          <span className="text-xl font-bold tracking-tight text-white">QuickClean</span>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-4 mb-10 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
           <div className="relative">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-400 to-blue-500 p-[2px]">
               <div className="w-full h-full bg-[#2a1b54] rounded-full flex items-center justify-center font-bold text-lg text-white">
                 {user?.name?.charAt(0) || 'U'}
               </div>
             </div>
             <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-[#2a1b54] rounded-full"></div>
           </div>
           <div>
             <h3 className="font-semibold text-sm truncate w-32 text-white">{user?.name || 'Customer'}</h3>
             <p className="text-[10px] text-green-300 font-medium">Premium Account</p>
           </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarNav icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeNav === 'dashboard'} onClick={() => setActiveNav('dashboard')} />
          <SidebarNav icon={<CalendarRange size={20}/>} label="My Bookings" active={activeNav === 'bookings'} onClick={() => setActiveNav('bookings')} badge={stats.active > 0 ? stats.active : undefined} />
          <SidebarNav icon={<CardIcon size={20}/>} label="Payments" active={activeNav === 'payments'} onClick={() => setActiveNav('payments')} />
          <SidebarNav icon={<Settings size={20}/>} label="Settings" active={activeNav === 'settings'} onClick={() => setActiveNav('settings')} />
          <SidebarNav icon={<Sparkles size={20}/>} label="Book Service" active={false} onClick={() => navigate('/home')} />
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/50 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Top Header - Hidden on mobile because shared header is present */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="md:hidden w-8 h-8 bg-gradient-to-tr from-pink-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold" onClick={() => navigate('/home')}>Q</div>
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="relative hidden sm:block">
               <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="Search anything..." className="bg-slate-100 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 w-72 text-slate-700 placeholder-slate-400 transition-all" />
             </div>
             <button className="relative p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition-colors">
               <Bell size={20} />
               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-pink-500 border-2 border-white rounded-full"></span>
             </button>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-blue-500 flex items-center justify-center font-bold text-sm text-white shadow-md md:hidden">
                {user?.name?.charAt(0) || 'U'}
             </div>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar bg-slate-50">
          <div className="max-w-[1600px] mx-auto">
             
             {/* DASHBOARD TAB */}
             {activeNav === 'dashboard' && (
               <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fade-up">
                 <div className="xl:col-span-8 space-y-8">
                
                {/* 4 Financial Report Widgets with Progress Rings */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <StatCard 
                    title="Total Bookings" 
                    value={stats.totalBookings} 
                    icon={<LayoutDashboard size={20} className="text-pink-500"/>} 
                    trend="+12%" 
                    progress={75}
                    color="pink"
                  />
                  <StatCard 
                    title="Active Tasks" 
                    value={stats.active} 
                    icon={<CalendarRange size={20} className="text-blue-500"/>} 
                    trend="Active" 
                    progress={30}
                    color="blue"
                  />
                  <StatCard 
                    title="Completed" 
                    value={stats.completed} 
                    icon={<CheckCircle2 size={20} className="text-emerald-500"/>} 
                    trend="Finished" 
                    progress={90}
                    color="emerald"
                  />
                  <StatCard 
                    title="Total Spent" 
                    value={`₹${stats.totalSpent}`} 
                    icon={<CreditCard size={20} className="text-purple-500"/>} 
                    trend="+5%" 
                    progress={60}
                    color="purple"
                  />
                </div>

                {/* Central Fluid Area Chart */}
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Financial Overview</h3>
                      <p className="text-sm text-slate-400 mt-1">Monthly expenditure & bookings</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-400"></span> Bookings
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mr-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Spend
                      </div>
                      <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 cursor-pointer font-medium">
                        <option>This Year</option>
                        <option>Last Year</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Real Line Chart - Monthly Spend */}
                  <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}}
                          dy={10}
                        />
                        <YAxis hide domain={[0, 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          itemStyle={{ fontWeight: 'bold' }}
                          formatter={(value) => [`₹${value}`, 'Spending']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="spend" 
                          stroke="#ec4899" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSpend)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Core Bookings Section */}
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Recent Service Requests</h3>
                    <button className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">View All <ChevronRight size={16}/></button>
                  </div>
                  
                  <div className="space-y-4">
                    {bookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-md transition-all gap-4 sm:gap-0 group">
                        
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 shrink-0 group-hover:scale-105 transition-transform">
                            {booking.service.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{booking.service.name}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Calendar size={14}/> {new Date(booking.createdAt).toLocaleDateString()}</span>
                              <span className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5"><User size={14}/> Unassigned</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end sm:w-1/2 gap-6">
                           <StatusBadge status={booking.status} />
                           
                           <div className="flex gap-2">
                             {['pending', 'confirmed'].includes(booking.status) ? (
                               <>
                                 <button onClick={() => { setSelectedAction({type: 'reschedule', bookingId: booking.id}); setIsModalOpen(true); }} className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-slate-600 shadow-sm">
                                   Reschedule
                                 </button>
                                 <button onClick={() => { setSelectedAction({type: 'cancel', bookingId: booking.id}); setIsModalOpen(true); }} className="px-4 py-2 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors shadow-sm">
                                   Cancel
                                 </button>
                               </>
                             ) : (
                               <button className="px-6 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors shadow-md">
                                 Details
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                    ))}

                    {bookings.length === 0 && (
                      <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <CalendarRange size={40} className="mx-auto text-slate-300 mb-4" />
                        <h4 className="text-slate-600 font-bold text-lg">No recent bookings</h4>
                        <p className="text-slate-400 text-sm mt-1">When you book a service, it will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>

             </div>

             {/* RIGHT COLUMN (Context Data) */}
             <div className="xl:col-span-4 space-y-8">
                
                {/* Notification Panel (Vibrant Pink Gradient Cards) */}
                <div className="bg-gradient-to-br from-[#f83a7c] to-[#ff7a59] rounded-3xl p-8 shadow-[0_10px_40px_-10px_rgba(248,58,124,0.5)] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <h3 className="text-xl font-bold">Action Needed</h3>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Bell size={16} />
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 hover:bg-white/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">New Offer</span>
                        <span className="text-xs text-white/80">Just now</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">Get 20% off Deep Cleaning</h4>
                      <p className="text-sm text-white/80 leading-relaxed">Book a deep cleaning service today and claim your exclusive discount.</p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 hover:bg-white/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">System</span>
                        <span className="text-xs text-white/80">2h ago</span>
                      </div>
                      <h4 className="font-bold mb-1">Worker Assigned</h4>
                      <p className="text-sm text-white/80 leading-relaxed">John D. has been assigned to your upcoming cleaning schedule.</p>
                    </div>
                  </div>
                </div>

                {/* Profile Summary Card (Clean White) */}
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-pink-500 to-blue-500 p-1.5 shadow-xl">
                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-4xl text-slate-800">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <button className="absolute bottom-1 right-1 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <Edit2 size={14} />
                      </button>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800">{user?.name || 'Customer Profile'}</h3>
                    <span className="text-xs font-bold text-pink-500 bg-pink-50 px-3 py-1 rounded-full mt-2 mb-8 border border-pink-100">Premium Member</span>
                    
                    <div className="w-full space-y-4 mb-8">
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                          <Phone size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Phone Number</p>
                          <p className="text-sm font-bold text-slate-700">{user?.phone || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                          <MapPin size={18} className="text-pink-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Address</p>
                          <p className="text-sm font-bold text-slate-700 leading-tight">{user?.address || 'No address set. Update profile.'}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveNav('settings')}
                      className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Settings size={18} /> Manage Account
                    </button>
                  </div>
                </div>

                 </div>
               </div>
             )}

             {/* BOOKINGS TAB */}
             {activeNav === 'bookings' && (
               <div className="space-y-8 animate-fade-up max-w-4xl mx-auto">
                 <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                   <div className="flex justify-between items-center mb-8">
                     <h3 className="text-2xl font-bold text-slate-800">Booking History</h3>
                     <div className="flex gap-2">
                        <button className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-xs font-bold border border-pink-100">All</button>
                        <button className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold border border-slate-100">Pending</button>
                        <button className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold border border-slate-100">Completed</button>
                     </div>
                   </div>
                   <div className="space-y-4">
                     {bookings.map((booking) => (
                       <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-md transition-all gap-4 group">
                         <div className="flex items-center gap-5">
                           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 shrink-0">
                             {booking.service.icon}
                           </div>
                           <div>
                             <h4 className="font-bold text-slate-800 text-lg">{booking.service.name}</h4>
                             <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5"><Calendar size={14}/> {new Date(booking.createdAt).toLocaleDateString()}</p>
                           </div>
                         </div>
                         <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                           <div className="text-right">
                             <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Amount</p>
                             <p className="text-lg font-black text-slate-800">₹{booking.totalPrice}</p>
                           </div>
                           <StatusBadge status={booking.status} />
                           <button className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-xl transition-colors">
                             <ChevronRight size={20} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             )}

             {/* SETTINGS TAB */}
             {activeNav === 'settings' && (
               <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
                 <div className="bg-white border border-slate-100 rounded-[32px] p-10 shadow-sm">
                   <div className="flex items-center justify-between mb-10">
                     <h3 className="text-2xl font-bold text-slate-800">Account Settings</h3>
                     <button 
                       onClick={() => setIsEditing(!isEditing)}
                       className="px-6 py-2.5 rounded-2xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
                     >
                       {isEditing ? <XCircle size={18}/> : <Edit2 size={18}/>}
                       {isEditing ? 'Cancel' : 'Edit Profile'}
                     </button>
                   </div>

                   <div className="space-y-8">
                     <div className="flex flex-col items-center mb-10">
                        <div className="relative group">
                          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-pink-500 to-blue-500 p-1 shadow-2xl">
                             <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-bold text-5xl text-slate-800">
                               {user?.name?.charAt(0) || 'U'}
                             </div>
                          </div>
                          <button className="absolute bottom-1 right-1 w-10 h-10 bg-white text-slate-800 rounded-full flex items-center justify-center shadow-xl border border-slate-100 group-hover:scale-110 transition-transform">
                            <Camera size={18} />
                          </button>
                        </div>
                        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Photo</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-xs font-black text-slate-400 uppercase ml-1">Full Name</label>
                           <input 
                             disabled={!isEditing}
                             value={editForm.name}
                             onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 disabled:opacity-50 transition-all font-bold text-slate-700"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black text-slate-400 uppercase ml-1">Phone Number</label>
                           <input 
                             disabled={!isEditing}
                             value={editForm.phone}
                             onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                             className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 disabled:opacity-50 transition-all font-bold text-slate-700"
                           />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                           <label className="text-xs font-black text-slate-400 uppercase ml-1">Primary Address</label>
                           <textarea 
                             disabled={!isEditing}
                             value={editForm.address}
                             onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                             rows={3}
                             className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500/50 disabled:opacity-50 transition-all font-bold text-slate-700 resize-none"
                           />
                        </div>
                     </div>

                     {isEditing && (
                       <button 
                         onClick={handleUpdateProfile}
                         disabled={updating}
                         className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-black text-lg shadow-xl shadow-pink-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 mt-8"
                       >
                         {updating ? <Loader2 size={24} className="animate-spin"/> : <Save size={24}/>}
                         {updating ? 'Saving...' : 'Save Changes'}
                       </button>
                     )}
                   </div>
                 </div>

                 <div className="bg-red-50 border border-red-100 rounded-3xl p-8 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-red-600">Danger Zone</h4>
                      <p className="text-xs text-red-500 font-medium">Permanently delete your account and all data.</p>
                    </div>
                    <button className="px-6 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors">
                      Delete Account
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV removed - using shared Navigation component */}

      {/* MODAL overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-fade-up">
            <h3 className="text-2xl font-bold text-slate-800 mb-3 capitalize">{selectedAction?.type} Booking</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Are you sure you want to {selectedAction?.type} this service? This action cannot be undone.</p>
            <div className="flex gap-4">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Go Back</button>
               <button onClick={handleAction} className={`flex-1 py-3 text-sm font-bold rounded-xl shadow-md transition-all text-white ${selectedAction?.type === 'cancel' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}>
                 Confirm
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- HELPER COMPONENTS ---

function SidebarNav({ icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all font-medium ${active ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-3.5 text-sm">
        {icon} <span>{label}</span>
      </div>
      {badge && <span className="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">{badge}</span>}
    </button>
  );
}


function StatCard({ title, value, icon, trend, progress, color }: any) {
  // Simple circular progress calculation
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colorMap: any = {
    pink: { text: 'text-pink-500', bg: 'bg-pink-50', stroke: '#ec4899' },
    blue: { text: 'text-blue-500', bg: 'bg-blue-50', stroke: '#3b82f6' },
    emerald: { text: 'text-emerald-500', bg: 'bg-emerald-50', stroke: '#10b981' },
    purple: { text: 'text-purple-500', bg: 'bg-purple-50', stroke: '#8b5cf6' },
  };
  const theme = colorMap[color] || colorMap.pink;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between h-40">
      <div className="flex justify-between items-start w-full">
        <div className={`p-3 rounded-2xl ${theme.bg}`}>
          {icon}
        </div>
        {/* Progress Ring */}
        <div className="relative w-12 h-12">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4" />
            <circle cx="22" cy="22" r={radius} fill="none" stroke={theme.stroke} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-slate-600">{progress}%</span>
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 flex items-center gap-1`}>
            <TrendingUp size={10} /> {trend}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400">{title}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const baseClasses = "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5";
  if (s === 'completed') return <span className={`${baseClasses} bg-emerald-50 text-emerald-600`}><CheckCircle2 size={14}/> {status}</span>;
  if (s === 'cancelled') return <span className={`${baseClasses} bg-red-50 text-red-600`}><XCircle size={14}/> {status}</span>;
  if (s === 'confirmed') return <span className={`${baseClasses} bg-blue-50 text-blue-600`}><Sparkles size={14}/> {status}</span>;
  return <span className={`${baseClasses} bg-purple-50 text-purple-600`}><Clock size={14}/> {status}</span>;
}
