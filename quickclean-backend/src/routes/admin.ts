import { Router, Response } from 'express';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';
import { db } from '../config/firebaseAdmin';

const router = Router();

// Apply auth & admin middleware to all routes in this file
router.use(authenticate, isAdmin);

// GET /api/admin/stats/overview - Key Performance Indicators
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const bookingsSnap = await db.collection('bookings').get();
    const totalBookingsCount = bookingsSnap.size;
    
    // Calculate Total Revenue from COMPLETED bookings
    const completedBookings = bookingsSnap.docs.map(d => d.data()).filter((b: any) => b.status === 'COMPLETED');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);
    
    // New Users in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const usersSnap = await db.collection('users').where('createdAt', '>=', sevenDaysAgo.toISOString()).get();
    const newUsers = usersSnap.size;

    const activeBookings = bookingsSnap.docs.filter((d: any) => ['ASSIGNED', 'FINDING_CLEANER'].includes(d.data().status)).length;

    res.json({
      totalRevenue,
      totalBookings: totalBookingsCount,
      newUsers,
      activeBookings
    });
  } catch (error) {
    console.error('📊 Admin Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

// GET /api/admin/stats/services - Service Popularity Breakdown
router.get('/stats/services', async (req: AuthRequest, res) => {
  try {
    const bookingsSnap = await db.collection('bookings').get();
    const bookings = bookingsSnap.docs.map(d => d.data());
    
    const serviceCounts: Record<string, number> = {};
    bookings.forEach((b: any) => {
        if (b.serviceId) {
            serviceCounts[b.serviceId] = (serviceCounts[b.serviceId] || 0) + 1;
        }
    });

    const servicesSnap = await db.collection('services').get();
    const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const chartData = Object.entries(serviceCounts).map(([serviceId, count]) => {
      const service: any = services.find(s => s.id === serviceId);
      return {
        name: service?.name || 'Unknown',
        value: count
      };
    });

    res.json(chartData);
  } catch (error) {
    console.error('📈 Admin Service Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch service stats' });
  }
});

// GET /api/admin/stats/cleaners - Cleaner Leaderboard
router.get('/stats/cleaners', async (req: AuthRequest, res) => {
  try {
    const cleanersSnap = await db.collection('cleaners').orderBy('cleans', 'desc').limit(5).get();
    const cleaners = cleanersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(cleaners);
  } catch (error) {
    console.error('🏆 Admin Cleaner Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch cleaner leaderboard' });
  }
});

export default router;
