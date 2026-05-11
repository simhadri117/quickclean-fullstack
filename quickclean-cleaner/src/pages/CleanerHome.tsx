import { useState, useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, collection, query,
  where, onSnapshot, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  MapPin, Navigation, CheckCircle2, Clock, DollarSign,
  Briefcase, LogOut, WifiOff, AlertCircle, Loader2,
  ChevronRight, Star, Zap, Image as ImageIcon
} from 'lucide-react';
import { MediaUploader } from '../components/MediaUploader';

interface CleanerProfile {
  name: string;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  lastUpdated: Timestamp | null;
  activeBookingId: string | null;
  earnings: number;
  completedJobs: number;
}

interface Booking {
  id: string;
  status: string;
  address: string;
  serviceName: string;
  servicePrice: number;
  userName: string;
  userPhone: string;
  createdAt: string;
}

const GPS_UPDATE_INTERVAL_MS = 6000; // every 6 seconds

export default function CleanerHome({ user }: { user: User }) {
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [activeJob, setActiveJob] = useState<Booking | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'tracking' | 'error'>('idle');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [updatingJob, setUpdatingJob] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // ─── Load cleaner profile ───────────────────────────────────────────────
  useEffect(() => {
    const cleanerRef = doc(db, 'cleaners', user.uid);

    const unsub = onSnapshot(cleanerRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CleanerProfile;
        setProfile(data);
        setIsOnline(data.isOnline);
      } else {
        // First time — create cleaner document
        const newProfile: CleanerProfile = {
          name: user.displayName || user.email?.split('@')[0] || 'Cleaner',
          isOnline: false,
          lat: null, lng: null,
          lastUpdated: null,
          activeBookingId: null,
          earnings: 0,
          completedJobs: 0,
        };
        await setDoc(cleanerRef, { ...newProfile, uid: user.uid, email: user.email });
        setProfile(newProfile);
      }
      setPageLoading(false);
    });

    return () => unsub();
  }, [user]);

  // ─── Listen to active job (assigned to this cleaner) ───────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('cleanerId', '==', user.uid),
      where('status', 'in', ['ASSIGNED', 'EN_ROUTE', 'ACCEPTED', 'confirmed', 'in_progress'])
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const jobDoc = snap.docs[0];
        const data = jobDoc.data();

        // Resolve service name
        let serviceName = 'Cleaning Service';
        let servicePrice = 0;
        if (data.serviceId) {
          const svcDoc = await getDoc(doc(db, 'services', data.serviceId));
          if (svcDoc.exists()) {
            serviceName = svcDoc.data().name;
            servicePrice = svcDoc.data().price || 0;
          }
        }
        // Resolve user name/phone
        let userName = 'Customer';
        let userPhone = '';
        if (data.userId) {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) {
            userName = userDoc.data().name || 'Customer';
            userPhone = userDoc.data().phone || '';
          }
        }

        setActiveJob({
          id: jobDoc.id,
          status: data.status,
          address: data.address || 'Address not specified',
          serviceName,
          servicePrice,
          userName,
          userPhone,
          createdAt: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        });
      } else {
        setActiveJob(null);
      }
    });

    return () => unsub();
  }, [user]);

  // ─── Listen to available jobs (pending, no cleaner) ────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', ['FINDING_WORKER', 'FINDING_CLEANER'])
    );

    const unsub = onSnapshot(q, async (snap) => {
      const jobs: Booking[] = [];

      for (const jobDoc of snap.docs) {
        const data = jobDoc.data();
        if (data.cleanerId) continue; // skip taken jobs

        let serviceName = 'Cleaning Service';
        let servicePrice = 0;
        if (data.serviceId) {
          const svcDoc = await getDoc(doc(db, 'services', data.serviceId));
          if (svcDoc.exists()) {
            serviceName = svcDoc.data().name;
            servicePrice = svcDoc.data().price || 0;
          }
        }

        jobs.push({
          id: jobDoc.id,
          status: data.status,
          address: data.address || 'Address not specified',
          serviceName,
          servicePrice,
          userName: 'Customer',
          userPhone: '',
          createdAt: data.timestamp?.toDate?.().toISOString() || new Date().toISOString(),
        });
      }

      setAvailableJobs(jobs);
    });

    return () => unsub();
  }, [user]);

  // ─── GPS Tracking Logic ─────────────────────────────────────────────────
  const pushLocationToFirestore = useCallback(async (lat: number, lng: number) => {
    try {
      await updateDoc(doc(db, 'cleaners', user.uid), {
        lat,
        lng,
        lastUpdated: serverTimestamp(),
      });
    } catch { /* silently fail */ }
  }, [user.uid]);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('tracking');

    // Immediately get position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentCoords({ lat, lng });
        pushLocationToFirestore(lat, lng);
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true }
    );

    // Poll every 6s
    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCurrentCoords({ lat, lng });
          pushLocationToFirestore(lat, lng);
        },
        () => { /* suppress interval errors */ },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }, GPS_UPDATE_INTERVAL_MS);
  }, [pushLocationToFirestore]);

  const stopGPS = useCallback(() => {
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    gpsIntervalRef.current = null;
    watchIdRef.current = null;
    setGpsStatus('idle');
    setCurrentCoords(null);
  }, []);

  // ─── Online/Offline Toggle ──────────────────────────────────────────────
  const toggleOnline = async () => {
    setTogglingOnline(true);
    const newStatus = !isOnline;
    try {
      await updateDoc(doc(db, 'cleaners', user.uid), {
        isOnline: newStatus,
        ...(newStatus ? {} : { lat: null, lng: null }),
      });
      setIsOnline(newStatus);
      if (newStatus) startGPS();
      else stopGPS();
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setTogglingOnline(false);
    }
  };

  // Start/stop GPS based on online status
  useEffect(() => {
    if (isOnline) startGPS();
    else stopGPS();
    return () => stopGPS();
  }, [isOnline, startGPS, stopGPS]);

  // ─── Job Actions ───────────────────────────────────────────────────────
  const acceptJob = async (jobId: string) => {
    setUpdatingJob(true);
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        cleanerId: user.uid,
        workerId: user.uid,
        status: 'ASSIGNED',
      });
      await updateDoc(doc(db, 'cleaners', user.uid), { activeBookingId: jobId });
    } catch (err) { console.error(err); }
    finally { setUpdatingJob(false); }
  };

  const startJob = async () => {
    if (!activeJob) return;
    setUpdatingJob(true);
    try {
      await updateDoc(doc(db, 'bookings', activeJob.id), { status: 'EN_ROUTE' });
    } catch (err) { console.error(err); }
    finally { setUpdatingJob(false); }
  };

  const completeJob = async () => {
    if (!activeJob) return;
    setUpdatingJob(true);
    try {
      const payout = Math.round(activeJob.servicePrice * 0.7);
      await updateDoc(doc(db, 'bookings', activeJob.id), { status: 'COMPLETED' });
      await updateDoc(doc(db, 'cleaners', user.uid), {
        activeBookingId: null,
        completedJobs: (profile?.completedJobs || 0) + 1,
        earnings: (profile?.earnings || 0) + payout,
        lastJobPhotos: (activeJob as any).photos || []
      });
    } catch (err) { console.error(err); }
    finally { setUpdatingJob(false); }
  };

  const handleLogout = async () => {
    stopGPS();
    if (user) {
      await updateDoc(doc(db, 'cleaners', user.uid), { isOnline: false, lat: null, lng: null });
    }
    await signOut(auth);
  };

  if (pageLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Loader2 size={40} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading your hub...</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const cleanerName = profile?.name || user.email?.split('@')[0] || 'Cleaner';
  const initial = cleanerName.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100dvh', padding: '0 0 40px', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '-15%', right: '-15%', width: '50vw', height: '50vw', maxWidth: 350, background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '10%', left: '-20%', width: '45vw', height: '45vw', maxWidth: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>

        {/* ── Header ─────────────────────────────────────── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #7c3aed, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: 'white', boxShadow: '0 8px 20px rgba(124,58,237,0.4)', flexShrink: 0 }}>
              {initial}
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>WELCOME BACK</p>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{cleanerName}</h1>
            </div>
          </div>
          <button id="logout-btn" onClick={handleLogout} className="btn btn-ghost" style={{ padding: '10px 14px', gap: 6 }}>
            <LogOut size={16} /> <span style={{ fontSize: 13 }}>Out</span>
          </button>
        </header>

        {/* ── Online Toggle Card ──────────────────────────── */}
        <div className="glass-card animate-fade-up" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 4 }}>STATUS</p>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>
                {isOnline ? '🟢 You’re Online' : '⚪ You’re Offline'}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {isOnline ? 'Accepting jobs & broadcasting GPS' : 'Toggle to start receiving jobs'}
              </p>
            </div>
            <div
              id="online-toggle"
              className={`toggle-track ${isOnline ? 'on' : 'off'} ${togglingOnline ? 'btn' : ''}`}
              onClick={!togglingOnline ? toggleOnline : undefined}
              style={{ cursor: togglingOnline ? 'wait' : 'pointer', flexShrink: 0 }}
              role="switch"
              aria-checked={isOnline}
            >
              <div className="toggle-thumb" />
            </div>
          </div>

          {/* GPS status bar */}
          {isOnline && (
            <div style={{ marginTop: 20, padding: '12px 16px', background: gpsStatus === 'tracking' ? 'rgba(16,185,129,0.1)' : gpsStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 14, border: `1px solid ${gpsStatus === 'tracking' ? 'rgba(16,185,129,0.3)' : gpsStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              {gpsStatus === 'tracking' ? (
                <>
                  <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10b981' }} className="status-dot-online" />
                  </div>
                  <Navigation size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                    GPS Live {currentCoords ? `· ${currentCoords.lat.toFixed(4)}°, ${currentCoords.lng.toFixed(4)}°` : '· Acquiring...'}
                  </span>
                </>
              ) : gpsStatus === 'error' ? (
                <>
                  <AlertCircle size={14} style={{ color: '#f87171' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>GPS Error — Allow location permission</span>
                </>
              ) : (
                <>
                  <Loader2 size={14} style={{ color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Starting GPS...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Stats Row ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatPill icon={<DollarSign size={16} />} label="Earned" value={`₹${profile?.earnings || 0}`} color="#a78bfa" />
          <StatPill icon={<CheckCircle2 size={16} />} label="Done" value={String(profile?.completedJobs || 0)} color="#34d399" />
          <StatPill icon={<Star size={16} />} label="Rating" value="4.9" color="#fbbf24" />
        </div>

        {/* ── Active Job Card ─────────────────────────────── */}
        {activeJob && (
          <div className="animate-fade-up" style={{ marginBottom: 20 }}>
            <SectionTitle icon={<Zap size={16} style={{ color: '#fbbf24' }} />} title="Active Job" />
            <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: 8, display: 'inline-block', marginBottom: 10 }}>
                    {activeJob.status.toUpperCase().replace('_', ' ')}
                  </span>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: 'white', marginBottom: 6 }}>{activeJob.serviceName}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{activeJob.userName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>PAYOUT</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#34d399' }}>₹{Math.round(activeJob.servicePrice * 0.7)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 20 }}>
                <MapPin size={16} style={{ color: '#ec4899', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{activeJob.address}</p>
              </div>

              {activeJob.status === 'in_progress' && (
                <div style={{ marginBottom: 20 }}>
                   <p style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase' }}>📸 Proof of Work</p>
                   <MediaUploader 
                    collectionName="bookings" 
                    folderName={`proof_${activeJob.id}`} 
                    onUploadComplete={async (urls) => {
                      await updateDoc(doc(db, 'bookings', activeJob.id), {
                        photos: urls
                      });
                    }}
                  />
                </div>
              )}

              {activeJob.status === 'ACCEPTED' && (
                <button id="start-job-btn" onClick={startJob} disabled={updatingJob} className="btn btn-green" style={{ width: '100%' }}>
                  {updatingJob ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Navigation size={18} /> Start Job — I’m On The Way</>}
                </button>
              )}
              {activeJob.status === 'in_progress' && (
                <button id="complete-job-btn" onClick={completeJob} disabled={updatingJob} className="btn" style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #ec4899)', color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
                  {updatingJob ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={18} /> Mark Job Completed</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Available Jobs ──────────────────────────────── */}
        {!activeJob && isOnline && (
          <div className="animate-fade-up">
            <SectionTitle icon={<Briefcase size={16} style={{ color: '#a78bfa' }} />} title={`Available Jobs (${availableJobs.length})`} />

            {availableJobs.length > 0 ? availableJobs.map((job) => (
              <div key={job.id} className="glass-card" style={{ padding: 20, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '3px 8px', borderRadius: 6 }}>NEW</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                      {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 6 }}>{job.serviceName}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} style={{ color: '#ec4899', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.address}
                    </p>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#34d399', marginTop: 8 }}>Payout: ₹{Math.round(job.servicePrice * 0.7)}</p>
                </div>
                <button
                  id={`accept-job-${job.id}`}
                  onClick={() => acceptJob(job.id)}
                  disabled={updatingJob}
                  className="btn btn-primary"
                  style={{ flexShrink: 0, padding: '12px 18px', gap: 4 }}
                >
                  Accept <ChevronRight size={16} />
                </button>
              </div>
            )) : (
              <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Clock size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <h4 style={{ fontWeight: 800, fontSize: 18, color: 'white', marginBottom: 8 }}>All Clear!</h4>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                  No jobs nearby right now. New requests will appear here automatically.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="animate-ping-slow" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>Searching live...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Media Gallery ────────────────────────────────── */}
        <div className="animate-fade-up" style={{ marginTop: 32 }}>
          <SectionTitle icon={<ImageIcon size={16} style={{ color: '#ec4899' }} />} title="Media Gallery" />
          <MediaUploader 
            collectionName="cleaner_media" 
            folderName="cleaner_uploads" 
            onUploadComplete={(urls) => console.log('Uploaded:', urls)}
          />
        </div>

        {/* Offline placeholder */}
        {!isOnline && !activeJob && (
          <div className="glass-card animate-fade-up" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <WifiOff size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <h4 style={{ fontWeight: 800, fontSize: 20, color: 'white', marginBottom: 8 }}>You’re Offline</h4>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6 }}>
              Toggle the switch above to go online and start receiving jobs near you.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ─── Small helper components ────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color }}>{icon}</div>
      <p style={{ fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{label.toUpperCase()}</p>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {icon}
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{title}</h2>
    </div>
  );
}
