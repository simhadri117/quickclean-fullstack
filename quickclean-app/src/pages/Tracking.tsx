import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, ShieldCheck, Zap, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleMap, Marker, Polyline, TrafficLayer } from '@react-google-maps/api';
import { useMaps } from '../MapsProvider';
import { db } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

const mapContainerStyle = { width: '100%', height: '100%' };

// Hyderabad coordinates as fallback
const defaultCenter = { lat: 17.3850, lng: 78.4867 };
const SIMULATION_DURATION = 10000; // fallback simulation duration

export default function Tracking() {
  const navigate = useNavigate();
  const [eta, setEta] = useState(3);
  const [arrived, setArrived] = useState(false);
  const [cleanerPos, setCleanerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral>(defaultCenter);
  const startTimeRef = useRef(Date.now());
  const [usingRealGPS, setUsingRealGPS] = useState(false);
  const [cleanerName, setCleanerName] = useState('Partner');
  const [map, setMap] = useState<google.maps.Map | null>(null);
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
        if (data.status === 'completed' || data.paymentStatus === 'paid') {
          setArrived(true);
          setEta(0);
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

  return (
    <div className="page" style={{ background: '#F8FAFC' }}>
      <div style={{ background: 'var(--color-primary-dark)', padding: '40px 0 80px', color: 'white', position: 'relative', overflow: 'hidden' }}>
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} />
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
          <div className="glass-card" style={{ background: 'white', padding: '32px 24px', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div className="pulse-primary" style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark)', flexShrink: 0 }}>
                {arrived ? <CheckCircle2 size={32} /> : <Loader2 size={32} className="animate-spin" />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 block">Live Status</span>
                <h2 style={{ fontSize: '26px', color: 'var(--color-text)', fontWeight: '900', lineHeight: 1.1 }}>
                  {arrived ? 'Partner Arrived ⚡' : `Arriving in ${eta} mins ⚡`}
                </h2>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '24px 0' }}></div>

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
              <button className="btn btn-secondary flex-1 py-4 font-bold text-slate-700 bg-slate-50 border-slate-100 hover:bg-white">
                <Phone size={18} /> Call
              </button>
              <button className="btn btn-secondary flex-1 py-4 font-bold text-slate-700 bg-slate-50 border-slate-100 hover:bg-white">
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
          </div>
        </div>

        <div className="col-main" style={{ height: '650px', borderRadius: '40px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '6px solid white', background: '#E2E8F0' }}>
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
                  styles: [
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
    </div>
  );
}
