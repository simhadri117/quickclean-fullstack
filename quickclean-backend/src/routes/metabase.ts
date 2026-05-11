import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/metabase/dashboard-url/:id
 * Generates a signed Metabase URL for a specific dashboard.
 */
router.get('/dashboard-url/:id', authenticate, isAdmin, async (req: AuthRequest, res: Response) => {
  const dashboardId = parseInt(req.params.id as string);
  const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
  const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

  if (!METABASE_SITE_URL || !METABASE_SECRET_KEY) {
    return res.status(500).json({ 
      error: 'Metabase configuration is missing in server environment variables.' 
    });
  }

  try {
    const payload = {
      resource: { dashboard: dashboardId },
      params: {},
      exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minute expiration
    };

    const token = jwt.sign(payload, METABASE_SECRET_KEY);

    const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;

    res.json({ url: iframeUrl });
  } catch (error: any) {
    console.error('📊 Metabase Token Error:', error);
    res.status(500).json({ error: 'Failed to generate Metabase embedding URL' });
  }
});

export default router;
