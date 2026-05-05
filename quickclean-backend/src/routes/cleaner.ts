import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/firebaseAdmin';

const router = Router();

// GET /api/cleaner/stats - Get cleaner's stats (earnings, jobs)
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const cleanerId = req.user?.userId;
    if (!cleanerId) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await db.collection('bookings').where('cleanerId', '==', cleanerId).where('status', '==', 'COMPLETED').get();
    const completedBookings = snapshot.docs.map(doc => doc.data());

    const earnings = completedBookings.reduce((sum, b) => sum + ((b.service?.price || 0) + (b.tip || 0)) * 0.7, 0); // 70% commission + tips

    res.json({
      earnings: Math.round(earnings),
      completedJobs: completedBookings.length,
      hoursOnline: 4.5, // Placeholder
    });
  } catch (error) {
    console.error('📊 Cleaner Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/cleaner/available - Get available pending requests
router.get('/available', authenticate, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('bookings').where('status', '==', 'FINDING_CLEANER').get();
    // In Firestore, checking for null requires a different approach or filtering post-query if not indexed properly.
    // Assuming cleanerId is missing or null.
    const bookings = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((b: any) => !b.cleanerId)
      .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.json(bookings);
  } catch (error) {
    console.error('🚚 Available Jobs Error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/cleaner/accept/:id - Accept a booking
router.post('/accept/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.id as string;
    const cleanerId = req.user?.userId;

    if (!cleanerId) return res.status(401).json({ error: 'Unauthorized' });

    // Update booking to ASSIGNED
    await db.collection('bookings').doc(bookingId).update({
      cleanerId,
      status: 'ASSIGNED',
    });

    res.json({ id: bookingId, cleanerId, status: 'ASSIGNED' });
  } catch (error) {
    console.error('✅ Accept Job Error:', error);
    res.status(500).json({ error: 'Failed to accept job' });
  }
});

// POST /api/cleaner/complete/:id - Complete a booking & award points
router.post('/complete/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.id as string;
    const cleanerId = req.user?.userId;

    if (!cleanerId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Get booking details (to find user and price)
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found' });
    const booking: any = { id: doc.id, ...doc.data() };

    if (booking.cleanerId !== cleanerId) return res.status(403).json({ error: 'Not your booking' });

    // 2. Update booking status
    await db.collection('bookings').doc(bookingId).update({ status: 'COMPLETED' });

    // 3. Award points to user (10% of service price)
    const pointsEarned = Math.round((booking.service?.price || 0) * 0.1);
    
    // 4. Update User Points and Tier
    const userDoc = await db.collection('users').doc(booking.userId).get();
    if (userDoc.exists) {
      const user: any = userDoc.data();
      const newPoints = (user.points || 0) + pointsEarned;
      const newCleans = (user.totalCleans || 0) + 1;
      let newTier = user.tier || 'SILVER';
      
      if (newCleans >= 15 && newTier !== 'ELITE') newTier = 'ELITE';
      else if (newCleans >= 6 && newTier === 'SILVER') newTier = 'GOLD';

      await db.collection('users').doc(booking.userId).update({
        points: newPoints,
        totalCleans: newCleans,
        tier: newTier
      });
    }

    res.json({ message: 'Job Completed! Points awarded.', booking: { ...booking, status: 'COMPLETED' }, pointsEarned });
  } catch (error) {
    console.error('🏆 Complete Job Error:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

export default router;
