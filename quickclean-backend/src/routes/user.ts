import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb } from '../config/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

// GET /api/user/profile - Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const db = getDb();

    let user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      console.log(`🆕 Creating new profile for user: ${userId}`);
      const identifier = req.user?.email || `user_${userId.slice(0, 8)}`;
      
      const newUser = {
        _id: new ObjectId(userId),
        phone: identifier,
        name: req.user?.email?.split('@')[0] || 'QuickClean User',
        points: 0,
        createdAt: new Date()
      };
      await db.collection('users').insertOne(newUser);
      user = newUser;
    }

    res.json({ ...user, id: user._id.toString() });
  } catch (error: any) {
    console.error('👤 Profile Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/user/bookings - Get user order history
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const db = getDb();

    const bookings = await db.collection('bookings')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(bookings.map(b => ({ ...b, id: b._id.toString() })));
  } catch (error) {
    console.error('📋 Booking History Error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/user/rewards/redeem - Redeem points for discount
router.post('/rewards/redeem', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { amount } = req.body;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!amount || amount < 500) return res.status(400).json({ error: 'Minimum redemption is 500 points' });
    const db = getDb();

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.points || user.points < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    const newPoints = user.points - amount;
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { points: newPoints } }
    );

    res.json({ 
      message: `Successfully redeemed ${amount} points!`, 
      discountValue: Math.floor(amount / 10),
      remainingPoints: newPoints 
    });
  } catch (error) {
    console.error('🎁 Redemption Error:', error);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

export default router;
