import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { memoryCache } from './config/memoryCache';
import { getNowISTISO, getTodayIST, toISTDateOnly } from './utils/dateHelper';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import productCardRoutes from './routes/productCardRoutes';

// Modular backend domain routers
import dashboardRoutes from './dashboard-backend/routes/dashboardRoutes';
import billingRoutes from './billing-backend/routes/billingRoutes';
import accountsRoutes from './accounts-backend/index';
import financeRoutes from './finance-backend/routes/financeRoutes';
import inventoryRoutes from './inventory-backend/routes/inventoryRoutes';
import workAssignmentRoutes from './work-assignment-backend/routes/workAssignmentRoutes';
import ordersAndWorkerRoutes from './work-assignment-backend/routes/ordersAndWorkerRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : [];

const defaultOrigins = [
  'https://jbj-central-backend.onrender.com',
  'https://jbjadmin.vercel.app',
  'http://jbjadmin.vercel.app',
  'https://jbjworkers.vercel.app',
  'http://jbjworkers.vercel.app',
  'https://jayabhavanijewellers.vercel.app',
  'https://jbj-backend.vercel.app',
  'https://jayabhavani-jewellers.vercel.app',
  'https://jayabhavani-jewellers-aa1p.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
];

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow vercel preview deployments
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());

// Gzip / Brotli HTTP response compression (reduces JSON payload size by 60–75%)
app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Live Backend Terminal Request Logger
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode < 400 ? '✅' : '❌';
    console.log(`[${timestamp}] ${statusColor} ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      console.log(`   📦 Payload:`, JSON.stringify(req.body));
    }
  });
  next();
});

import workerAuthRoutes from './routes/workerAuthRoutes';

import metalRatesRoutes from './metal-rates-backend/index';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/worker-auth', workerAuthRoutes);
app.use('/api', productRoutes);
app.use('/api/product-card', productCardRoutes);

// Modular Domain Endpoints
app.use('/api/metal-rates', metalRatesRoutes);
app.use('/api/rates', metalRatesRoutes);
app.use('/api/billing/rates', metalRatesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/billing/accounts', accountsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/work-assignment', workAssignmentRoutes);
app.use('/api/work-assignment', ordersAndWorkerRoutes);
app.use('/api/billing', ordersAndWorkerRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Jaya Bhavani Jewellers Central Backend',
    modules: ['dashboard-backend', 'accounts-backend', 'billing-backend', 'finance-backend', 'inventory-backend', 'work-assignment-backend'],
    timestamp: getNowISTISO(),
  });
});

// Manual Hard-Refresh Cache Purge Endpoint
app.post('/api/health/purge-cache', (req: Request, res: Response) => {
  try {
    memoryCache.clear();
    console.log('🧹 [Manual Hard Refresh] RAM Cache purged successfully!');
    res.json({ success: true, message: 'RAM Cache purged successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Daily 11:55 PM IST EOD Auto-Scheduler
let lastScheduledRunDate = '';
setInterval(async () => {
  try {
    const todayStr = getTodayIST();
    const now = new Date();
    const istHours = Number(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
    const istMinutes = Number(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', minute: 'numeric' }));

    if (istHours === 23 && istMinutes === 55 && lastScheduledRunDate !== todayStr) {
      lastScheduledRunDate = todayStr;
      console.log(`🌙 [11:55 PM IST Scheduler] Generating EOD Closing & Tomorrow Opening Record for ${todayStr}...`);
      
      const { generateClosingRecord, saveClosingRecord } = await import('./utils/closingRecordHelper');
      const closingData = await generateClosingRecord(todayStr);
      await saveClosingRecord(todayStr, closingData);

      const tomorrowObj = new Date();
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowStr = toISTDateOnly(tomorrowObj);

      const goldClosing = closingData?.goldStock?.totalGrams ?? 0;
      const silverClosing = closingData?.silverStock?.totalGrams ?? 0;
      const cashClosing = closingData?.cashInHand ?? 0;

      const { supabase } = await import('./config/supabase');
      try {
        await supabase.from('daily_opening_records').upsert([{
          record_date: tomorrowStr,
          opening_gold: goldClosing,
          opening_silver: silverClosing,
          opening_cash: cashClosing,
          updated_at: getNowISTISO()
        }], { onConflict: 'record_date' });
      } catch {}

      console.log(`✨ [11:55 PM IST Scheduler] Tomorrow (${tomorrowStr}) Opening Record initialized: Gold ${goldClosing}g, Silver ${silverClosing}g, Cash ₹${cashClosing}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ [11:55 PM IST Scheduler Warning]:`, err?.message);
  }
}, 60000);

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✨ Jaya Bhavani Central Backend running on http://localhost:${PORT}`);
  });
}

export default app;
