import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/finance/overview
router.get('/overview', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'finance-backend',
    summary: {
      totalRevenue: 2450000,
      totalExpenses: 890000,
      netProfit: 1560000,
      currency: 'INR',
    },
    monthlyReports: [
      { month: 'May 2026', revenue: 750000, expenses: 280000 },
      { month: 'June 2026', revenue: 820000, expenses: 310000 },
      { month: 'July 2026', revenue: 880000, expenses: 300000 },
    ],
  });
});

export default router;
