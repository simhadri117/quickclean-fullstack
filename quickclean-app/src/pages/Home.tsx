import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, MapPin, Navigation, AlertCircle } from 'lucide-react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useMaps } from '../MapsProvider';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Skeleton from '../components/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';



const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 17.3850,
  lng: 78.4867
};



interface Service {
  id: string; 
  name: string;
  price: number;
  timeMins: number;
  icon: string;
  imageUrl?: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  
  // Location State
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [mapPos, setMapPos] = useState(defaultCenter);
  const [showMap, setShowMap] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{address: string, lat: number, lng: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { isLoaded } = useMaps();

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback(function callback(m: google.maps.Map) {
    setMap(m);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMapPos(newPos);
        setAddress(place.formatted_address || "");
        if (map) map.panTo(newPos);
      }
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Add a 5 second timeout to getDocs to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firestore connection timeout')), 5000)
        );
        
        let snapshot = await Promise.race([
          getDocs(collection(db, 'services')),
          timeoutPromise
        ]) as any;
        
        // Auto-seed if empty
        if (snapshot.empty) {
          console.log('Seeding default services...');
          const defaultServices = [
            { name: 'Quick Sweep & Mop', price: 149, timeMins: 5, icon: '🧹', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400' },
            { name: 'Kitchen Regular', price: 199, timeMins: 10, icon: '✨', imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400' },
            { name: 'Bathroom Wash', price: 199, timeMins: 10, icon: '🚿', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' },
            { name: 'Post-Party Cleanup', price: 499, timeMins: 30, icon: '🎉', imageUrl: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&q=80&w=400' }
          ];
          for (const s of defaultServices) {
            await addDoc(collection(db, 'services'), s);
          }
          snapshot = await getDocs(collection(db, 'services'));
        }

        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Service));
        setServices(data);
        setServicesLoading(false);
      } catch (err) {
        console.error('Failed to load services from Firestore:', err);
        setServices([]);
        setServicesLoading(false);
      }
    };
    fetchServices();
      
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const initialPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapPos(initialPos);
      });
    }
  }, []);


  // Helper: reverse geocode using OpenStreetMap Nominatim (no API key needed)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      return data?.display_name || null;
    } catch {
      return null;
    }
  };

  // Helper: get multiple nearby address suggestions using Nominatim
  const getAddressSuggestions = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const primary = await res.json();
      if (!primary?.display_name) return [];

      // Build variations: most specific to broader area
      const addr = primary.address || {};
      const base = { lat, lng };
      const suggestions = [
        primary.display_name,
        [addr.house_number, addr.road, addr.suburb, addr.city || addr.town, addr.state].filter(Boolean).join(', '),
        [addr.road, addr.suburb, addr.city || addr.town, addr.state, addr.country].filter(Boolean).join(', '),
        [addr.suburb, addr.city || addr.town, addr.state, addr.country].filter(Boolean).join(', '),
        [addr.city || addr.town, addr.state, addr.country].filter(Boolean).join(', '),
      ].filter((s, i, arr) => s && arr.indexOf(s) === i); // deduplicate

      return suggestions.slice(0, 5).map(a => ({ address: a, ...base }));
    } catch {
      return [];
    }
  };

  // Auto-locate user once Google Maps script is ready (uses Nominatim)
  useEffect(() => {
    if (isLoaded && !address && !isLocating && "geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapPos(currentPos);
          const resolved = await reverseGeocode(currentPos.lat, currentPos.lng);
          setIsLocating(false);
          if (resolved) setAddress(resolved);
        },
        (err) => {
          console.warn("Auto-locate failed:", err.message);
          setIsLocating(false);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [isLoaded]);

  const handleLocateMe = async () => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapPos(newPos);
        if (map) map.panTo(newPos);

        const suggestions = await getAddressSuggestions(newPos.lat, newPos.lng);
        setIsLocating(false);
        if (suggestions.length > 0) {
          setAddressSuggestions(suggestions);
          setShowSuggestions(true);
          setAddress(suggestions[0].address); // pre-select first
          setShowMap(true);
        }
      },
      (err) => {
        console.warn("Geolocation failed:", err.message);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const selectSuggestion = (s: { address: string; lat: number; lng: number }) => {
    setAddress(s.address);
    setMapPos({ lat: s.lat, lng: s.lng });
    if (map) map.panTo({ lat: s.lat, lng: s.lng });
    setShowSuggestions(false);
  };

  const handleCleanNow = async () => {
    if (!selectedService) return;
    if (!address) {
      alert("Please enter or locate your address first");
      return;
    }
    
    setIsMatching(true);
    try {
      if (!auth.currentUser) {
        alert("Please log in to book a service.");
        navigate('/login');
        return;
      }
      
      const newBooking = {
        userId: auth.currentUser.uid,
        serviceId: selectedService,
        address: address,
        lat: mapPos.lat,
        lng: mapPos.lng,
        status: 'pending',
        timestamp: serverTimestamp(),
        paymentStatus: 'pending'
      };
      
      const docRef = await addDoc(collection(db, 'bookings'), newBooking);
      localStorage.setItem('bookingId', docRef.id);
      navigate('/tracking');
    } catch (e: any) {
      console.error(e);
      alert('Failed to book: ' + (e.message || 'Unknown error'));
      setIsMatching(false);
    }
  };

  if (isMatching) {
    return (
      <div className="page bg-primary items-center justify-center relative overflow-hidden" style={{ minHeight: '100vh', width: '100%' }}>
        {/* Radar Ping Animation */}
        <div style={{
          width: '200px', height: '200px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.5)',
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          position: 'absolute'
        }}></div>
        <div style={{
          width: '300px', height: '300px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          position: 'absolute', animationDelay: '0.4s'
        }}></div>
        
        <Zap size={64} color="white" style={{ zIndex: 10, animation: 'pulse 1s infinite alternate' }} />
        <h2 style={{ color: 'white', marginTop: '32px', zIndex: 10, fontWeight: 800, fontSize: '32px' }}>Dispatching Cleaner...</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', zIndex: 10, fontWeight: 600, fontSize: '18px', marginTop: '8px' }}>Arriving in under 5 minutes ⚡</p>
        <style>{`
          @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }
          @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.1); filter: brightness(1.2); } }
        `}</style>
      </div>
    );
  }

  const selectedData = services.find(s => s.id === selectedService);

  return (
    <div className="page" style={{ display: 'block' }}>
      {/* ─── Hero Section (Responsive) ─── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        color: 'white', 
        padding: '60px 0', 
        textAlign: 'center', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.5 }}></div>
        
        <div className="container" style={{ maxWidth: '800px', position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: 'clamp(32px, 8vw, 64px)', 
            fontWeight: '800', 
            lineHeight: 1.1, 
            marginBottom: '24px', 
            letterSpacing: '-1px', 
            color: '#F8FAFC' 
          }}>
            Premium home cleaning, <br/>delivered in <span style={{ color: 'var(--color-secondary)', textShadow: '0 0 40px rgba(245, 158, 11, 0.4)' }}>5 minutes.</span>
          </h1>
          
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            background: 'white', 
            padding: '8px', 
            borderRadius: '24px', 
            maxWidth: '650px', 
            margin: '0 auto', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
            flexDirection: 'column' 
          }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '0 20px', color: 'var(--color-text)', background: '#F8FAFC', borderRadius: '100px' }}>
                <MapPin size={24} color="var(--color-primary)" />
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(a) => autocompleteRef.current = a}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <input 
                      id="address-input"
                      type="text" 
                      value={isLocating ? "📍 Locating your position..." : address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your cleaning address..." 
                      readOnly={isLocating}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', width: '100%', marginLeft: '12px', fontWeight: '500', padding: '16px 0', transition: 'color 0.3s', opacity: isLocating ? 0.6 : 1 }} 
                    />
                  </Autocomplete>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Loading Google Maps..." 
                    disabled
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', width: '100%', marginLeft: '12px', fontWeight: '500', padding: '16px 0' }} 
                  />
                )}
              </div>
              <button 
                onClick={handleLocateMe}
                disabled={isLocating}
                style={{ background: isLocating ? '#E0F2F1' : 'var(--color-primary-light)', border: 'none', padding: '0 24px', borderRadius: '100px', color: 'var(--color-primary-dark)', cursor: isLocating ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', minWidth: '120px', justifyContent: 'center', transition: 'all 0.2s' }}
              >
                {isLocating ? (
                  <>
                    <span style={{ fontSize: '14px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    <span className="hide-mobile" style={{ fontSize: '13px' }}>Locating...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={18} />
                    <span className="hide-mobile">Locate Me</span>
                  </>
                )}
              </button>
            </div>

            {/* Address Suggestions Panel */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div style={{ padding: '0 8px 4px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-text-light)', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Select your address</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      style={{
                        background: address === s.address ? 'var(--color-primary-light)' : '#F8FAFC',
                        border: `1px solid ${address === s.address ? 'var(--color-primary)' : 'transparent'}`,
                        borderRadius: '12px',
                        padding: '10px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: address === s.address ? '700' : '500',
                        color: address === s.address ? 'var(--color-primary-dark)' : 'var(--color-text)',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <MapPin size={14} style={{ flexShrink: 0, color: address === s.address ? 'var(--color-primary)' : 'var(--color-text-light)' }} />
                      {s.address}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '0 8px 8px' }}>
              <button 
                onClick={() => setShowMap(!showMap)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showMap ? 'Hide Map' : 'Select on Map'}
              </button>

              {showMap && isLoaded && (
                <div style={{ height: '300px', marginTop: '12px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 1 }}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapPos}
                    zoom={16}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={(e) => {
                      if (e.latLng) {
                        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        setMapPos(newPos);
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: newPos }, (results, status) => {
                          if (status === "OK" && results && results[0]) {
                            setAddress(results[0].formatted_address);
                          }
                        });
                      }
                    }}
                  >
                    <Marker position={mapPos} />
                  </GoogleMap>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '80px 24px 120px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Instant Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
          {servicesLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Skeleton height="140px" width="100%" borderRadius="16px" />
                <Skeleton height="24px" width="70%" />
                <Skeleton height="32px" width="40%" className="mt-auto" />
              </div>
            ))
          ) : (
            <AnimatePresence>
              {services.map((service, idx) => (
                <motion.div 
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
                  onClick={() => setSelectedService(service.id)}
                  style={{
                    border: `2px solid ${selectedService === service.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: '24px', padding: '32px 24px',
                    background: selectedService === service.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
                  }}
                >
                  {service.imageUrl ? (
                    <div style={{ width: '100%', height: '140px', marginBottom: '16px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                      <img src={service.imageUrl} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--color-surface)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', fontSize: '18px' }}>
                        {service.icon}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>{service.icon}</div>
                  )}
                  <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--color-text)' }}>{service.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto', paddingTop: '16px' }}>
                    <span className="font-bold text-primary" style={{ fontSize: '22px', color: 'var(--color-primary)' }}>₹{service.price}</span>
                    <motion.div 
                      animate={{ x: selectedService === service.id ? 0 : 5, opacity: selectedService === service.id ? 1 : 0 }}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                    >
                      <ChevronRight size={18} />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ─── Bottom Sheet for Booking (Mobile Optimized) ─── */}
      <AnimatePresence>
        {selectedService && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bottom-sheet-overlay" 
            onClick={() => setSelectedService(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bottom-sheet" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', margin: '0 auto 20px' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--color-text)', letterSpacing: '-0.5px' }}>Review Booking</h3>
                <button 
                  onClick={() => setSelectedService(null)}
                  style={{ background: 'var(--color-bg)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'var(--color-bg)', padding: '16px', borderRadius: '24px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '40px', background: 'var(--color-surface)', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px', boxShadow: 'var(--shadow-sm)' }}>
                  {selectedData?.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: '900', fontSize: '18px', color: 'var(--color-text)' }}>{selectedData?.name}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <span className="font-black" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>₹{selectedData?.price}</span>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '13px', fontWeight: '700' }}>• ⚡ Instant Arrival</span>
                  </div>
                </div>
              </div>

              {address ? (
                <div style={{ background: 'var(--color-primary-light)', padding: '16px', borderRadius: '24px', border: '1px solid var(--color-primary-light)', marginBottom: '32px', display: 'flex', gap: '12px' }}>
                  <MapPin size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary)' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', fontWeight: '900', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Cleaning Address</p>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)', lineHeight: '1.4' }}>{address}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedService(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '800', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div style={{ background: 'var(--color-primary-light)', padding: '16px', borderRadius: '24px', border: '1px solid var(--color-error)', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
                  <p style={{ color: 'var(--color-error)', fontSize: '14px', fontWeight: '800' }}>Please set your address above to continue.</p>
                </div>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary" 
                onClick={handleCleanNow} 
                disabled={!address}
                style={{ padding: '22px', fontSize: '20px', borderRadius: '24px', fontWeight: '900', boxShadow: 'var(--shadow-lg)' }}
              >
                Confirm & Book • ₹{selectedData?.price}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
