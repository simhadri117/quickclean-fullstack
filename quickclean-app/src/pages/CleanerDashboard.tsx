import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { Truck, CheckCircle2, DollarSign, Clock, Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  earnings: number;
  completedJobs: number;
  hoursOnline: number;
}

interface Job {
  id: string;
  address: string;
  createdAt: string;
  service: {
    name: string;
    price: number;
  };
}

const CleanerDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData(user.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchData = async (uid: string) => {
    try {
      // 1. Fetch all services to map IDs to names and prices
      const servicesSnap = await getDocs(collection(db, 'services'));
      const servicesMap: Record<string, any> = {};
      servicesSnap.forEach(d => {
        servicesMap[d.id] = d.data();
      });

      // 2. Fetch available jobs (status = pending and no cleanerId)
      const availableQuery = query(collection(db, 'bookings'), where('status', '==', 'pending'));
      const availableSnap = await getDocs(availableQuery);
      const availableJobs: Job[] = [];
      
      availableSnap.forEach(d => {
        const data = d.data();
        if (!data.cleanerId) {
          const srv = servicesMap[data.serviceId] || { name: 'Unknown Service', price: 0 };
          availableJobs.push({
            id: d.id,
            address: data.address,
            createdAt: data.timestamp?.toMillis ? new Date(data.timestamp.toMillis()).toISOString() : new Date().toISOString(),
            service: { name: srv.name, price: srv.price }
          });
        }
      });

      // 3. Fetch cleaner stats (jobs assigned to this cleaner)
      const myJobsQuery = query(collection(db, 'bookings'), where('cleanerId', '==', uid));
      const myJobsSnap = await getDocs(myJobsQuery);
      let earnings = 0;
      let completedJobs = 0;

      myJobsSnap.forEach(d => {
        const data = d.data();
        if (data.status === 'COMPLETED' || data.status === 'completed') {
          completedJobs++;
          const srv = servicesMap[data.serviceId];
          if (srv) earnings += Math.round(srv.price * 0.7); // 70% payout
        }
      });

      setStats({
        earnings,
        completedJobs,
        hoursOnline: Math.floor(Math.random() * 4) + 1 // Mock hours online
      });
      setJobs(availableJobs);
    } catch (err) {
      console.error('Error fetching cleaner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (jobId: string) => {
    setIsAccepting(jobId);
    try {
      if (!auth.currentUser) return navigate('/login');

      const jobRef = doc(db, 'bookings', jobId);
      await updateDoc(jobRef, {
        status: 'ACCEPTED',
        cleanerId: auth.currentUser.uid
      });
      
      await fetchData(auth.currentUser.uid);
      alert('Job Accepted! Please proceed to the address.');
    } catch (err) {
      console.error(err);
      alert('Failed to accept job. It might have been taken.');
    } finally {
      setIsAccepting(null);
    }
  };

  if (loading) return <div className="page-loader"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="container min-h-screen bg-slate-50 p-6 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black font-outfit text-slate-900 mb-2">Partner Hub</h1>
            <p className="text-slate-500 font-medium">Maximize your earnings today</p>
          </div>
          <button 
            onClick={() => { auth.signOut().then(() => navigate('/login')); }}
            className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-slate-100 hover:bg-red-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-lg">
              JS
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 leading-tight">John S.</p>
              <p className="text-xs text-red-500 font-bold group-hover:text-red-700">Logout</p>
            </div>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-indigo-200 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110"></div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 relative">
              <DollarSign size={24} />
            </div>
            <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">Earnings Today</p>
            <h2 className="text-4xl font-black text-slate-900">₹{stats?.earnings || 0}</h2>
          </div>
          
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-amber-200 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110"></div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 relative">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">Jobs Done</p>
            <h2 className="text-4xl font-black text-slate-900">{stats?.completedJobs || 0}</h2>
          </div>

          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 opacity-40 transition-transform group-hover:scale-110"></div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-6 relative">
              <Clock size={24} />
            </div>
            <p className="text-slate-400 font-bold text-sm mb-1 uppercase tracking-wider">Time Online</p>
            <h2 className="text-4xl font-black text-slate-900">{stats?.hoursOnline || 0}h</h2>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h3 className="font-black text-2xl text-slate-900 font-outfit">Live Jobs Near You</h3>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-black uppercase tracking-tighter">Searching for tasks...</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div key={job.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 border border-slate-100">
                    <Truck size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest italic animate-pulse">New Request</span>
                       <span className="text-xs font-bold text-slate-400">• Recently posted</span>
                    </div>
                    <h4 className="font-black text-xl text-slate-900 mb-1">{job.service.name}</h4>
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                      <MapPin size={14} className="text-primary" />
                      <p className="text-sm font-bold">{job.address || 'HSR Layout, Sector 7'}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-400">Payout: <span className="text-green-600 text-lg">₹{Math.round(job.service.price * 0.7)}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => handleAccept(job.id)}
                  disabled={!!isAccepting}
                  className="btn btn-primary px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 flex items-center justify-center min-w-[160px]"
                >
                  {isAccepting === job.id ? <Loader2 className="animate-spin" size={24} /> : 'Accept Job'}
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                 <Truck size={40} />
               </div>
               <h4 className="font-black text-2xl text-slate-800">Relaxing Moment!</h4>
               <p className="text-slate-400 font-bold mt-2 max-w-sm mx-auto">We're checking for new requests every few seconds. Stay tuned.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CleanerDashboard;
