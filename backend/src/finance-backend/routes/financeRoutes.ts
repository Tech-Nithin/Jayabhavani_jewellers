import { Router, Request, Response } from 'express';

const router = Router();

interface DebtRecord {
  id: string;
  item_name: string;
  customer_name: string;
  customer_phone: string;
  debt_principal: number;
  item_weight_grams: number;
  interest_rate_per_month: number;
  start_date: string;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

let debtLedger: DebtRecord[] = [
  {
    id: 'LOAN-301',
    item_name: '22K Gold Bangle Set',
    customer_name: 'Suresh Patel',
    customer_phone: '9876501234',
    debt_principal: 85000,
    item_weight_grams: 18.500,
    interest_rate_per_month: 1.5,
    start_date: '2026-01-10',
    status: 'OPEN',
  },
  {
    id: 'LOAN-302',
    item_name: 'Gold Chain (24K)',
    customer_name: 'Anitha Reddy',
    customer_phone: '9123456789',
    debt_principal: 50000,
    item_weight_grams: 10.200,
    interest_rate_per_month: 1.75,
    start_date: '2026-02-15',
    status: 'OPEN',
  },
  {
    id: 'LOAN-303',
    item_name: 'Silver Utensils Set',
    customer_name: 'Vikram Singh',
    customer_phone: '9988776655',
    debt_principal: 15000,
    item_weight_grams: 350.000,
    interest_rate_per_month: 2.0,
    start_date: '2025-11-01',
    status: 'CLOSED',
  },
];

// Helper: Calculate exact timeline duration and total interest accrued till today
function calculateDebtMetrics(record: DebtRecord) {
  const startDate = new Date(record.start_date);
  const today = new Date();

  const diffTime = Math.max(0, today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const months = Math.floor(diffDays / 30);
  const remainingDays = diffDays % 30;
  const actualTimeline = `${months} Mos ${remainingDays} Days`;

  // Calculate monthly pro-rated interest: principal * (monthlyRate / 100) * (diffDays / 30)
  const totalMonthsExact = diffDays / 30;
  const totalInterest = Number((record.debt_principal * (record.interest_rate_per_month / 100) * totalMonthsExact).toFixed(2));
  const totalPayable = Number((record.debt_principal + totalInterest).toFixed(2));

  return {
    ...record,
    days_elapsed: diffDays,
    actual_timeline_till_date: actualTimeline,
    total_interest_till_today: totalInterest,
    total_payable_till_today: totalPayable,
  };
}

// GET /api/finance/overview - Get finance summary & debt ledger with calculated interest till date
router.get('/overview', (req: Request, res: Response) => {
  const calculatedLedger = debtLedger.map(calculateDebtMetrics);

  const openAccounts = calculatedLedger.filter(d => d.status === 'OPEN');
  const totalDebtIssued = openAccounts.reduce((acc, curr) => acc + curr.debt_principal, 0);
  const totalInterestEarned = calculatedLedger.reduce((acc, curr) => acc + curr.total_interest_till_today, 0);

  res.json({
    success: true,
    module: 'finance-backend',
    summary: {
      totalDebtIssued,
      totalInterestEarned,
      activeOpenLoans: openAccounts.length,
      totalClosedLoans: debtLedger.filter(d => d.status === 'CLOSED').length,
    },
    ledger: calculatedLedger,
  });
});

// POST /api/finance/debt/create - Create new pledge/debt loan account
router.post('/debt/create', (req: Request, res: Response) => {
  const {
    item_name,
    customer_name,
    customer_phone = '',
    debt_principal,
    item_weight_grams,
    interest_rate_per_month = 1.5,
    start_date,
  } = req.body;

  if (!item_name || !customer_name || !debt_principal || !item_weight_grams) {
    return res.status(400).json({
      success: false,
      message: 'Missing required loan fields',
    });
  }

  const newLoan: DebtRecord = {
    id: `LOAN-${Math.floor(300 + Math.random() * 600)}`,
    item_name,
    customer_name,
    customer_phone,
    debt_principal: Number(debt_principal),
    item_weight_grams: Number(item_weight_grams),
    interest_rate_per_month: Number(interest_rate_per_month),
    start_date: start_date || new Date().toISOString().split('T')[0],
    status: 'OPEN',
  };

  debtLedger.unshift(newLoan);

  res.json({
    success: true,
    message: 'Debt loan record created successfully',
    record: calculateDebtMetrics(newLoan),
  });
});

export default router;
