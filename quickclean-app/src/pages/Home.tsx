import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight, MapPin, Navigation } from 'lucide-react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useMaps } from '../MapsProvider';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';



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
          {servicesLoading
            ? [1, 2, 3, 4].map(i => (
                <div key={i} style={{ borderRadius: '24px', padding: '32px 24px', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '180px' }}>
                  <div className="skeleton" style={{ width: '56px', height: '56px', borderRadius: '16px' }} />
                  <div className="skeleton" style={{ width: '70%', height: '22px' }} />
                  <div className="skeleton" style={{ width: '40%', height: '18px', marginTop: 'auto' }} />
                </div>
              ))
            : services.map((service) => (
            <div 
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              style={{
                border: `2px solid ${selectedService === service.id ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)'}`,
                borderRadius: '24px', padding: '32px 24px',
                background: selectedService === service.id ? '#F0FDFB' : 'white',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                transform: selectedService === service.id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: selectedService === service.id ? '0 20px 40px rgba(0, 179, 166, 0.15)' : '0 10px 30px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
              }}
            >
              {service.imageUrl ? (
                <div style={{ width: '100%', height: '140px', marginBottom: '16px', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                  <img src={service.imageUrl} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', fontSize: '18px' }}>
                    {service.icon}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>{service.icon}</div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text)' }}>{service.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 'auto', paddingTop: '16px' }}>
                <span className="font-bold text-primary" style={{ fontSize: '22px' }}>₹{service.price}</span>
                {selectedService === service.id && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Bottom Sheet for Booking (Mobile Optimized) ─── */}
      {selectedService && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedService(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '2px', margin: '0 auto 20px' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)' }}>Review Booking</h3>
              <button 
                onClick={() => setSelectedService(null)}
                style={{ background: 'var(--color-background)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', background: 'var(--color-background)', padding: '16px', borderRadius: '20px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '40px', background: 'white', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {selectedData?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--color-text)' }}>{selectedData?.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span className="text-primary font-bold" style={{ fontSize: '18px' }}>₹{selectedData?.price}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: '14px', fontWeight: '600' }}>• 5-10 min arrival</span>
                </div>
              </div>
            </div>

            {address ? (
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.1)', marginBottom: '32px', display: 'flex', gap: '12px' }}>
                <MapPin size={20} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Cleaning Address</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', lineHeight: '1.4' }}>{address}</p>
                </div>
                <button 
                  onClick={() => { setSelectedService(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '20px', border: '1px solid #FEE2E2', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <p style={{ color: '#B91C1C', fontSize: '14px', fontWeight: '700' }}>Please set your address above to continue.</p>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleCleanNow} 
              disabled={!address}
              style={{ padding: '20px', fontSize: '18px', borderRadius: '20px' }}
            >
              Confirm & Book • ₹{selectedData?.price}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
