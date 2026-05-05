import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebaseAdmin';
import fs from 'fs';
import path from 'path';
import { sendFast2SMS } from '../utils/fast2sms';

const router = Router();
const LOG_FILE = path.join(process.cwd(), 'sms-gate.log');

// In-memory OTP storage for demo purposes
// Format: { phone: { otp: string, expires: number } }
const otpStore = new Map<string, { otp: string, expires: number }>();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Send OTP simulation
router.post('/request-otp', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid 10-digit phone number required' });
  }

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phone, { otp, expires });

  // Try Real SMS first, then fallback to Mock
  const isRealSmsSent = await sendFast2SMS(phone, otp);

  // Mock SMS Log (Always keep for debugging)
  const logEntry = `[${new Date().toISOString()}] ${isRealSmsSent ? '(REAL) ' : '(MOCK) '} SMS to +91 ${phone}: Your QuickClean OTP is ${otp}.\n`;
  fs.appendFileSync(LOG_FILE, logEntry);

  if (!isRealSmsSent) {
    console.log(`📱 OTP for ${phone}: ${otp} (Logged to sms-gate.log)`);
  }
  
  res.json({ message: isRealSmsSent ? 'OTP sent to your phone' : 'OTP sent (Check sms-gate.log)' });
});

// Verify OTP and Login/Register multi-role
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp, role = 'user' } = req.body;
  
  const savedOtp = otpStore.get(phone);

  if (!savedOtp) {
    return res.status(400).json({ error: 'No OTP requested for this number' });
  }

  if (Date.now() > savedOtp.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (savedOtp.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Success: Clear OTP
  otpStore.delete(phone);

  try {
    let account;
    if (role === 'cleaner') {
      const snapshot = await db.collection('cleaners').where('phone', '==', phone).limit(1).get();
      if (snapshot.empty) {
        const newRef = db.collection('cleaners').doc();
        account = { id: newRef.id, phone, name: 'New Cleaning Partner', rating: 5.0, cleans: 0 };
        await newRef.set(account);
      } else {
        account = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    } else {
      // Find or create a standard Customer account
      const snapshot = await db.collection('users').where('phone', '==', phone).limit(1).get();
      if (snapshot.empty) {
        const newRef = db.collection('users').doc();
        account = { id: newRef.id, phone, name: 'New User' };
        await newRef.set(account);
      } else {
        account = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
    }
    
    // Inject the specific role into the JWT
    const token = jwt.sign({ id: account.id, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: account, role });
  } catch (e) {
    console.error("🔑 Login Database Error:", e);
    
    // Use a valid 24-character hexadecimal ObjectId format for the fallback
    // to prevent downstream failures in MongoDB-based routes (like bookings).
    const fallbackId = '65f1a2b3c4d5e6f7a8b9c0d9'; 
    const token = jwt.sign({ id: fallbackId, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { id: fallbackId, phone, name: 'Prototype User (Offline)' }, 
      role,
      warning: "Offline mode: Database connection issue detected."
    });
  }
});

export default router;
