import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { sendFast2SMS } from '../utils/fast2sms';
import { getDb } from '../config/mongodb';

const router = Router();
const LOG_FILE = path.join(process.cwd(), 'sms-gate.log');

// In-memory OTP storage for demo purposes
const otpStore = new Map<string, { otp: string, expires: number }>();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Send OTP simulation
router.post('/request-otp', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid 10-digit phone number required' });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  otpStore.set(phone, { otp, expires });
  const isRealSmsSent = await sendFast2SMS(phone, otp);
  
  const logEntry = `[${new Date().toISOString()}] ${isRealSmsSent ? '(REAL) ' : '(MOCK) '} SMS to +91 ${phone}: Your QuickClean OTP is ${otp}.\n`;
  fs.appendFileSync(LOG_FILE, logEntry);

  res.json({ message: isRealSmsSent ? 'OTP sent to your phone' : 'OTP sent (Check sms-gate.log)' });
});

// Verify OTP and Login/Register multi-role
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { phone, otp, role = 'user' } = req.body;
  const savedOtp = otpStore.get(phone);

  if (!savedOtp || savedOtp.otp !== otp || Date.now() > savedOtp.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(phone);

  try {
    const db = getDb();
    let account;

    if (role === 'cleaner') {
      const collection = db.collection('cleaners');
      account = await collection.findOne({ phone });
      if (!account) {
        const result = await collection.insertOne({ 
          phone, 
          name: 'New Cleaning Partner', 
          rating: 5.0, 
          cleans: 0,
          createdAt: new Date()
        });
        account = { _id: result.insertedId, phone, name: 'New Cleaning Partner', role: 'cleaner' };
      }
    } else {
      const collection = db.collection('users');
      account = await collection.findOne({ phone });
      if (!account) {
        const result = await collection.insertOne({ 
          phone, 
          name: 'New User',
          role: 'user',
          createdAt: new Date()
        });
        account = { _id: result.insertedId, phone, name: 'New User', role: 'user' };
      }
    }
    
    const token = jwt.sign({ id: account._id || account.id, role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: account, role });
  } catch (e) {
    console.error("🔑 Login Database Error:", e);
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
