import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/billing/invoices
router.get('/invoices', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'billing-backend',
    invoices: [
      { id: 'INV-1001', customer: 'Rajesh Kumar', amount: 45000, date: '2026-08-01', status: 'PAID' },
      { id: 'INV-1002', customer: 'Priya Sharma', amount: 125000, date: '2026-08-05', status: 'PENDING' },
    ],
  });
});

// POST /api/billing/create
router.post('/create', (req: Request, res: Response) => {
  const { customer, amount, items } = req.body;
  res.json({
    success: true,
    message: 'Billing invoice generated successfully',
    invoice: {
      id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customer,
      amount,
      items,
      date: new Date().toISOString().split('T')[0],
      status: 'PAID',
    },
  });
});

export default router;
