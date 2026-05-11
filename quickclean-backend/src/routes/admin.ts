import { Router, Response } from 'express';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';
import { getDb } from '../config/mongodb';

const router = Router();

// Apply auth & admin middleware to all routes in this file
router.use(authenticate, isAdmin);

// GET /api/admin/stats/overview - Key Performance Indicators
router.get('/stats/overview', async (req: AuthRequest, res) => {
  try {
    const db = getDb();
    const bookings = await db.collection('bookings').find({}).toArray();
    const totalBookingsCount = bookings.length;
    
    // Calculate Total Revenue from COMPLETED bookings
    const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);
    
    // New Users in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers = await db.collection('users').countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    const activeBookings = bookings.filter((b: any) => ['ASSIGNED', 'FINDING_CLEANER'].includes(b.status)).length;

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
    const db = getDb();
    const bookings = await db.collection('bookings').find({}).toArray();
    
    const serviceCounts: Record<string, number> = {};
    bookings.forEach((b: any) => {
        if (b.serviceId) {
            const sid = b.serviceId.toString();
            serviceCounts[sid] = (serviceCounts[sid] || 0) + 1;
        }
    });

    const services = await db.collection('services').find({}).toArray();

    const chartData = Object.entries(serviceCounts).map(([serviceId, count]) => {
      const service: any = services.find(s => s._id.toString() === serviceId);
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
    const db = getDb();
    const cleaners = await db.collection('cleaners')
      .find({})
      .sort({ cleans: -1 })
      .limit(5)
      .toArray();
      
    res.json(cleaners.map(c => ({ ...c, id: c._id.toString() })));
  } catch (error) {
    console.error('🏆 Admin Cleaner Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch cleaner leaderboard' });
  }
});

export default router;
