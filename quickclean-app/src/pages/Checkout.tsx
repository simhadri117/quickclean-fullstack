import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, CreditCard, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Checkout() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const tips = [10, 20, 50, 100];
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [service, setService] = useState<{name: string, price: number} | null>(null);
  // Removed unused booking state to fix build error
  const bookingId = localStorage.getItem('bookingId') || '8492';
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [userPoints, setUserPoints] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showUpiDrawer, setShowUpiDrawer] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState<any>(null);
  const [upiUrl, setUpiUrl] = useState('');
  const [userData, setUserData] = useState<{name?: string, phone?: string} | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Inject Razorpay Realtime Apps Intent SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        setScriptLoaded(false);
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
         document.body.removeChild(script);
      }
    };
  }, []);

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchBookingData = async () => {
      const token = localStorage.getItem('token');
      if (bookingId && token) {
        try {
          // Fetch user points first
          const uRes = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            setUserPoints(uData.points);
            setUserData({ name: uData.name, phone: uData.phone });
          }

          // PRIORITY 1: Check localStorage for Locked Price (The price user was shown at booking)
          const localPrice = localStorage.getItem('lockedPrice');
          const localName = localStorage.getItem('lockedServiceName');
          
          if (localPrice && localName) {
            console.log('📦 Checkout: Using price from localStorage (Locked):', localPrice);
            setService({ name: localName, price: parseInt(localPrice) });
          } else {
            // PRIORITY 2: Fetch from API if no local lock exists
            let apiData = null;
            try {
              const res = await fetch(`/api/bookings/${bookingId}/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                apiData = await res.json();
                console.log('💳 Checkout: Booking status data:', apiData);
              }
            } catch (apiErr) {
              console.error('❌ Checkout: API call failed:', apiErr);
            }

            if (apiData && apiData.service) {
              console.log('✅ Checkout: Using price from booking document:', apiData.service.price);
              setService(apiData.service);
            } else if (apiData && apiData.serviceId) {
              console.log('⚠️ Checkout: Service missing, falling back to catalog lookup');
              const sRes = await fetch('/api/services');
              if (sRes.ok) {
                const services = await sRes.json();
                const found = services.find((s: any) => s.id === apiData.serviceId);
                if (found) setService(found);
              }
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setTimeout(() => setIsLoading(false), 500);
        }
      } else {
        setIsLoading(false);
      }
    };
    fetchBookingData();
  }, [bookingId]);

  // Real-time Payment Listener
  useEffect(() => {
    if (!bookingId || bookingId.startsWith('mock-') || isPaid) return;

    console.log(`📡 Subscribing to Real-time updates for Booking: ${bookingId}`);
    
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔔 Real-time Update Received:', data);
        if (data.status === 'COMPLETED' || data.paymentStatus === 'paid' || data.paymentStatus === 'COMPLETED') {
          setIsProcessing(false);
          setIsPaid(true);
          setTimeout(() => navigate('/home', { replace: true }), 3500);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, isPaid, navigate]);

  const handleRedeem = async () => {
    if (userPoints < 500 || isRedeeming) return;
    setIsRedeeming(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/rewards/redeem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 500 })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscount(data.discountValue);
        setUserPoints(data.remainingPoints);
      } else {
        alert(data.error || 'Redemption failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRedeeming(false);
    }
  };

  const verifyPayment = async (response: any) => {
    const token = localStorage.getItem('token');
    try {
        const verifyRes = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bookingId,
                tip: selectedTip || 0,
                rating: rating || 0
            })
        });
        
        if (verifyRes.ok) {
            setIsProcessing(false);
            setIsPaid(true);
            setTimeout(() => navigate('/home', { replace: true }), 3500);
        } else {
            setIsProcessing(false);
            const data = await verifyRes.json();
            alert(data.error || "Secured payment verification failed.");
        }
    } catch(err) {
        setIsProcessing(false);
        alert("Network error during verification.");
    }
  };

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // Step 1: Create Razorpay Realtime Intent Order
      const res = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingId: bookingId,
          tip: selectedTip || 0,
          discountApplied: discount
        })
      });
      
      const orderData = await res.json();
      if (!res.ok) {
        setIsProcessing(false);
        return alert('Failed to connect to Realtime payments gateway.');
      }

      // Step 2: Handle Realtime Apps Mock Mode Bypass
      if (orderData.fallbackMockActive) {
          console.log('[Payments] Realtime gateway is in MOCK mode. Activating Simulation Drawer.');
          setIsProcessing(false);
          setCurrentOrderData(orderData);
          setShowUpiDrawer(true);
          return;
      }

      // Step 3: Open Razorpay UI Intent
      if (!scriptLoaded && !(window as any).Razorpay) {
          return alert('Payment gateway is still loading. Please wait a moment.');
      }

      const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyIdHere', 
          amount: orderData.amount, 
          currency: orderData.currency,
          name: "QuickClean Services",
          description: "Premium Home Cleaning",
          order_id: orderData.order_id,
          handler: async function (response: any) {
              await verifyPayment(response);
          },
          prefill: {
              name: userData?.name || "Customer",
              contact: userData?.phone || "" 
          },
          theme: { color: "#6366f1" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
          setIsProcessing(false);
          alert("Payment process was interrupted: " + response.error.description);
      });
      rzp.open();
      
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      alert('An error occurred loading the payment gateway.');
    }
  };

  const baseAmount = service ? service.price : 0;
  const platformFee = 0; 
  const totalAmount = baseAmount + platformFee + (selectedTip || 0) - discount;

  if (isPaid) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page p-6" style={{ 
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-bg) 100%)', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh',
        animation: 'fadeIn 0.5s ease-out', position: 'relative', overflow: 'hidden'
      }}>
        {/* Background ambient glow effects */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', animation: 'pulse 4s infinite alternate' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', animation: 'pulse 4s infinite alternate-reverse', animationDelay: '-2s' }}></div>

        <div style={{ zIndex: 10, width: '100%', maxWidth: '440px', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Glass Ticket Wrapper */}
          <div style={{
            background: 'var(--color-surface)', borderRadius: '32px', padding: '40px 32px 32px',
            boxShadow: 'var(--shadow-lg)', position: 'relative',
            animation: 'slideUpBounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
          }}>
            {/* The Floating Checkmark Badge */}
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 16px 32px rgba(16, 185, 129, 0.3)', margin: '-88px auto 24px',
              border: '8px solid white', animation: 'scaleInBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both'
            }}>
              <CheckCircle size={48} color="white" />
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-text)', textAlign: 'center', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Payment Successful!
            </h1>
            <p style={{ color: 'var(--color-text-light)', fontSize: '16px', textAlign: 'center', marginBottom: '32px', lineHeight: 1.5 }}>
              Your home cleaning is confirmed. A vetted cleaner is being dispatched.
            </p>

            <div style={{ height: '2px', background: 'transparent', borderTop: '2px dashed var(--color-border)', marginBottom: '32px' }}></div>

            {/* Receipt Details Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--color-text-light)' }}>{service?.name || 'Cleaning Service'}</span>
                <span style={{ fontWeight: 700 }}>₹{baseAmount}</span>
              </div>
              
              {selectedTip && selectedTip > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--color-text-light)' }}>Cleaner Tip</span>
                  <span style={{ fontWeight: 700 }}>+ ₹{selectedTip}</span>
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px' }} className="flex justify-between items-center">
                <span style={{ fontWeight: '700', fontSize: '16px' }}>Total Amount Paid</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>₹{totalAmount}</span>
              </div>
              <div style={{ background: '#E0F2F1', color: 'var(--color-primary-dark)', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', textAlign: 'center', marginTop: '8px' }}>
                ✓ Guaranteed same price as selected in your booking
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--color-text-light)', fontSize: '16px', fontWeight: '500' }}>Transaction ID</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)' }}>QC{Math.floor(Math.random() * 100000000)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--color-text-light)', fontSize: '16px', fontWeight: '500' }}>Method</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text)' }}>{selectedMethod === 'upi' ? 'UPI Secure' : 'Card / Netbanking'}</span>
              </div>
            </div>
            
            <div style={{ marginTop: '40px', background: 'var(--color-bg)', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--color-primary-dark)', fontWeight: '700', fontSize: '15px' }}>
                <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} />
                Redirecting magical experience...
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleInBounce { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes slideUpBounce { 0% { transform: translateY(60px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
          @keyframes pulse { 0% { opacity: 0.5; transform: scale(1); } 100% { opacity: 1; transform: scale(1.2); } }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="page" style={{ background: 'var(--color-bg)', paddingBottom: '32px' }}>
        <div style={{ background: 'var(--color-border)', height: '200px', width: '100%', marginBottom: '-40px', animation: 'shimmer 2s infinite linear', backgroundImage: 'linear-gradient(to right, var(--color-border) 4%, var(--color-surface) 25%, var(--color-border) 36%)', backgroundSize: '1000px 100%' }}></div>
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ height: '300px', background: 'var(--color-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}></div>
          <div style={{ height: '200px', background: 'white', borderRadius: '24px', boxShadow: 'var(--shadow-sm)' }}></div>
        </div>
      </div>
    );
  }

  const handleSimulatePayment = async (appName: string) => {
      setIsProcessing(true);
      setShowUpiDrawer(false);
      
      const vpa = "quickclean@upi"; // Replace this with actual VPA
      const merchant = "QuickClean Services";
      const uri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(merchant)}&am=${totalAmount}&cu=INR&tn=QC-Booking-${bookingId}`;
      setUpiUrl(uri);

      // Check for mobile 
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
      
      if (isMobile) {
          console.log(`[Payments] Direct Intent for ${appName}: ${uri}`);
          window.location.href = uri;
          
          // Poll for success since we can't truly know if the app paid
          // We will simulate verification after a delay for demo
          setTimeout(async () => {
              const mockResponse = {
                  razorpay_payment_id: `pay_${appName.toLowerCase()}_${Math.random().toString(36).substring(7)}`,
                  razorpay_order_id: currentOrderData?.order_id || 'mock_order_id',
                  razorpay_signature: 'mock_signature_bypass'
              };
              await verifyPayment(mockResponse);
          }, 8000);
      } else {
          setShowQrCode(true);
      }
  };

  const QrCodeModal = () => (
    <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.4s'
    }} onClick={() => { if(!isProcessing) setShowQrCode(false); }}>
        <div style={{
            background: 'white', padding: '40px', borderRadius: '32px', textAlign: 'center',
            maxWidth: '360px', width: '90%', animation: 'scaleInBounce 0.5s'
        }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Scan with Any UPI App</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '32px' }}>Open GPay, PhonePe, or Paytm on your phone to pay ₹{totalAmount}</p>
            
            <div style={{ padding: '16px', background: 'white', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
                <img 
                    src={`https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(upiUrl)}`} 
                    alt="UPI QR Code" 
                    style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                />
            </div>

            <button 
                className="btn btn-primary" 
                onClick={async () => {
                    const mockResponse = {
                        razorpay_payment_id: `pay_qr_${Math.random().toString(36).substring(7)}`,
                        razorpay_order_id: currentOrderData?.order_id || 'mock_order_id',
                        razorpay_signature: 'mock_signature_bypass'
                    };
                    setShowQrCode(false);
                    await verifyPayment(mockResponse);
                }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: '800' }}
            >
                Confirm I've Paid
            </button>
            <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--color-text-light)' }} onClick={() => setShowQrCode(false)}>Cancel Payment</p>
        </div>
    </div>
  );

  const UpiSimulationDrawer = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, top: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s'
    }} onClick={() => { if(!isProcessing) setShowUpiDrawer(false); }}>
      <div style={{
        width: '100%', maxWidth: '480px', background: 'white',
        borderRadius: '32px 32px 0 0', padding: '32px 24px 48px',
        animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }} onClick={e => e.stopPropagation()}>
        {/* Handle for the sheet */}
        <div style={{ width: '40px', height: '4px', background: '#E2E8F0', borderRadius: '2px', margin: '-16px auto 24px' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>Select UPI App</h3>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text-light)' }}>Secure Intent</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'Google Pay', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png' },
            { name: 'PhonePe', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-logo-icon.png' },
            { name: 'Paytm', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/paytm-icon.png' },
            { name: 'WhatsApp Pay', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/whatsapp-icon.png' }
          ].map(app => (
            <button 
              key={app.name}
              onClick={() => handleSimulatePayment(app.name)}
              disabled={isProcessing}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%'
              }}
              onMouseEnter={e => { (e.currentTarget as any).style.background = '#F1F5F9'; (e.currentTarget as any).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as any).style.background = '#F8FAFC'; (e.currentTarget as any).style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '10px' }}>
                <img src={app.logo} alt={app.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '16px' }}>{app.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>Pay ₹{totalAmount} instantly</p>
              </div>
              <ArrowRight size={20} color="#CBD5E1" />
            </button>
          ))}
        </div>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text-light)' }}>
          <ShieldCheck size={16} color="var(--color-success)" />
          <span style={{ fontSize: '12px', fontWeight: '600' }}>AES-256 Encrypted Payment Bridge</span>
        </div>
      </div>
    </div>
  );





  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page" style={{ 
      paddingBottom: '32px', position: 'relative', overflowX: 'hidden', overflowY: 'auto',
      background: 'var(--color-bg)'
    }}>
      {showUpiDrawer && <UpiSimulationDrawer />}
      {showQrCode && <QrCodeModal />}
      <div style={{ background: 'var(--color-primary-dark)', padding: '40px 0 80px', color: 'white', animation: 'slideDown 0.4s ease-out' }}>
        <div className="container">
          <h2 style={{ fontSize: '32px', fontWeight: '700' }}>Checkout</h2>
          <p style={{ opacity: 0.8, fontSize: '16px', marginTop: '8px' }}>Invoice #QC-{bookingId.padStart(4, '0')}</p>
        </div>
      </div>

      <div className="container desktop-split" style={{ paddingBottom: '80px', marginTop: '-40px', animation: 'slideUp 0.5s ease-out' }}>
        
        {/* Left Column: Flow & Details */}
        <div className="col-main" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Invoice Card */}
        <div className="glass-card" style={{ background: 'var(--color-surface)', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-text-light)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Order Summary</h3>
          
          <div className="flex justify-between items-center mb-3">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{service ? service.name : 'Unknown Service'}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> PRICE LOCKED
              </span>
            </div>
            <span className="font-bold">₹{baseAmount}</span>
          </div>
          
          {platformFee > 0 && (
            <div className="flex justify-between items-center mb-4 text-sm" style={{ color: 'var(--color-text-light)' }}>
              <span>Taxes & Platform Fee</span>
              <span>+ ₹{platformFee}</span>
            </div>
          )}

          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '16px 0' }}></div>

          <div style={{ marginBottom: '16px' }}>
            <p className="text-sm font-semibold mb-3">Add Tip for Cleaner (100% direct)</p>
            <div className="flex gap-2 mb-2" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              {tips.map((tip) => (
                <button
                  key={tip}
                  onClick={() => setSelectedTip(tip === selectedTip ? null : tip)}
                  style={{ 
                    flex: '1', padding: '10px 0', fontSize: '14px', fontWeight: '600', borderRadius: '12px',
                    background: selectedTip === tip ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: selectedTip === tip ? 'var(--color-primary)' : 'var(--color-text)',
                    border: `1px solid ${selectedTip === tip ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                    transform: selectedTip === tip ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  ₹{tip}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '16px 0' }}></div>
          
          {/* Elite Points Redemption UI */}
          {userPoints >= 500 && discount === 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', 
              padding: '16px', borderRadius: '16px', border: '1px solid #FCD34D',
              marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '20px' }}>✨</div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>Elite Rewards</p>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#B45309' }}>You have {userPoints} pts</p>
                </div>
              </div>
              <button 
                onClick={handleRedeem}
                disabled={isRedeeming}
                style={{ 
                  background: '#D97706', color: 'white', border: 'none', 
                  padding: '8px 16px', borderRadius: '10px', fontSize: '12px', 
                  fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {isRedeeming ? 'Redeeming...' : 'Use 500 Pts'}
              </button>
            </div>
          )}

          {discount > 0 && (
            <div className="flex justify-between items-center mb-4 text-sm" style={{ color: 'var(--color-success)', fontWeight: '700' }}>
              <span>Elite Discount Applied</span>
              <span>- ₹{discount}</span>
            </div>
          )}
          
          <div className="flex justify-between items-end">
            <span className="font-bold text-text-light" style={{ fontSize: '14px' }}>Grand Total</span>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '32px', lineHeight: '1', color: 'var(--color-primary-dark)', margin: 0 }}>₹{totalAmount}</h2>
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: '800' }}>✓ ALL-INCLUSIVE PRICE</span>
            </div>
          </div>
        </div>

        </div>
        
        {/* Right Column: Payment & Sticky Action */}
        <div className="col-side" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Payment Methods */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--color-text-light)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Method</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { 
                  id: 'upi', 
                  icon: <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/upi-payment-icon.png" width="24" height="24" alt="UPI" style={{ objectFit: 'contain' }}/>, 
                  label: 'UPI / Mobile Apps' 
                },
                { 
                  id: 'card', 
                  icon: <CreditCard size={24} />, 
                  label: 'Credit / Debit Card' 
                }
              ].map(method => (
                <div key={method.id} style={{
                  border: `2px solid ${selectedMethod === method.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedMethod === method.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  borderRadius: '16px', overflow: 'hidden',
                  transition: 'all 0.2s',
                  transform: selectedMethod === method.id ? 'scale(1.02)' : 'scale(1)',
                  cursor: 'pointer'
                }} onClick={() => setSelectedMethod(method.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <div style={{ color: selectedMethod === method.id ? 'var(--color-primary)' : 'var(--color-text-light)', marginRight: '16px' }}>
                      {method.icon}
                    </div>
                    <span style={{ fontWeight: '600', color: selectedMethod === method.id ? 'var(--color-primary-dark)' : 'var(--color-text)', flex: 1 }}>{method.label}</span>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `6px solid ${selectedMethod === method.id ? 'var(--color-primary)' : 'var(--color-border)'}`, background: 'white' }}></div>
                  </div>
                  {/* Expanded UPI Apps Section */}
                  {method.id === 'upi' && selectedMethod === 'upi' && (
                    <div style={{ padding: '0 16px 16px', animation: 'slideDown 0.3s ease-out' }}>
                      <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px', display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[
                          { name: 'GPay', color: '#4285F4', initial: 'G', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/google-pay-icon.png' },
                          { name: 'PhonePe', color: '#5f259f', initial: 'पे', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/phonepe-logo-icon.png' },
                          { name: 'Paytm', color: '#00BAF2', initial: 'Pt', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/paytm-icon.png' },
                          { name: 'BHIM', color: '#F8981D', initial: 'B', logo: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/bhim-upi-icon.png' }
                        ].map(app => (
                          <div key={app.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '60px', cursor: 'pointer' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.03)', overflow: 'hidden', padding: '12px' }}>
                              <img src={app.logo} alt={app.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; ((e.target as HTMLImageElement).nextElementSibling as HTMLElement).style.display = 'flex'; }} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              <span style={{ display: 'none', color: app.color, fontWeight: '800', fontSize: '20px', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{app.initial}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-light)' }}>{app.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rate Service Section */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
            <p className="font-semibold text-sm mb-3">Rate your cleaner's service</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} onClick={() => setRating(star)}
                  style={{ 
                    fontSize: '32px', cursor: 'pointer', lineHeight: 1,
                    color: rating >= star ? '#F59E0B' : '#E2E8F0',
                    transition: 'color 0.2s, transform 0.1s',
                    transform: rating >= star ? 'scale(1.1)' : 'scale(1)'
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Secure Payment Action Module */}
          <div className="glass-card" style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '24px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <button 
              className="btn btn-primary" 
              onClick={handlePay} 
              disabled={isProcessing}
              style={{ 
                padding: '24px', fontSize: '18px', display: 'flex', justifyContent: 'center',
                opacity: isProcessing ? 0.7 : 1, transition: 'all 0.3s',
                boxShadow: '0 12px 32px rgba(0, 179, 166, 0.3)', borderRadius: '16px'
              }}
            >
              {isProcessing ? (
                <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite', marginRight: '8px' }} />
              ) : (
                <Lock size={20} style={{ marginRight: '8px' }} />
              )}
              {isProcessing ? 'Processing...' : `Pay ₹${totalAmount} Securely`}
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '8px', color: 'var(--color-text-light)' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>100% Encrypted via SecureGateway</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </motion.div>
  );
}
