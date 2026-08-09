import express from 'express';
import cors from 'cors';
import financeRoutes from './routes/financeRoutes';

const app = express();
const PORT = process.env.FINANCE_PORT || 5002;

app.use(cors());
app.use(express.json());

// Finance standalone API endpoints
app.use('/api/finance', financeRoutes);

app.get('/api/finance/health', (req, res) => {
  res.json({ status: 'online', service: 'Finance Backend Service' });
});

export const startFinanceServer = () => {
  app.listen(PORT, () => {
    console.log(`📊 Finance Backend Service running on http://localhost:${PORT}`);
  });
};

export default app;
