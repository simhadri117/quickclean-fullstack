import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { firebaseAdminAuth } from '../config/firebaseAdmin';

export interface AuthRequest extends Request {
  user?: { userId: string; email?: string; role?: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // 1. Attempt to verify as a Firebase token first (Fast, local verification)
    try {
      const decodedFirebaseToken = await firebaseAdminAuth.verifyIdToken(token);
      req.user = {
        userId: decodedFirebaseToken.uid,
        email: decodedFirebaseToken.email,
        role: decodedFirebaseToken.role || 'user' // Firebase custom claims (fallback 'user')
      };
      return next();
    } catch (firebaseError) {
      // Firebase verification failed, proceed to try Supabase verification
    }

    // 2. Fallback to Supabase token verification (For Phone/Email OTP sessions)
    const { data: { user }, error } = await (supabase.auth as any).getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token for both Firebase and Supabase' });
    }

    req.user = { 
      userId: user.id,
      email: user.email,
      role: user.user_metadata?.role || user.app_metadata?.role
    };
    next();
  } catch (error) {
    console.error("🔑 Backend Auth Error:", error);
    return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
