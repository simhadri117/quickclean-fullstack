import { collection, onSnapshot, query, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ──────────────────────────────────────────────
export interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  service?: { name: string; price: number };
  cleaner?: { name: string; rating: number };
  cleanerId?: string;
  address?: string;
  status: 'FINDING_CLEANER' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  etaMins?: number;
  lat?: number;
  lng?: number;
}

export interface Cleaner {
  id: string;
  name: string;
  phone: string;
  rating: number;
  cleans: number;
  availability?: 'online' | 'offline' | 'busy';
  earnings?: number;
}

export interface Activity {
  id: string;
  type: 'booking' | 'payment' | 'worker' | 'user';
  message: string;
  time: string;
  icon: string;
  color: string;
}

// ─── Real-time Listeners ────────────────────────────────
export function subscribeToBookings(
  callback: (bookings: Booking[]) => void,
  limitCount = 50
) {
  const q = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, (snap) => {
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
    callback(bookings);
  });
}

export function subscribeToCleaners(callback: (cleaners: Cleaner[]) => void) {
  return onSnapshot(collection(db, 'cleaners'), (snap) => {
    const cleaners = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cleaner));
    callback(cleaners);
  });
}

// ─── One-time Fetches ───────────────────────────────────
export async function fetchAdminStats() {
  const [bookingsSnap, usersSnap, cleanersSnap] = await Promise.all([
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'cleaners')),
  ]);

  const bookings = bookingsSnap.docs.map(d => d.data() as Booking);
  const completed = bookings.filter(b => b.status === 'COMPLETED');
  const today = new Date().toDateString();
  const todayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === today);
  const totalRevenue = completed.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const activeBookings = bookings.filter(b => ['FINDING_CLEANER', 'EN_ROUTE', 'ARRIVED'].includes(b.status));

  return {
    totalBookings: bookingsSnap.size,
    todayBookings: todayBookings.length,
    totalRevenue,
    activeBookings: activeBookings.length,
    totalUsers: usersSnap.size,
    totalWorkers: cleanersSnap.size,
    completedBookings: completed.length,
  };
}

export async function fetchRevenueChart(days = 7) {
  const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(500)));
  const bookings = snap.docs.map(d => d.data() as Booking);

  const result: { label: string; revenue: number; bookings: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const ds = d.toDateString();
    const dayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === ds);
    const revenue = dayBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.service?.price || 0), 0);
    result.push({ label, revenue, bookings: dayBookings.length });
  }
  return result;
}

export async function fetchServiceChart() {
  const snap = await getDocs(collection(db, 'bookings'));
  const counts: Record<string, { name: string; count: number }> = {};
  snap.docs.forEach(d => {
    const b = d.data() as Booking;
    const name = b.service?.name || 'Unknown';
    if (!counts[name]) counts[name] = { name, count: 0 };
    counts[name].count++;
  });
  return Object.values(counts);
}

// ─── Mutations ──────────────────────────────────────────
export async function updateBookingStatus(bookingId: string, status: Booking['status']) {
  await updateDoc(doc(db, 'bookings', bookingId), { status });
}

export async function assignCleanerToBooking(bookingId: string, cleanerId: string, cleanerName: string) {
  await updateDoc(doc(db, 'bookings', bookingId), {
    cleanerId,
    cleaner: { name: cleanerName, rating: 4.8 },
    status: 'EN_ROUTE',
    etaMins: 5,
  });
}

// ─── Generate mock activity from bookings ───────────────
export function generateActivity(bookings: Booking[]): Activity[] {
  return bookings.slice(0, 12).map(b => {
    const types = [
      { type: 'booking' as const, icon: '📋', color: 'rgba(99,102,241,0.15)', message: `New booking for <strong>${b.service?.name || 'Service'}</strong>` },
      { type: 'payment' as const, icon: '💳', color: 'rgba(16,185,129,0.15)', message: `Payment of <strong>₹${b.service?.price || 0}</strong> received` },
      { type: 'worker' as const, icon: '🔧', color: 'rgba(245,158,11,0.15)', message: `Worker <strong>${b.cleaner?.name || 'assigned'}</strong> dispatched` },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    return { id: b.id, ...t, time: formatTime(b.createdAt) };
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-IN');
}
