import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, ShieldCheck, Navigation, Loader2, CheckCircle2, Star, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, Marker, Polyline, TrafficLayer } from '@react-google-maps/api';
import { useMaps } from '../MapsProvider';
import { db } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';

const mapContainerStyle = { width: '100%', height: '100%' };

// Hyderabad coordinates as fallback
const defaultCenter = { lat: 17.3850, lng: 78.4867 };
const SIMULATION_DURATION = 10000; // fallback simulation duration

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export default function Tracking() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [eta, setEta] = useState(3);
  const [arrived, setArrived] = useState(false);
  const [cleanerPos, setCleanerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral>(defaultCenter);
  const startTimeRef = useRef(Date.now());
  const [usingRealGPS, setUsingRealGPS] = useState(false);
  const [cleanerName, setCleanerName] = useState('Partner');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const animationRef = useRef<number | null>(null);

  const { isLoaded } = useMaps();

  // Listen to booking and cleaner real-time GPS
  useEffect(() => {
    const bookingId = localStorage.getItem('bookingId');
    if (!bookingId) return;

    // Listen to booking status
    const bookingUnsub = onSnapshot(doc(db, 'bookings', bookingId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status?.toLowerCase() === 'completed' || data.paymentStatus === 'paid') {
          setArrived(true);
          setEta(0);
        }
        if (data.photos && data.photos.length > 0) {
          (window as any).latestPhotos = data.photos; // simple sync for demo
        }

        // If a cleaner is assigned, listen to their real-time GPS
        const cleanerId = data.cleanerId;
        if (cleanerId) {
          // Fetch cleaner name
          const cleanerDoc = await getDoc(doc(db, 'cleaners', cleanerId));
          if (cleanerDoc.exists()) {
            setCleanerName(cleanerDoc.data().name || 'Partner');
          }
        }
      }
    });

    // Also try to find assigned cleaner via bookings collection
    const findCleanerAndTrack = async () => {
      const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingSnap.exists()) return;
      const cleanerId = bookingSnap.data().cleanerId;
      if (!cleanerId) return;

      // Subscribe to cleaner's real-time location
      const cleanerUnsub = onSnapshot(doc(db, 'cleaners', cleanerId), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.lat && d.lng && d.isOnline) {
            setCleanerPos({ lat: d.lat, lng: d.lng });
            setUsingRealGPS(true);
          }
        }
      });
      return cleanerUnsub;
    };

    let cleanerUnsub: (() => void) | undefined;
    findCleanerAndTrack().then(fn => { cleanerUnsub = fn; });

    return () => {
      bookingUnsub();
      if (cleanerUnsub) cleanerUnsub();
    };
  }, []);

  // Load user current position once
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(pos);
      }, () => {
         // Fallback if denied
         setUserPos(defaultCenter);
      });
    }
  }, []);

  // Fallback simulation only when no real GPS cleaner is assigned
  useEffect(() => {
    if (!isLoaded || !google?.maps?.geometry || usingRealGPS) return;

    const startPos = { 
      lat: userPos.lat + 0.003, 
      lng: userPos.lng + 0.002 
    };

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / SIMULATION_DURATION, 1);

      const interpolated = google.maps.geometry.spherical.interpolate(
        new google.maps.LatLng(startPos.lat, startPos.lng),
        new google.maps.LatLng(userPos.lat, userPos.lng),
        progress
      );

      setCleanerPos({ lat: interpolated.lat(), lng: interpolated.lng() });
      
      const remainingMins = Math.ceil((1 - progress) * 3);
      setEta(remainingMins);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setArrived(true);
        setEta(0);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isLoaded, userPos, usingRealGPS]);

  // Real Distance Matrix ETA Calculation
  useEffect(() => {
    if (!isLoaded || !cleanerPos || !userPos || arrived) return;

    const service = new google.maps.DistanceMatrixService();
    const interval = setInterval(() => {
      service.getDistanceMatrix(
        {
          origins: [cleanerPos],
          destinations: [userPos],
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(Date.now()),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        },
        (response, status) => {
          if (status === 'OK' && response && response.rows[0].elements[0].duration) {
            const durationSecs = response.rows[0].elements[0].duration_in_traffic?.value || response.rows[0].elements[0].duration.value;
            setEta(Math.ceil(durationSecs / 60));
          }
        }
      );
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isLoaded, cleanerPos, userPos, arrived]);

  const [hasAutoFitted, setHasAutoFitted] = useState(false);

  // Fit bounds when map or positions change - but only once for initial view
  useEffect(() => {
    if (map && isLoaded && cleanerPos && !hasAutoFitted) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userPos);
      bounds.extend(cleanerPos);
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
      setHasAutoFitted(true);
    }
  }, [map, isLoaded, userPos, cleanerPos, hasAutoFitted]);

  const handleLocateMe = () => {
    if (map && cleanerPos) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userPos);
      bounds.extend(cleanerPos);
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
    } else if (map) {
      map.panTo(userPos);
    }
  };

  const handleFeedbackSubmit = async (text: string, rating: number) => {
    setIsAnalyzing(true);
    console.log("Gemini AI Analyzing Review:", text);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      if (rating <= 3) {
        setAiResponse({
          type: 'recovery',
          msg: "We're sorry for the experience. We've alerted our manager and credited ₹100 to your wallet for your next visit. 🎁",
          slackAlert: true
        });
      } else {
        setAiResponse({
          type: 'upsell',
          msg: "Glad you liked it! Our clients also love our Sofa Deep Clean. Use code PROMO10 for 10% off! ✨",
          slackAlert: false
        });
      }
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="page" style={{ background: 'var(--color-bg)' }}
    >
      <div style={{ background: 'var(--color-primary-dark)', padding: '40px 0 80px', color: 'white', position: 'relative', overflow: 'hidden' }}>
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <img src="/logo192.png" alt="Logo" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
         </div>
        <div className="container relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-widest text-green-400">{usingRealGPS ? '🛰️ Real-Time GPS' : 'Live Simulation'}</span>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px' }}>Tracking Your Arrival</h2>
          <p style={{ opacity: 0.7, fontSize: '15px', fontWeight: '600' }}>Partner {cleanerName} is on the way</p>
        </div>
      </div>

      <div className="container desktop-split" style={{ paddingBottom: '80px', marginTop: '-40px', minHeight: '600px' }}>
        <div className="col-side" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: '32px 24px', borderRadius: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div className="pulse-primary" style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark)', flexShrink: 0 }}>
                {arrived ? <CheckCircle2 size={32} /> : <Loader2 size={32} className="animate-spin" />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 block">Live Status</span>
                <h2 style={{ fontSize: '26px', color: 'var(--color-text)', fontWeight: '900', lineHeight: 1.1 }}>
                  {arrived ? 'Partner Arrived ⚡' : `Arriving in ${eta} mins ⚡`}
                </h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${eta <= 5 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                    {eta <= 5 ? 'Optimal Traffic' : 'Moderate Traffic Detected'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '24px 0' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '68px', height: '68px', borderRadius: '24px', background: '#FFEDD5', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ fontSize: '48px', lineHeight: 1 }}>👩🏽‍🔧</span>
                </div>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px', fontWeight: '800', color: '#1E293B' }}>
                    {cleanerName} <ShieldCheck size={18} fill="#E0F2F1" className="text-primary" />
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span style={{ color: '#F59E0B', fontSize: '14px' }}>★</span>
                    <span className="text-sm font-bold text-slate-500">4.9 • {usingRealGPS ? 'Live GPS Active' : 'Top Rated Partner'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <button className="btn flex-1 py-4 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '16px' }}>
                <Phone size={18} /> Call
              </button>
              <button className="btn flex-1 py-4 font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '16px' }}>
                <MessageSquare size={18} /> Chat
              </button>
            </div>

            <button 
              className="btn btn-primary w-full py-5 rounded-[24px] font-black text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02]" 
              disabled={!arrived}
              onClick={() => navigate('/checkout')}
              style={{ opacity: arrived ? 1 : 0.6 }}
            >
              {arrived ? 'Start Cleaning & Pay' : 'Waiting for Partner...'}
            </button>

            {/* Proof of Work Gallery */}
            {(window as any).latestPhotos && (window as any).latestPhotos.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: '900', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>✨ Live Proof of Work</p>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }} className="no-scrollbar">
                  {(window as any).latestPhotos.map((url: string, i: number) => (
                    <img key={i} src={url} alt="Proof" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-main" style={{ height: '650px', borderRadius: '40px', overflow: 'hidden', position: 'relative', boxShadow: 'var(--shadow-lg)', border: '6px solid var(--color-surface)', background: 'var(--color-surface)' }}>
          {isLoaded ? (
            <>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={userPos}
                zoom={16}
                onLoad={(m) => setMap(m)}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                  styles: theme === 'dark' ? darkMapStyle : [
                    { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                    { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
                  ]
                }}
              >
                <TrafficLayer />
                {/* Visible Path */}
                {cleanerPos && (
                  <Polyline
                    path={[
                      { lat: userPos.lat + 0.003, lng: userPos.lng + 0.002 },
                      userPos
                    ]}
                    options={{
                      strokeColor: '#6366F1',
                      strokeOpacity: 0.6,
                      strokeWeight: 4,
                      icons: [{
                        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                        offset: '0',
                        repeat: '20px'
                      }]
                    }}
                  />
                )}

                {/* Destination Marker */}
                <Marker 
                  position={userPos} 
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#F43F5E",
                    fillOpacity: 1,
                    strokeWeight: 4,
                    strokeColor: "white",
                  }}
                  label={{ text: "HOME", color: "white", fontSize: "10px", fontWeight: "900" }}
                />

                {/* Animated Cleaner Marker */}
                {cleanerPos && !arrived && (
                  <Marker 
                    position={cleanerPos} 
                    label={{ text: "👩🏽‍🔧", fontSize: "40px", className: "cleaner-label" }}
                    options={{
                      optimized: false,
                      zIndex: 999
                    }}
                  />
                )}
              </GoogleMap>
              
              <button
                onClick={handleLocateMe}
                style={{
                  position: 'absolute', bottom: '30px', right: '30px',
                  background: 'white', border: 'none', width: '56px', height: '56px',
                  borderRadius: '18px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 10, color: 'var(--color-primary)'
                }}
                title="Locate Me"
              >
                <Navigation size={28} fill="currentColor" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50 flex-col gap-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <p className="font-bold text-slate-400">Initializing Live Map...</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .cleaner-label { margin-top: -10px; }
        .pulse-primary { animation: pulseBg 2s infinite; }
        @keyframes pulseBg {
           0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
           70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
           100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
      `}</style>

      {/* Gemini AI Quality Guard Modal */}
      <AnimatePresence>
        {arrived && !showFeedback && !aiResponse && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-8 left-8 right-8 z-[100] glass-card p-6 border-indigo-500/30 shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/20">
              <Star className="text-white fill-current" size={24} />
            </div>
            <h3 className="text-xl font-black mb-1">How was your cleaning?</h3>
            <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">Help us stay premium</p>
            <div className="flex gap-4 mb-8">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setShowFeedback(true)} className="text-3xl hover:scale-125 transition-transform">⭐</button>
              ))}
            </div>
          </motion.div>
        )}

        {showFeedback && (
          <div className="fixed inset-0 z-[101] bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card w-full max-w-lg p-10 relative overflow-hidden"
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-10">
                  <Loader2 size={64} className="text-indigo-500 animate-spin mb-6" />
                  <p className="font-black tracking-widest uppercase text-indigo-400">Gemini AI Analyzing Feedback...</p>
                </div>
              ) : aiResponse ? (
                <div className="text-center py-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 ${aiResponse.type === 'recovery' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {aiResponse.type === 'recovery' ? <AlertCircle size={40} /> : <img src="/logo192.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                  </div>
                  <h3 className="text-2xl font-black mb-4">{aiResponse.type === 'recovery' ? 'We Hear You.' : 'Incredible!'}</h3>
                  <p className="text-slate-300 font-bold mb-10 leading-relaxed">{aiResponse.msg}</p>
                  <button onClick={() => navigate('/home')} className="btn btn-primary w-full py-5 rounded-2xl font-black text-lg">Back to Home</button>
                </div>
              ) : (
                <>
                  <h3 className="text-3xl font-black mb-2">Detailed Feedback</h3>
                  <p className="text-slate-400 font-bold mb-8">Your comments help our AI train better professionals.</p>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold text-white mb-8"
                    placeholder="Tell us everything..."
                    id="feedback-text"
                  ></textarea>
                  <button 
                    onClick={() => handleFeedbackSubmit((document.getElementById('feedback-text') as any).value, 5)}
                    className="btn btn-primary w-full py-5 rounded-2xl font-black text-lg"
                  >
                    Submit to Gemini AI
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
