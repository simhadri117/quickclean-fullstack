import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { db } from '../config/firebaseAdmin';

const router = Router();

// Create a new booking
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { serviceId, address, lat, lng } = req.body;
    const userId = req.user!.userId;

    let bookingId = 'mock-' + Date.now();
    
    try {
      const serviceDoc = await db.collection('services').doc(serviceId).get();
      const serviceData = serviceDoc.exists ? serviceDoc.data() : { name: 'QuickClean Service', price: 249 };

      const bookingRef = db.collection('bookings').doc();
      bookingId = bookingRef.id;
      
      const booking = {
          id: bookingId,
          userId, 
          serviceId, 
          service: serviceData,
          address: address || null,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          status: 'FINDING_CLEANER',
          createdAt: new Date().toISOString()
      };
      await bookingRef.set(booking);

      // Background: assign a cleaner after 2 seconds
      setTimeout(async () => {
        try {
          const snapshot = await db.collection('cleaners').limit(1).get();
          let cleanerId;
          let cleanerData;
          
          if (snapshot.empty) {
            const newRef = db.collection('cleaners').doc();
            cleanerId = newRef.id;
            cleanerData = { name: 'Priya S.', phone: '9876543210', rating: 4.9, cleans: 420 };
            await newRef.set(cleanerData);
          } else {
            cleanerId = snapshot.docs[0].id;
            cleanerData = snapshot.docs[0].data();
          }

          await db.collection('bookings').doc(bookingId).update({ 
            status: 'EN_ROUTE', 
            cleanerId: cleanerId,
            cleaner: cleanerData,
            etaMins: 3 
          });
          console.log(`✨ Cleaner assigned to booking: ${bookingId}`);
        } catch (dispatchErr) {
          console.error('❌ Background Dispatch Error:', dispatchErr);
        }
      }, 2000);

    } catch (dbErr: any) {
      console.error('⚠️ Booking DB Error (using mock ID):', dbErr?.message || dbErr);
    }

    res.json({ message: 'Booking requested', bookingId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get booking status
router.get('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const bookingId = req.params.id as string;
    const userId = req.user!.userId;

    // Try to fetch from DB
    let booking: any = null;
    try {
      const doc = await db.collection('bookings').doc(bookingId).get();
      if (doc.exists) {
        booking = { id: doc.id, ...doc.data() };
      }
    } catch (e) {
      // If DB query fails, fall through to mock
    }

    // Mock response for prototype/offline mode
    if (!booking) {
      return res.json({
        id: bookingId,
        status: 'ARRIVED',
        etaMins: 0,
        service: { name: 'QuickClean Service', price: 249 },
        cleaner: { name: 'Priya S.', rating: 4.9, cleans: 420 },
        lat: 17.3850,
        lng: 78.4867
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Simulate ETA countdown if EN_ROUTE
    if (booking.status === 'EN_ROUTE' && booking.etaMins !== null) {
      if (booking.etaMins > 0) {
        await db.collection('bookings').doc(bookingId).update({
          etaMins: booking.etaMins - 1
        });
        booking.etaMins = booking.etaMins - 1;
      } else {
        await db.collection('bookings').doc(bookingId).update({
          status: 'ARRIVED'
        });
        booking.status = 'ARRIVED';
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
