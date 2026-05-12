"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Loader2, LayoutDashboard, Users, Briefcase, Activity, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      
      // Basic client-side admin check (in production, use Firebase Custom Claims)
      // For this demo, we allow it to render if logged in, but backend/rules enforce write access.
      setIsAdmin(true);
      setIsLoading(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;

    // Listen to all bookings in real-time
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bks: any[] = [];
      snapshot.forEach((doc) => {
        bks.push({ id: doc.id, ...doc.data() });
      });
      setBookings(bks);
    }, (error) => {
      console.error("Admin Firestore error (Check Indexes!):", error);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: newStatus
      });
      // The UI will update instantly due to onSnapshot!
    } catch (error) {
      alert("Failed to update status. Check your admin permissions.");
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  const activeBookings = bookings.filter(b => ['FINDING_WORKER', 'ASSIGNED', 'EN_ROUTE'].includes(b.status));
  const totalRevenue = bookings.filter(b => b.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar / Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Admin Center</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-slate-400">Live Status:</span>
            <span className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Active Jobs</h3>
              <Activity className="text-indigo-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-extrabold">{activeBookings.length}</p>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Total Bookings</h3>
              <Briefcase className="text-blue-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-extrabold">{bookings.length}</p>
          </div>
          
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">Completed Revenue</h3>
              <CheckCircle2 className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-3xl font-extrabold">₹{totalRevenue}</p>
          </div>

          <div className="bg-indigo-600 border border-indigo-500 p-6 rounded-2xl shadow-xl shadow-indigo-600/20 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-indigo-200 font-medium">Push Notifications</h3>
              <Users className="text-white w-5 h-5" />
            </div>
            <p className="text-sm text-indigo-100 mt-2">
              FCM is connected. Cleaners will automatically receive alerts via the background dispatcher.
            </p>
          </div>
        </div>

        {/* Live Bookings Table */}
        <h2 className="text-xl font-bold mb-6">Real-Time Dispatch Board</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700 text-slate-400 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID / Service</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Worker</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No bookings found.</td>
                  </tr>
                )}
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200 mb-1">{booking.service?.name || "Unknown"}</div>
                      <div className="text-xs text-slate-500 font-mono">{booking.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-slate-400" title={booking.address}>
                      {booking.address}
                    </td>
                    <td className="px-6 py-4">
                      {booking.status === 'FINDING_WORKER' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20"><Clock className="w-3 h-3"/> Pending</span>}
                      {booking.status === 'ASSIGNED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">Assigned</span>}
                      {booking.status === 'COMPLETED' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"><CheckCircle2 className="w-3 h-3"/> Done</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {booking.cleaner?.name || <span className="text-slate-600 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {booking.status === 'FINDING_WORKER' && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, 'ASSIGNED')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          Force Assign
                        </button>
                      )}
                      {booking.status === 'ASSIGNED' && (
                        <button 
                          onClick={() => handleUpdateStatus(booking.id, 'COMPLETED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
