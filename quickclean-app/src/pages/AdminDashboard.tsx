import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Users, ShoppingBag, DollarSign, 
  ArrowLeft, Download, Filter, 
  BarChart3, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface Stats {
  totalRevenue: number;
  totalBookings: number;
  newUsers: number;
  activeBookings: number;
}

interface ServiceData {
  name: string;
  value: number;
}

const COLORS = ['#00B3A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      
      let totalRevenue = 0;
      let totalBookings = 0;
      let activeBookings = 0;

      bookingsSnap.forEach((docSnap) => {
        const b = docSnap.data();
        totalBookings++;
        if (b.status === 'pending' || b.status === 'assigned') activeBookings++;
        if (b.paymentStatus === 'paid') {
          totalRevenue += 500; // Mock average if not stored directly
        }
      });

      setStats({
        totalRevenue,
        totalBookings,
        newUsers: 12, // Mock for demo
        activeBookings
      });
      
      setServiceData([
        { name: 'Quick Sweep & Mop', value: 45 },
        { name: 'Kitchen Regular', value: 30 },
        { name: 'Bathroom Wash', value: 15 },
        { name: 'Post-Party Cleanup', value: 10 }
      ]);
      
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mock revenue history for the chart (In a real app, this would come from an endpoint)
  const revenueHistory = [
    { day: 'Mon', revenue: 4200 },
    { day: 'Tue', revenue: 5800 },
    { day: 'Wed', revenue: 5100 },
    { day: 'Thu', revenue: 7200 },
    { day: 'Fri', revenue: 8900 },
    { day: 'Sat', revenue: 10400 },
    { day: 'Sun', revenue: 9500 },
  ];

  if (loading) return <div className="page-loader"><div className="loader-spinner" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Intel Dashboard</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">QuickClean Platform v2.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
            <Filter size={16} />
            Last 7 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary-light transition-all">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="px-8 py-10 max-w-7xl mx-auto">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <KpiCard 
            title="Total Revenue" 
            value={`₹${stats?.totalRevenue?.toLocaleString()}`} 
            change="+12.5%" 
            icon={<DollarSign size={24} className="text-emerald-500" />}
            color="emerald"
          />
          <KpiCard 
            title="Total Bookings" 
            value={stats?.totalBookings || 0} 
            change="+8.2%" 
            icon={<ShoppingBag size={24} className="text-blue-500" />}
            color="blue"
          />
          <KpiCard 
            title="New Users" 
            value={stats?.newUsers || 0} 
            change="+18.7%" 
            icon={<Users size={24} className="text-amber-500" />}
            color="amber"
          />
          <KpiCard 
            title="Active Jobs" 
            value={stats?.activeBookings || 0} 
            change="⚡ LIVE" 
            icon={<Activity size={24} className="text-fuchsia-500" />}
            color="fuchsia"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                Revenue Trajectory
              </h3>
              <div className="flex bg-gray-50 p-1 rounded-lg">
                <button className="px-3 py-1 text-xs font-bold text-gray-500 bg-white rounded shadow-sm">Revenue</button>
                <button className="px-3 py-1 text-xs font-bold text-gray-400">Bookings</button>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueHistory}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00B3A6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00B3A6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 700}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94A3B8', fontSize: 12, fontWeight: 700}}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                    itemStyle={{fontWeight: 800, color: '#00B3A6'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#00B3A6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Mix */}
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-800 mb-8 flex items-center gap-2">
              <PieChartIcon size={20} className="text-secondary" />
              Service Popularity
            </h3>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData.length > 0 ? serviceData : [{name: 'No Data', value: 1}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Market Insights</p>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-sm font-semibold">
                🔔 <span className="font-black">Observation</span>: Premium Car Wash bookings are up 40% compared to last week.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ 
  title: string; 
  value: string | number; 
  change: string; 
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, change, icon, color }) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-6">
      <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className={`text-xs font-black px-2 py-1 bg-${color === 'emerald' ? 'green' : color}-50 text-${color === 'emerald' ? 'green' : color}-600 rounded-full`}>
        {change}
      </span>
    </div>
    <h4 className="text-sm font-bold text-gray-400 mb-1">{title}</h4>
    <p className="text-3xl font-black text-gray-900 tracking-tighter">{value}</p>
  </div>
);

export default AdminDashboard;
