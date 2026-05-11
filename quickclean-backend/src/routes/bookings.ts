import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDb } from '../config/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

// Create a new booking
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { serviceId, address, lat, lng } = req.body;
    const userId = req.user!.userId;
    const db = getDb();

    // Fetch service info
    let serviceData = { name: 'QuickClean Service', price: 249 };
    try {
      const service = await db.collection('services').findOne({ _id: new ObjectId(serviceId) });
      if (service) serviceData = { name: service.name, price: service.price };
    } catch (e) {}

    const result = await db.collection('bookings').insertOne({
      userId: new ObjectId(userId),
      serviceId: new ObjectId(serviceId),
      service: serviceData,
      address: address || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      status: 'FINDING_CLEANER',
      createdAt: new Date()
    });

    const bookingId = result.insertedId.toString();

    // Background: assign a cleaner after 2 seconds
    setTimeout(async () => {
      try {
        const cleaner = await db.collection('cleaners').findOne({});
        let cleanerId;
        let cleanerData;
        
        if (!cleaner) {
          const newCleaner = { name: 'Priya S.', phone: '9876543210', rating: 4.9, cleans: 420 };
          const cResult = await db.collection('cleaners').insertOne(newCleaner);
          cleanerId = cResult.insertedId;
          cleanerData = newCleaner;
        } else {
          cleanerId = cleaner._id;
          cleanerData = cleaner;
        }

        await db.collection('bookings').updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { 
            status: 'EN_ROUTE', 
            cleanerId: cleanerId,
            cleaner: cleanerData,
            etaMins: 3 
          }}
        );
        console.log(`✨ Cleaner assigned to booking: ${bookingId}`);
      } catch (dispatchErr) {
        console.error('❌ Background Dispatch Error:', dispatchErr);
      }
    }, 2000);

    res.json({ message: 'Booking requested', bookingId });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get booking status
router.get('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.id as string;
    const userId = req.user!.userId;
    const db = getDb();

    let booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });

    if (!booking) {
      // Mock response for fallback
      return res.json({
        id: bookingId,
        status: 'ARRIVED',
        etaMins: 0,
        service: { name: 'Quick Sweep & Mop', price: 149, icon: '🧹' },
        cleaner: { name: 'Priya S.', rating: 4.9, cleans: 420 },
        lat: 17.3850,
        lng: 78.4867
      });
    }

    if (booking.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Simulate ETA countdown if EN_ROUTE
    if (booking.status === 'EN_ROUTE' && booking.etaMins !== null) {
      if (booking.etaMins > 0) {
        const newEta = booking.etaMins - 1;
        await db.collection('bookings').updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { etaMins: newEta } }
        );
        booking.etaMins = newEta;
      } else {
        await db.collection('bookings').updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { status: 'ARRIVED' } }
        );
        booking.status = 'ARRIVED';
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
