import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['8.8.8.8']);
dns.setDefaultResultOrder('ipv4first');
dotenv.config();
import * as Sentry from "@sentry/node";
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
import bookingRoutes from './routes/bookings';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/user';
import cleanerRouter from './routes/cleaner';
import adminRouter from './routes/admin';
import aiRoutes from './routes/ai';
import metabaseRoutes from './routes/metabase';
import { connectToDatabase, getDb } from './config/mongodb';


console.log('DEBUG: FAST2SMS_KEY exists?', !!process.env.FAST2SMS_KEY);
console.log('DEBUG: PORT?', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 5000;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/cleaner', cleanerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRoutes);
app.use('/api/metabase', metabaseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QuickClean API is running' });
});

app.get('/api/db-status', async (req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });
    res.json({ status: 'connected', database: 'MongoDB Atlas (Native Driver)' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

// Final Error Handling Middleware (Express 5 style)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Global API Error:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    type: err.name || 'Error',
    sentry: Sentry.lastEventId() // Use official SDK method to get event ID
  });
});

async function startServer() {
  try {
    await connectToDatabase();

    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 SMS Mode: ${process.env.FAST2SMS_KEY ? 'REAL (Fast2SMS)' : 'MOCK (sms-gate.log)'}`);
    });
    
    // Keep-alive for Windows/ts-node issues
    setInterval(() => {}, 1000 * 60 * 60); 
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Prevent process exit on unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛑 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🛑 Uncaught Exception:', err);
});

startServer();
