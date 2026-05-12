"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { MapPin, Calendar, CreditCard, ChevronRight, CheckCircle2, Loader2, Navigation } from "lucide-react";

function BookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId");

  const [user, setUser] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login?redirect=/book?serviceId=" + serviceId);
      }
    });
    return () => unsubscribe();
  }, [router, serviceId]);

  useEffect(() => {
    if (serviceId) {
      getDoc(doc(db, "services", serviceId as string)).then(snapshot => {
        if (snapshot.exists()) {
          setService({ id: snapshot.id, ...snapshot.data() });
        }
      });
    }
  }, [serviceId]);

  const handleBooking = async () => {
    if (!user || !service || !address) return;
    try {
      setIsSubmitting(true);
      
      const newBooking = {
        userId: user.uid,
        serviceId: service.id,
        service: {
            name: service.name,
            price: service.price,
            icon: service.icon || '✨'
        },
        address: address,
        status: 'FINDING_WORKER',
        workerId: null,
        amount: service.price,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "bookings"), newBooking);
      
      // In Phase 3 we will redirect to /track/[bookingId]
      router.push(`/track?id=${docRef.id}`);
      
    } catch (error) {
      console.error("Booking Error:", error);
      alert("Failed to create booking");
      setIsSubmitting(false);
    }
  };

  if (!service) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Book Service</h1>
          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Step {step} of 2
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-6">
          {/* Service Summary */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl border border-indigo-100">
              {service.icon || '✨'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{service.name}</h2>
              <p className="text-indigo-600 font-extrabold">₹{service.price}</p>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" /> 
                  Where do you need the service?
                </label>
                <div className="relative">
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your full address (House No, Building, Street, Area)..."
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all text-slate-700"
                    required
                  />
                  <div className="absolute bottom-3 right-3 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center gap-1 border border-indigo-100 cursor-pointer">
                    <Navigation className="w-3 h-3" />
                    Use Current Location (Mock)
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  *Google Maps API integration planned for Phase 2.5
                </p>
              </div>

              <button 
                onClick={() => address.trim().length > 5 ? setStep(2) : alert("Please enter a valid address")}
                className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-bold hover:bg-indigo-600 transition-all flex items-center justify-between group shadow-md"
              >
                <span>Continue to Review</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 mb-1">Service Location</h3>
                <p className="text-slate-900 font-medium">{address}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 mb-3">Payment Summary</h3>
                <div className="flex justify-between text-sm mb-2 text-slate-600">
                  <span>Service Total</span>
                  <span className="font-medium">₹{service.price}</span>
                </div>
                <div className="flex justify-between text-sm mb-4 text-slate-600 pb-4 border-b border-slate-200">
                  <span>Taxes & Fees</span>
                  <span className="font-medium">₹49</span>
                </div>
                <div className="flex justify-between font-extrabold text-lg text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-indigo-600">₹{service.price + 49}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="w-1/3 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <button 
                  onClick={handleBooking}
                  disabled={isSubmitting}
                  className="w-2/3 bg-indigo-600 text-white py-4 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /> Confirm Booking</>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingWizard />
    </Suspense>
  );
}
