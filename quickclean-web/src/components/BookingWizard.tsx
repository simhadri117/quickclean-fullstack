"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Calendar, CreditCard, ArrowRight, ChevronLeft, CheckCircle2, Clock, Map as MapIcon } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';

const steps = [
  { id: 'service', title: 'Choose Service', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'location', title: 'Address', icon: <MapPin className="w-5 h-5" /> },
  { id: 'schedule', title: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'checkout', title: 'Payment', icon: <CreditCard className="w-5 h-5" /> }
];

interface Service {
  id: string;
  name: string;
  price: number;
  icon: string;
  description: string;
}

const services: Service[] = [
  { id: '1', name: 'Standard Cleaning', price: 149, icon: '🧹', description: 'Quick sweep, mop, and dusting of all rooms.' },
  { id: '2', name: 'Deep Cleaning', price: 499, icon: '✨', description: 'Intensive scrubbing, sanitization, and detailed care.' },
  { id: '3', name: 'Kitchen Refresh', price: 199, icon: '🥘', description: 'Grease removal, counter polishing, and appliance care.' },
  { id: '4', name: 'Bathroom Sanitize', price: 249, icon: '🚿', description: 'Tile scrubbing and full bathroom disinfection.' }
];

export default function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [address, setAddress] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 17.3850, lng: 78.4867 });
  const [selectedDate, setSelectedDate] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleBooking = () => {
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      setIsSuccess(true);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-12 px-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center group">
            <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${idx <= currentStep ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500
                ${idx < currentStep ? 'bg-indigo-600 border-indigo-600 text-white' : 
                  idx === currentStep ? 'bg-indigo-600/10 border-indigo-600 text-indigo-400 animate-glow' : 
                  'bg-slate-800 border-slate-700 text-slate-500'}`}>
                {idx < currentStep ? <CheckCircle2 className="w-6 h-6" /> : step.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{step.title}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 md:w-24 h-[2px] mx-4 rounded-full transition-all duration-1000 ${idx < currentStep ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 min-h-[500px] flex flex-col">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-6"
            >
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black">Booking Confirmed!</h2>
              <p className="text-slate-400 max-w-sm">Your pro will arrive on {selectedDate || 'scheduled time'}. You can track their arrival in your dashboard.</p>
              <button 
                onClick={() => window.location.href = '/home'}
                className="btn-premium mt-4"
              >
                Go to Dashboard
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); nextStep(); }}
                      className={`glass-card p-6 rounded-3xl text-left transition-all ${selectedService?.id === svc.id ? 'border-indigo-500 bg-indigo-500/10' : ''}`}
                    >
                      <div className="text-4xl mb-4">{svc.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{svc.name}</h3>
                      <p className="text-sm text-slate-400 mb-6">{svc.description}</p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-2xl font-black text-indigo-400">₹{svc.price}</span>
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <MapIcon className="w-6 h-6 text-indigo-500" />
                    Where should we clean?
                  </h3>
                  <div className="relative">
                    <Autocomplete
                      onLoad={a => autocompleteRef.current = a}
                      onPlaceChanged={() => {
                        const place = autocompleteRef.current?.getPlace();
                        if (place?.formatted_address) {
                          setAddress(place.formatted_address);
                          if (place.geometry?.location) {
                            setMapCenter({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
                          }
                        }
                      }}
                    >
                      <input 
                        type="text" 
                        placeholder="Search for your address..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-lg"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </Autocomplete>
                  </div>
                  <div className="h-64 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={15}
                    >
                      <Marker position={mapCenter} />
                    </GoogleMap>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-bold">Pick a time that works</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Today', 'Tomorrow', 'Wed', 'Thu'].map(day => (
                      <button 
                        key={day}
                        className="glass-card p-4 rounded-2xl text-center font-bold hover:bg-indigo-500/10"
                        onClick={() => setSelectedDate(day + ' @ 10:00 AM')}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map(time => (
                      <button 
                        key={time}
                        className="glass-card p-3 rounded-xl text-sm font-medium"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Order Summary</h3>
                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-400 font-medium">Service</span>
                      <span className="font-bold">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-400 font-medium">Schedule</span>
                      <span className="font-bold">Tomorrow @ 10:00 AM</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="text-lg font-bold">Total Amount</span>
                      <span className="text-2xl font-black text-indigo-400">₹{selectedService?.price}</span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <p className="text-sm text-indigo-200">Our professionals typically arrive within 15 mins of the slot start.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isSuccess && (
          <div className="mt-auto pt-8 flex items-center justify-between">
            <button 
              onClick={prevStep}
              className={`flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <button 
              onClick={currentStep === steps.length - 1 ? handleBooking : nextStep}
              disabled={isBooking || (currentStep === 0 && !selectedService)}
              className="btn-premium flex items-center gap-2 min-w-[160px] justify-center"
            >
              {isBooking ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : currentStep === steps.length - 1 ? (
                'Book Now'
              ) : (
                <>Next Step <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
