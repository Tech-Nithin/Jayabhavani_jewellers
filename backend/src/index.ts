import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Jaya Bhavani Jewellers Backend Service',
    timestamp: new Date().toISOString(),
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✨ Jaya Bhavani Backend running on http://localhost:${PORT}`);
  });
}

export default app;
