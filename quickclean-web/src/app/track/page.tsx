"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { MapPin, Navigation, Clock, ShieldCheck, Phone, MessageSquare, ArrowLeft, Star, Calendar, Share2, ExternalLink, Zap, Loader2, MessageCircle } from "lucide-react";
import { GoogleMap, Marker, Polyline, TrafficLayer } from "@react-google-maps/api";
import { useMaps } from "@/lib/MapsProvider";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

const mapContainerStyle = { width: "100%", height: "100%" };
const SIMULATION_DURATION = 15000;

function Tracker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  const { isLoaded } = useMaps();

  const [user, setUser] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [eta, setEta] = useState(3);
  const [arrived, setArrived] = useState(false);
  const [cleanerPos, setCleanerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [cleanerName, setCleanerName] = useState("Partner");
  const [cleanerRating, setCleanerRating] = useState(4.9);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const startTimeRef = useRef(Date.now());
  const animationRef = useRef<number | null>(null);

  const generateCalendarLink = () => {
    const start = new Date().toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(Date.now() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const text = encodeURIComponent(`QuickClean: ${booking?.serviceName || "Service"}`);
    const details = encodeURIComponent(`Your cleaning professional is arriving soon. Track live: ${window.location.href}`);
    const location = encodeURIComponent(booking?.address || "");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else router.push("/login");
    });
    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!bookingId || !user) return;

    const unsubBooking = onSnapshot(doc(db, "bookings", bookingId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBooking({ id: docSnap.id, ...data });

        if (data.status?.toLowerCase() === "completed" || data.paymentStatus === "paid") {
          setArrived(true);
          setEta(0);
        }

        if (data.lat && data.lng) setUserPos({ lat: data.lat, lng: data.lng });

        const cleanerId = data.cleanerId || data.workerId;
        if (cleanerId) {
          const cleanerDoc = await getDoc(doc(db, "cleaners", cleanerId));
          if (cleanerDoc.exists()) {
            const d = cleanerDoc.data();
            setCleanerName(d.name || "Partner");
            setCleanerRating(d.rating || 4.9);
            if (d.lat && d.lng) setCleanerPos({ lat: d.lat, lng: d.lng });
          }
        }
      }
    });

    return () => unsubBooking();
  }, [bookingId, user]);

  // Simulation fallback if no real-time cleaner pos
  useEffect(() => {
    if (!isLoaded || cleanerPos || arrived || !userPos || !booking) return;

    const startPos = { lat: userPos.lat + 0.003, lng: userPos.lng + 0.002 };

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / SIMULATION_DURATION, 1);

      if (window.google) {
        const interpolated = google.maps.geometry.spherical.interpolate(
          new google.maps.LatLng(startPos.lat, startPos.lng),
          new google.maps.LatLng(userPos.lat, userPos.lng),
          progress
        );
        setCleanerPos({ lat: interpolated.lat(), lng: interpolated.lng() });
        setEta(Math.ceil((1 - progress) * 3));
        if (progress < 1) animationRef.current = requestAnimationFrame(animate);
        else { setArrived(true); setEta(0); }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isLoaded, userPos, cleanerPos, arrived, booking]);

  const handlePayment = async () => {
    if (!booking || !user) return;
    try {
      setIsProcessingPayment(true);
      // Implementation of payment would go here (Razorpay logic)
      alert("Redirecting to secure payment gateway...");
      setTimeout(() => {
        setIsProcessingPayment(false);
        router.push("/home");
      }, 2000);
    } catch (error) {
      setIsProcessingPayment(false);
    }
  };

  if (!booking) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      {/* Premium Tracking Header */}
      <div className="pt-20 pb-40 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-600/10 to-transparent -z-10"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Live Service Tracking</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-gradient leading-tight">
              {arrived ? "Pro at Doorstep" : `Arriving in ${eta} mins`}
            </h1>
            <p className="text-slate-500 font-bold mt-4 tracking-widest uppercase text-sm">Ref: {booking.id.substring(0, 12)}</p>
          </div>
          <div className="flex gap-4">
            <a href="tel:+919876543210" className="glass-panel p-5 rounded-2xl hover:bg-slate-800 transition-colors">
              <Phone size={24} className="text-indigo-400" />
            </a>
            <button 
              onClick={() => window.open(`https://wa.me/919876543210?text=${encodeURIComponent("Hi! I'm tracking your arrival for my QuickClean booking.")}`)}
              className="glass-panel p-5 rounded-2xl hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors text-emerald-500"
            >
              <MessageCircle size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 -mt-24 mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-20">
        {/* Left Column: Pro & Service Info */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel rounded-[3rem] p-8 md:p-10 border-indigo-500/20"
          >
            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl border border-slate-700">
                👩🏽‍🔧
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  {cleanerName} <ShieldCheck size={20} className="text-indigo-500" />
                </h3>
                <div className="flex items-center gap-2 text-slate-400 font-bold">
                  <Star size={16} className="fill-amber-500 text-amber-500 border-none" />
                  <span>{cleanerRating} • Platinum Partner</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-slate-500">{booking.serviceName || "Premium Service"}</span>
                  <span className="font-black text-white">₹{booking.price}</span>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                  <span className="font-black text-xl">Total Payable</span>
                  <span className="text-3xl font-black text-indigo-500">₹{booking.price}</span>
                </div>
              </div>

              {arrived ? (
                <button
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                  className="btn-premium w-full py-5 text-xl"
                >
                  {isProcessingPayment ? <Loader2 size={24} className="animate-spin" /> : <><Zap size={24} className="fill-current" /> Pay Securely</>}
                </button>
              ) : (
                <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 text-indigo-200">
                  <Clock className="w-6 h-6 shrink-0" />
                  <p className="text-sm font-medium">Please be ready. Your professional will be arriving shortly for the {booking.serviceName}.</p>
                </div>
              )}
            </div>
          </motion.div>

          <div className="glass-panel rounded-[2rem] p-8 border-indigo-500/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-sm uppercase tracking-widest text-slate-500">Smart Access</h4>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
                <ShieldCheck size={14} /> Active
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-6">Grant temporary access to your professional via smart lock.</p>
            <button 
              onClick={() => alert("Access Code Generated: 8842-12. Valid for 4 hours.")}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} className="text-indigo-400" /> Generate Access Code
            </button>
          </div>

          <div className="glass-panel rounded-[2rem] p-8 border-indigo-500/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black text-sm uppercase tracking-widest text-slate-500">Calendar Sync</h4>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
                <Calendar size={14} /> Ready
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-6">Add this appointment to your Google Calendar.</p>
            <a 
              href={generateCalendarLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <ExternalLink size={18} /> Add to Google Calendar
            </a>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
              <Navigation size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Service Address</p>
              <p className="font-bold text-slate-300 line-clamp-1">{booking.address}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Radar Map */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-7 h-[600px] lg:h-auto min-h-[600px] rounded-[3.5rem] overflow-hidden border-8 border-slate-800 shadow-2xl relative"
        >
          {isLoaded && userPos ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userPos}
              zoom={16}
              options={{
                styles: [
                  { featureType: "all", stylers: [{ saturation: -100 }, { lightness: -50 }] },
                  { featureType: "water", stylers: [{ color: "#0F172A" }] },
                  { featureType: "road", stylers: [{ color: "#1E293B" }] },
                  { featureType: "poi", stylers: [{ visibility: "off" }] }
                ],
                disableDefaultUI: true,
                zoomControl: true
              }}
            >
              <Marker position={userPos} label={{ text: "🏠", fontSize: "32px" }} />
              {cleanerPos && (
                <>
                  <Marker position={cleanerPos} label={{ text: "👩🏽‍🔧", fontSize: "40px" }} />
                  <Polyline
                    path={[cleanerPos, userPos]}
                    options={{
                      strokeColor: "#6366F1",
                      strokeOpacity: 0.6,
                      strokeWeight: 4,
                      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 }, offset: "0", repeat: "24px" }]
                    }}
                  />
                </>
              )}
            </GoogleMap>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 bg-slate-900">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
              <p className="font-black text-slate-600 tracking-[0.3em]">CONNECTING TO RADAR</p>
            </div>
          )}
          
          {/* Radar Overlay */}
          <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-900/40 rounded-[3rem]"></div>
          <div className="absolute bottom-8 left-8 glass-panel px-4 py-2 rounded-full flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
            <span className="text-xs font-black uppercase tracking-widest">Active Signal</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-indigo-500">Initializing...</div>}>
      <Tracker />
    </Suspense>
  );
}
