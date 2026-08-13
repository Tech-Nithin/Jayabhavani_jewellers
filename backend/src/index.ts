import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';

// Modular backend domain routers
import dashboardRoutes from './dashboard-backend/routes/dashboardRoutes';
import billingRoutes from './billing-backend/routes/billingRoutes';
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);

// Modular 4 Domain Endpoints
app.use('/api/dashboard', dashboardRoutes);
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
    modules: ['dashboard-backend', 'billing-backend', 'finance-backend', 'inventory-backend', 'work-assignment-backend'],
    timestamp: new Date().toISOString(),
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✨ Jaya Bhavani Central Backend running on http://localhost:${PORT}`);
  });
}

export default app;
