import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/firebaseAdmin';

const router = Router();

// GET /api/user/profile - Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await db.collection('users').doc(userId).get();
    let user;

    if (!doc.exists) {
      console.log(`🆕 Creating new profile for user: ${userId}`);
      // If user profile doesn't exist yet, create it from Supabase session
      // Use email as phone if phone is missing, but make it unique
      const identifier = req.user?.email || `user_${userId.slice(0, 8)}`;
      
      user = {
        id: userId,
        phone: identifier,
        name: req.user?.email?.split('@')[0] || 'QuickClean User',
        points: 0
      };
      await db.collection('users').doc(userId).set(user);
    } else {
      user = { id: doc.id, ...doc.data() };
    }

    res.json(user);
  } catch (error: any) {
    console.error('👤 Profile Error Details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// GET /api/user/bookings - Get user order history
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const snapshot = await db.collection('bookings').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(bookings);
  } catch (error) {
    console.error('📋 Booking History Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/user/rewards/redeem - Redeem points for discount
router.post('/rewards/redeem', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { amount } = req.body; // e.g., 500 points
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!amount || amount < 500) return res.status(400).json({ error: 'Minimum redemption is 500 points' });

    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const user: any = { id: doc.id, ...doc.data() };
    
    if (!user.points || user.points < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Deduct points
    const newPoints = user.points - amount;
    await db.collection('users').doc(userId).update({ points: newPoints });

    const discountValue = Math.floor(amount / 10); // 500 pts = ₹50

    res.json({ 
      message: `Successfully redeemed ${amount} points!`, 
      discountValue,
      remainingPoints: newPoints 
    });
  } catch (error) {
    console.error('🎁 Redemption Error:', error);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

export default router;
