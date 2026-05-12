"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap, User, ChevronRight, MapPin, Navigation, Star, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { useMaps } from "@/lib/MapsProvider";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 17.3850, lng: 78.4867 };

interface Service {
  id: string;
  name: string;
  price: number;
  timeMins: number;
  icon: string;
}

import WeatherBanner from "@/components/WeatherBanner";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded } = useMaps();
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);

  useEffect(() => {
    // Check if it's weekend or peak hours (Saturday/Sunday)
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      setSurgeMultiplier(1.2); // 20% Surge
    }
  }, []);

  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [mapPos, setMapPos] = useState(defaultCenter);
  const [showMap, setShowMap] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, "services"));
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Service));
        setServices(data);
      } catch (err) {
        console.error("Error fetching services:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMapPos(newPos);
        if (map) map.panTo(newPos);
        new google.maps.Geocoder().geocode({ location: newPos }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            setAddress(results[0].formatted_address);
            setShowMap(true);
          }
          setIsLocating(false);
        });
      },
      () => setIsLocating(false)
    );
  };

  const handleBookNow = async () => {
    if (!selectedService || !address) return;
    setIsMatching(true);
    try {
      const service = services.find((s) => s.id === selectedService);
      const newBooking = {
        userId: user.uid,
        serviceId: selectedService,
        serviceName: service?.name,
        price: service?.price,
        address,
        lat: mapPos.lat,
        lng: mapPos.lng,
        status: "pending",
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "bookings"), newBooking);
      router.push(`/track?id=${docRef.id}`);
    } catch (err) {
      console.error(err);
      setIsMatching(false);
    }
  };

  if (isMatching) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="relative w-48 h-48 mb-8">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-indigo-500/40 rounded-full animate-ping delay-300"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={64} className="text-indigo-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-4xl font-black mb-4">Dispatching Professional</h2>
        <p className="text-xl text-slate-400 font-medium">Arriving in under 10 minutes ⚡</p>
      </div>
    );
  }

  const selectedData = services.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col font-sans">
      <WeatherBanner />
      {/* Premium Header */}
      <nav className="sticky top-0 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 z-50 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
            <Zap size={20} />
          </div>
          <span className="text-2xl font-black tracking-tight">QuickClean</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
            <User size={24} />
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="py-20 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl -z-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[140px]"></div>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            {surgeMultiplier > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 mb-8"
              >
                <Zap size={12} className="fill-current" /> High Demand: 1.2x Surge Applied
              </motion.div>
            )}
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-8 text-gradient">
              Book Your Service <br />
              <span className="text-indigo-500">In 10 Seconds.</span>
            </h1>

            <div className="glass-panel p-3 rounded-[2.5rem] flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
              <div className="flex-1 flex items-center px-6 py-4 bg-slate-900/50 rounded-[2rem] border border-slate-800">
                <MapPin className="text-indigo-500 shrink-0" size={24} />
                {isLoaded ? (
                  <Autocomplete className="flex-1" onLoad={(a) => (autocompleteRef.current = a)} onPlaceChanged={() => {
                    const place = autocompleteRef.current?.getPlace();
                    if (place?.formatted_address) {
                      setAddress(place.formatted_address);
                      if (place.geometry?.location) {
                        setMapPos({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                      }
                    }
                  }}>
                    <input
                      type="text"
                      placeholder="Where should we clean?"
                      className="w-full bg-transparent outline-none px-4 font-bold text-lg text-white placeholder:text-slate-600"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Autocomplete>
                ) : (
                  <div className="flex-1 px-4 text-slate-600 font-bold">Initializing Maps...</div>
                )}
              </div>
              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all"
              >
                {isLocating ? <Clock size={20} className="animate-spin" /> : <Navigation size={20} />}
                <span>Locate Me</span>
              </button>
            </div>

            {showMap && isLoaded && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 h-80 rounded-[2.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl"
              >
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapPos}
                  zoom={16}
                  onLoad={setMap}
                  onClick={(e) => {
                    if (e.latLng) {
                      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                      setMapPos(newPos);
                      new google.maps.Geocoder().geocode({ location: newPos }, (results, status) => {
                        if (status === "OK" && results && results[0]) setAddress(results[0].formatted_address);
                      });
                    }
                  }}
                  options={{ styles: [{ featureType: "all", stylers: [{ saturation: -100 }, { lightness: -50 }] }] }}
                >
                  <Marker position={mapPos} />
                </GoogleMap>
              </motion.div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="px-6 pb-40 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-3xl font-black">Choose a Service</h2>
            <div className="h-px flex-1 bg-slate-800"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="glass-panel rounded-[2rem] p-8 h-64 animate-pulse"></div>
                ))
              : services.map((service) => (
                  <motion.div
                    key={service.id}
                    whileHover={{ y: -5 }}
                    onClick={() => setSelectedService(service.id)}
                    className={`
                      cursor-pointer glass-card rounded-[2.5rem] p-8 border-2 transition-all duration-500
                      ${selectedService === service.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800/50"}
                    `}
                  >
                    <div className="text-5xl mb-6">{service.icon}</div>
                    <h3 className="text-2xl font-black mb-2">{service.name}</h3>
                    <div className="flex items-center justify-between mt-8">
                      <span className="text-3xl font-black text-indigo-400">₹{Math.round(service.price * surgeMultiplier)}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedService === service.id ? "bg-indigo-600" : "bg-slate-800"}`}>
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>
      </main>

      {/* Booking Bar */}
      <AnimatePresence>
        {selectedService && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-xl glass-panel rounded-[2.5rem] p-6 z-[100] border-indigo-500/30"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">{selectedData?.icon}</div>
              <div className="flex-1">
                <h4 className="font-black text-xl">{selectedData?.name}</h4>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold">
                  <Star size={14} className="fill-current" /> Premium Service
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">₹{Math.round((selectedData?.price || 0) * surgeMultiplier)}</p>
              </div>
            </div>
            
            {address ? (
              <button
                onClick={handleBookNow}
                className="btn-premium w-full py-5 text-xl"
              >
                Book Now
              </button>
            ) : (
              <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 text-indigo-400 font-bold text-center flex items-center justify-center gap-2">
                <AlertCircle size={20} /> Set your address to continue
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
