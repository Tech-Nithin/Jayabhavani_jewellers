import express from 'express';
import cors from 'cors';
import billingRoutes from './routes/billingRoutes';

const app = express();
const PORT = process.env.BILLING_PORT || 5001;

app.use(cors());
app.use(express.json());

// Billing standalone API endpoints
app.use('/api/billing', billingRoutes);

app.get('/api/billing/health', (req, res) => {
  res.json({ status: 'online', service: 'Billing Backend Service' });
});

export const startBillingServer = () => {
  app.listen(PORT, () => {
    console.log(`⚡ Billing Backend Service running on http://localhost:${PORT}`);
  });
};

export default app;
