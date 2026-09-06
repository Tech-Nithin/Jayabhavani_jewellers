import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../../config/supabase';
import { uploadFinanceImageToCloudinary } from '../../utils/cloudinaryHelper';
import { memoryCache } from '../../config/memoryCache';
import { getNowISTISO, getTodayIST, toISTTimestamp, toISTDateOnly } from '../../utils/dateHelper';

const router = Router();
const BUCKET = 'loan-item-images';

// Multer: memory storage for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate interest accrued since a given date on a given principal using traditional calendar month calculation.
 * Rules:
 * - Same day (fromDate == toDate) = 0 months
 * - 01-Feb-2026 to 01-March-2026 = 1 month
 * - 01-Feb-2025 to 01-March-2026 = 13 months
 * - 20-June-2026 to 03-August-2026 = 2 months
 */
function calcInterest(params: {
  principal: number;
  ratePercent: number;
  fromDate: string | Date;
  toDate?: string | Date;
  anyBalance?: number;
}): { months: number; days: number; periodInterest: number; interestDue: number } {
  const from = new Date(params.fromDate || Date.now());
  const to = params.toDate ? new Date(params.toDate) : new Date();

  const startYear = from.getFullYear();
  const startMonth = from.getMonth();
  const startDate = from.getDate();

  const endYear = to.getFullYear();
  const endMonth = to.getMonth();
  const endDate = to.getDate();

  const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);

  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let months = 0;
  if (days === 0 || (startYear === endYear && startMonth === endMonth && startDate === endDate)) {
    months = 0; // Same day = 0 months
  } else if (monthDiff === 0) {
    months = endDate > startDate ? 1 : 0;
  } else if (endDate >= startDate) {
    months = endDate > startDate ? monthDiff + 1 : Math.max(1, monthDiff);
  } else {
    months = Math.max(1, monthDiff);
  }
  const periodInterest = Number((params.principal * (params.ratePercent / 100) * months).toFixed(2));
  const carryOverBalance = Number(params.anyBalance || 0);
  const interestDue = Number((periodInterest + carryOverBalance).toFixed(2));

  return { months, days, periodInterest, interestDue };
}

/** Build full receipt JSON snapshot for a loan */
function buildReceiptJson(loan: any, paymentHistory: any[]) {
  const interest = calcInterest({
    principal: Number(loan.current_principal),
    ratePercent: Number(loan.interest_rate_percent),
    fromDate: loan.interest_start_from || loan.debt_date,
    anyBalance: Number(loan.any_balance || 0),
  });

  const totInterestPaid = (paymentHistory || []).reduce((sum: number, p: any) => sum + Number(p.interest_paying_amount || p.interest_component || 0), 0);
  const totPrincipalPaid = (paymentHistory || []).reduce((sum: number, p: any) => sum + Number(p.principal_paying_amount || p.principal_component || 0), 0);

  return {
    finance_uuid: loan.finance_uuid,
    customer_id: loan.customer_id,
    customer_name: loan.customer_name,
    customer_phone: loan.customer_phone,
    customer_address: loan.customer_address,
    debt_category: loan.debt_category,
    item_name: loan.item_name,
    item_weight: Number(loan.item_weight),
    item_deduction_name: loan.item_deduction_name,
    item_deduction_weight: Number(loan.item_deduction_weight),
    touch: Number(loan.touch),
    pure_metal_weight: Number(loan.pure_metal_weight),
    metal_value_per_gram: Number(loan.metal_value_per_gram),
    total_value_of_item: Number(loan.total_value_of_item),
    item_image_url: loan.item_image_url,
    original_principal: Number(loan.customer_debt_money),
    current_principal: Number(loan.current_principal),
    interest_rate_percent: Number(loan.interest_rate_percent),
    debt_date: loan.debt_date,
    interest_start_from: loan.interest_start_from || loan.debt_date,
    any_balance: Number(loan.any_balance || 0),
    total_interest_paid: Number(totInterestPaid.toFixed(2)),
    total_principal_paid: Number(totPrincipalPaid.toFixed(2)),
    payment_status: loan.payment_status,
    current_interest_due: interest.interestDue,
    current_months_elapsed: interest.months,
    total_payable_now: Number((Number(loan.current_principal) + interest.interestDue).toFixed(2)),
    payment_history: paymentHistory,
    snapshot_at: getNowISTISO(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/upload-image
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-image', upload.single('image'), async (req: Request & { file?: any }, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });
  try {
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `loan-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Try Cloudinary first
    try {
      const cloudinaryUrl = await uploadFinanceImageToCloudinary(req.file.buffer, fileName);
      return res.json({ success: true, url: cloudinaryUrl });
    } catch {
      // Fallback to Supabase storage
      const { data: uploadData } = await supabase.storage.from(BUCKET).upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });
      if (uploadData) {
        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        return res.json({ success: true, url: publicData.publicUrl });
      }
    }
    res.status(500).json({ success: false, message: 'Image upload failed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Image upload error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/metal-rates
// ─────────────────────────────────────────────────────────────────────────────
router.get('/metal-rates', async (_req: Request, res: Response) => {
  try {
    const { data } = await supabase.from('updated_metal_values').select('gold_buy_value, silver_buy_value').eq('id', 1).single();
    res.json({
      success: true,
      gold_buy_value: Number(data?.gold_buy_value || 15000),
      silver_buy_value: Number(data?.silver_buy_value || 250),
      gold_rate_per_gram: Number(data?.gold_buy_value || 15000),
      silver_rate_per_gram: Number(data?.silver_buy_value || 250),
    });
  } catch {
    res.json({ success: true, gold_rate_per_gram: 15000, silver_rate_per_gram: 250 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/presets — Auto-suggestions for customer address & names
// ─────────────────────────────────────────────────────────────────────────────
router.get('/presets', async (_req: Request, res: Response) => {
  try {
    const { data: financeCustomers } = await supabase
      .from('finance')
      .select('customer_name, customer_phone, customer_address')
      .order('created_at', { ascending: false })
      .limit(100);

    const addresses = Array.from(new Set((financeCustomers || []).map((c: any) => c.customer_address).filter(Boolean)));
    const customers = Array.from(new Set((financeCustomers || []).map((c: any) => c.customer_name).filter(Boolean)));

    res.json({
      success: true,
      addresses,
      customers,
    });
  } catch (err: any) {
    res.json({ success: true, addresses: ['Patelpura, Siddipet', 'Subhash Nagar, Siddipet'], customers: [] });
  }
});
async function getNextCustomerId(): Promise<string> {
  const { data } = await supabase
    .from('finance')
    .select('customer_id');

  let maxNum = 0;
  (data || []).forEach((row: any) => {
    if (row.customer_id) {
      const match = String(row.customer_id).trim().match(/^CUST-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  });

  const nextNum = maxNum + 1;
  const padded = nextNum < 10 ? `0${nextNum}` : String(nextNum);
  return `CUST-${padded}`;
}

async function syncSequentialCustomerIds(loans: any[]) {
  if (!loans || loans.length === 0) return;
  const sorted = [...loans].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  let currentMax = 0;
  sorted.forEach((l) => {
    const match = String(l.customer_id || '').trim().match(/^CUST-(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > currentMax) currentMax = n;
    }
  });

  for (const loan of sorted) {
    const isSequential = /^CUST-\d+$/i.test(String(loan.customer_id || '').trim());
    if (!isSequential) {
      currentMax += 1;
      const padded = currentMax < 10 ? `0${currentMax}` : String(currentMax);
      const newCustId = `CUST-${padded}`;
      loan.customer_id = newCustId;
      const original = loans.find((x) => x.finance_uuid === loan.finance_uuid);
      if (original) original.customer_id = newCustId;
      try {
        await supabase
          .from('finance')
          .update({ customer_id: newCustId })
          .eq('finance_uuid', loan.finance_uuid);
      } catch (err: any) {
        console.warn('Customer ID backfill warning:', err?.message);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/overview — List all loans with live interest
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const { data: loans, error } = await supabase
      .from('finance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const { data: history } = await supabase
      .from('finance_payment_history')
      .select('*');

    // Ensure all loans have sequential CUST-01, CUST-02...
    await syncSequentialCustomerIds(loans);

    const ledger = (loans || []).map((loan: any) => {
      const loanPayments = (history || []).filter((h: any) => h.finance_uuid === loan.finance_uuid);
      const totIntPaid = loanPayments.reduce((sum: number, p: any) => sum + Number(p.interest_paying_amount || p.interest_component || 0), 0);
      const totPrinPaid = loanPayments.reduce((sum: number, p: any) => sum + Number(p.principal_paying_amount || p.principal_component || 0), 0);

      const interest = calcInterest({
        principal: Number(loan.current_principal),
        ratePercent: Number(loan.interest_rate_percent),
        fromDate: loan.interest_start_from || loan.debt_date,
        anyBalance: Number(loan.any_balance || 0),
      });

      return {
        ...loan,
        loan_date: loan.debt_date || loan.loan_date || (loan.created_at ? loan.created_at.split('T')[0] : ''),
        debt_date: loan.debt_date || loan.loan_date || (loan.created_at ? loan.created_at.split('T')[0] : ''),
        item_metal_type: (loan.debt_category || loan.item_metal_type || 'GOLD').toUpperCase(),
        customer_id: loan.customer_id || null,
        current_interest_due: interest.interestDue,
        months_elapsed: interest.months,
        days_elapsed: interest.days,
        total_payable_now: Number((Number(loan.current_principal) + interest.interestDue).toFixed(2)),
        total_interest_paid: Number(totIntPaid.toFixed(2)),
        total_principal_paid: Number(totPrinPaid.toFixed(2)),
      };
    });

    const openLoans = ledger.filter((l: any) => l.payment_status !== 'CLOSED');
    const closedLoans = ledger.filter((l: any) => l.payment_status === 'CLOSED');

    const summary = {
      totalDebtIssued: openLoans.reduce((s: number, l: any) => s + Number(l.current_principal), 0),
      totalInterestEarned: ledger.reduce((s: number, l: any) => s + Number(l.total_interest_paid || 0), 0),
      activeOpenLoans: openLoans.length,
      totalClosedLoans: closedLoans.length,
    };

    res.json({ success: true, module: 'finance-backend', summary, ledger });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/:uuid — Single loan with full payment history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;
  try {
    const { data: loan, error: loanErr } = await supabase
      .from('finance')
      .select('*')
      .eq('finance_uuid', uuid)
      .single();

    if (loanErr || !loan) return res.status(404).json({ success: false, message: 'Loan not found.' });

    const { data: payments } = await supabase
      .from('finance_payment_history')
      .select('*')
      .eq('finance_uuid', uuid)
      .order('installment_number', { ascending: true });

    const totIntPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.interest_paying_amount || p.interest_component || 0), 0);
    const totPrinPaid = (payments || []).reduce((sum: number, p: any) => sum + Number(p.principal_paying_amount || p.principal_component || 0), 0);

    const interest = calcInterest({
      principal: Number(loan.current_principal),
      ratePercent: Number(loan.interest_rate_percent),
      fromDate: loan.interest_start_from || loan.debt_date,
      anyBalance: Number(loan.any_balance || 0),
    });

    res.json({
      success: true,
      loan: {
        ...loan,
        loan_date: loan.debt_date || loan.loan_date || (loan.created_at ? loan.created_at.split('T')[0] : ''),
        debt_date: loan.debt_date || loan.loan_date || (loan.created_at ? loan.created_at.split('T')[0] : ''),
        item_metal_type: (loan.debt_category || loan.item_metal_type || 'GOLD').toUpperCase(),
        customer_id: loan.customer_id || null,
        current_interest_due: interest.interestDue,
        months_elapsed: interest.months,
        total_payable_now: Number((Number(loan.current_principal) + interest.interestDue).toFixed(2)),
        total_interest_paid: Number(totIntPaid.toFixed(2)),
        total_principal_paid: Number(totPrinPaid.toFixed(2)),
      },
      payment_history: payments || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/create & /api/finance/debt/create — Issue new pledge loan
// ─────────────────────────────────────────────────────────────────────────────
const handleCreateLoan = async (req: Request, res: Response) => {
  const {
    customer_id, customer_name, customer_phone, customer_address,
    debt_category,
    item_name, item_weight, item_deduction_name, item_deduction_weight,
    touch, pure_metal_weight, metal_value_per_gram, total_value_of_item, item_image_url,
    customer_debt_money, interest_rate_percent, timeline_months, debt_date, loan_date: inputLoanDate,
  } = req.body;

  if (!customer_name || !customer_phone || !customer_debt_money || !interest_rate_percent || !timeline_months) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const principal = Number(customer_debt_money);
  const loanDate = debt_date || inputLoanDate || getTodayIST();
  let assignedCustomerId = (customer_id && String(customer_id).trim()) || '';
  if (!assignedCustomerId || !/^CUST-\d+$/i.test(assignedCustomerId)) {
    assignedCustomerId = await getNextCustomerId();
  }

  const payload: any = {
    customer_id: assignedCustomerId,
    customer_name: String(customer_name).trim(),
    customer_phone: String(customer_phone).trim(),
    customer_address: customer_address ? String(customer_address).trim() : null,
    debt_category: (debt_category || 'GOLD').toUpperCase(),
    item_name: item_name ? String(item_name).trim() : null,
    item_weight: Number(item_weight || 0),
    item_deduction_name: item_deduction_name ? String(item_deduction_name).trim() : null,
    item_deduction_weight: Number(item_deduction_weight || 0),
    touch: Number(touch || 0),
    pure_metal_weight: Number(pure_metal_weight || 0),
    metal_value_per_gram: Number(metal_value_per_gram || 0),
    total_value_of_item: Number(total_value_of_item || 0),
    item_image_url: item_image_url || null,
    customer_debt_money: principal,       // PERMANENT & NEVER CHANGES
    current_principal: principal,          // Starts equal to customer_debt_money
    interest_rate_percent: Number(interest_rate_percent),
    timeline_months: Number(timeline_months),
    debt_date: loanDate,
    interest_start_from: loanDate,         // Interest starts from loan date
    any_balance: 0,                        // Starts at 0
    payment_status: 'OPEN',
  };

  try {
    const { data: newLoan, error } = await supabase
      .from('finance')
      .insert([payload])
      .select()
      .single();

    if (error || !newLoan) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to create loan.' });
    }

    // Build and save initial receipt JSON
    const receiptJson = buildReceiptJson(newLoan, []);
    await supabase.from('finance').update({ receipt_json: receiptJson }).eq('finance_uuid', newLoan.finance_uuid);

    // Record cash OUT in cash drawer (money given to customer)
    try {
      const { recordCashTransaction } = await import('../../utils/cashLedgerHelper');
      await recordCashTransaction({
        transaction_id: newLoan.finance_uuid,
        transaction_type: 'FINANCE',
        flow_type: 'OUT',
        amount: principal,
        metal_type: (newLoan.debt_category === 'SILVER' ? 'SILVER' : 'GOLD') as any,
        item_type: `Pledge Loan: ${newLoan.item_name || 'Ornament'}`,
        notes: `Loan disbursed ₹${principal.toLocaleString('en-IN')} to ${newLoan.customer_name}`,
        date: loanDate,
      });
    } catch (cashErr) {
      console.warn('⚠️ Cash record error on loan create:', cashErr);
    }

    memoryCache.clear();
    res.json({ success: true, message: 'Pledge loan created successfully.', record: { ...newLoan, receipt_json: receiptJson } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/create', handleCreateLoan);
router.post('/debt/create', handleCreateLoan);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/:uuid/pay — Record installment payment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:uuid/pay', async (req: Request, res: Response) => {
  const { uuid } = req.params;
  const { paying_amount, payment_transaction_amount, interest_paying_amount, principal_paying_amount, payment_type = 'PARTIAL_SETTLEMENT', notes } = req.body;

  const totalTransactionPay = Number(payment_transaction_amount || paying_amount || 0);
  if (!totalTransactionPay || totalTransactionPay <= 0) {
    return res.status(400).json({ success: false, message: 'Payment transaction amount must be greater than 0.' });
  }

  try {
    // 1. Fetch current loan state
    const { data: loan, error: fetchErr } = await supabase
      .from('finance')
      .select('*')
      .eq('finance_uuid', uuid)
      .single();

    if (fetchErr || !loan) return res.status(404).json({ success: false, message: 'Loan not found.' });
    if (loan.payment_status === 'CLOSED') {
      return res.status(400).json({ success: false, message: 'This loan is already fully closed.' });
    }

    const currentPrincipal = Number(loan.current_principal);
    const ratePercent = Number(loan.interest_rate_percent);
    const today = getTodayIST();

    // 2. Calculate current interest accrued + any previous carrying balance
    const interest = calcInterest({
      principal: currentPrincipal,
      ratePercent,
      fromDate: loan.interest_start_from || loan.debt_date,
      anyBalance: Number(loan.any_balance || 0),
    });
    const totalInterestDue = interest.interestDue;

    // 3. Determine Interest & Principal Allocations
    let intPaid = 0;
    let prinPaid = 0;

    if (interest_paying_amount !== undefined && principal_paying_amount !== undefined) {
      intPaid = Number(interest_paying_amount);
      prinPaid = Number(principal_paying_amount);
    } else if (payment_type === 'FULL_CLOSE') {
      intPaid = Math.min(totalTransactionPay, totalInterestDue);
      prinPaid = Math.max(0, totalTransactionPay - intPaid);
    } else if (payment_type === 'INTEREST_ONLY') {
      intPaid = Math.min(totalTransactionPay, totalInterestDue);
      prinPaid = 0;
    } else {
      // PARTIAL_SETTLEMENT
      intPaid = Math.min(totalTransactionPay, totalInterestDue);
      prinPaid = Math.max(0, totalTransactionPay - intPaid);
    }

    // 4. Principal Reduction Logic
    let newPrincipal = currentPrincipal;
    if (prinPaid > 0) {
      newPrincipal = Math.max(0, Number((currentPrincipal - prinPaid).toFixed(2)));
    }

    // 5. Interest Shortfall & any_balance Carry-Over Logic
    const interestShortfall = Math.max(0, Number((totalInterestDue - intPaid).toFixed(2)));
    const newAnyBalance = interestShortfall;

    // 6. Update Status (Closed only if Principal = 0 AND any_balance = 0)
    let newStatus: 'OPEN' | 'PARTIAL' | 'CLOSED' = 'PARTIAL';
    if (newPrincipal <= 0 && newAnyBalance <= 0) {
      newStatus = 'CLOSED';
    }

    // 7. Get next installment number
    const { data: existingPayments } = await supabase
      .from('finance_payment_history')
      .select('installment_number')
      .eq('finance_uuid', uuid)
      .order('installment_number', { ascending: false })
      .limit(1);
    const nextInstallment = existingPayments && existingPayments.length > 0
      ? existingPayments[0].installment_number + 1
      : 1;

    // 8. Insert payment history record
    const { data: paymentRecord, error: payErr } = await supabase
      .from('finance_payment_history')
      .insert([{
        finance_uuid: uuid,
        installment_number: nextInstallment,
        payment_type: newStatus === 'CLOSED' ? 'FULL_CLOSE' : (prinPaid > 0 ? 'PARTIAL_SETTLEMENT' : 'INTEREST_ONLY'),
        payment_transaction_amount: totalTransactionPay,
        interest_paying_amount: intPaid,
        principal_paying_amount: prinPaid,
        notes: notes || `Installment #${nextInstallment}`,
        paid_at: getNowISTISO(),
      }])
      .select()
      .single();

    if (payErr) {
      return res.status(500).json({ success: false, message: payErr.message });
    }

    // 9. Fetch all payments for receipt JSON
    const { data: allPayments } = await supabase
      .from('finance_payment_history')
      .select('*')
      .eq('finance_uuid', uuid)
      .order('installment_number', { ascending: true });

    // 10. Build updated receipt JSON & update master row
    const updatedLoanData = {
      ...loan,
      current_principal: newPrincipal,
      interest_start_from: today,
      any_balance: newAnyBalance,
      payment_status: newStatus,
    };
    const receiptJson = buildReceiptJson(updatedLoanData, allPayments || []);

    const updateFields: any = {
      current_principal: newPrincipal,
      interest_start_from: today,              // Reset interest start date to today
      any_balance: newAnyBalance,               // Store remaining interest shortfall
      payment_status: newStatus,
      receipt_json: receiptJson,
      updated_at: getNowISTISO(),
    };

    const { data: updatedLoan } = await supabase
      .from('finance')
      .update(updateFields)
      .eq('finance_uuid', uuid)
      .select()
      .single();

    // 11. Record Cash IN in cash drawer
    try {
      const { recordCashTransaction } = await import('../../utils/cashLedgerHelper');
      await recordCashTransaction({
        transaction_id: paymentRecord?.payment_uuid || uuid,
        transaction_type: 'FINANCE',
        flow_type: 'IN',
        amount: totalTransactionPay,
        metal_type: (loan.debt_category === 'SILVER' ? 'SILVER' : 'GOLD') as any,
        item_type: `Pledge Loan Payment #${nextInstallment}`,
        notes: `Received ₹${totalTransactionPay.toLocaleString('en-IN')} (Int: ₹${intPaid}, Prin: ₹${prinPaid}) from ${loan.customer_name}`,
        date: today,
      });
    } catch (cashErr) {
      console.warn('⚠️ Cash IN record error on payment:', cashErr);
    }

    memoryCache.clear();
    res.json({
      success: true,
      message: `Payment of ₹${totalTransactionPay.toLocaleString('en-IN')} recorded successfully.`,
      loan: { ...updatedLoan, receipt_json: receiptJson },
      payment: paymentRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/finance/:uuid/update or /api/finance/debt/:uuid/update — Edit loan details
// ─────────────────────────────────────────────────────────────────────────────
router.patch(['/:uuid/update', '/debt/:uuid/update'], async (req: Request, res: Response) => {
  const { uuid } = req.params;
  const rawDebtDate = req.body.debt_date || req.body.loan_date;
  const rawInterestStart = req.body.interest_start_from || rawDebtDate;

  const updateFields: any = { updated_at: getNowISTISO() };

  if (req.body.customer_id !== undefined) updateFields.customer_id = req.body.customer_id;
  if (req.body.customer_name !== undefined) updateFields.customer_name = String(req.body.customer_name).trim();
  if (req.body.customer_phone !== undefined) updateFields.customer_phone = String(req.body.customer_phone).trim();
  if (req.body.customer_address !== undefined) updateFields.customer_address = req.body.customer_address ? String(req.body.customer_address).trim() : null;
  if (req.body.item_name !== undefined) updateFields.item_name = req.body.item_name ? String(req.body.item_name).trim() : null;
  if (req.body.item_weight !== undefined || req.body.item_weight_grams !== undefined) {
    updateFields.item_weight = Number(req.body.item_weight ?? req.body.item_weight_grams ?? 0);
  }
  if (req.body.item_deduction_name !== undefined) updateFields.item_deduction_name = req.body.item_deduction_name ? String(req.body.item_deduction_name).trim() : null;
  if (req.body.item_deduction_weight !== undefined || req.body.item_deduction_weight_grams !== undefined) {
    updateFields.item_deduction_weight = Number(req.body.item_deduction_weight ?? req.body.item_deduction_weight_grams ?? 0);
  }
  if (req.body.touch !== undefined || req.body.item_purity_percent !== undefined) {
    updateFields.touch = Number(req.body.touch ?? req.body.item_purity_percent ?? 0);
  }
  if (req.body.pure_metal_weight !== undefined) updateFields.pure_metal_weight = Number(req.body.pure_metal_weight || 0);
  if (req.body.metal_value_per_gram !== undefined || req.body.item_metal_rate_per_gram !== undefined) {
    updateFields.metal_value_per_gram = Number(req.body.metal_value_per_gram ?? req.body.item_metal_rate_per_gram ?? 0);
  }
  if (req.body.total_value_of_item !== undefined) updateFields.total_value_of_item = Number(req.body.total_value_of_item || 0);
  if (req.body.item_image_url !== undefined) updateFields.item_image_url = req.body.item_image_url || null;
  if (req.body.interest_rate_percent !== undefined) updateFields.interest_rate_percent = Number(req.body.interest_rate_percent);
  if (req.body.timeline_months !== undefined) updateFields.timeline_months = Number(req.body.timeline_months);
  if (req.body.debt_category !== undefined || req.body.item_metal_type !== undefined) {
    updateFields.debt_category = (req.body.debt_category || req.body.item_metal_type || 'GOLD').toUpperCase();
  }

  // Update debt_date and interest_start_from together
  if (rawDebtDate) {
    updateFields.debt_date = rawDebtDate;
  }
  if (rawInterestStart) {
    updateFields.interest_start_from = rawInterestStart;
  }

  // If loan amount is updated on an open record with no payments
  if (req.body.customer_debt_money !== undefined || req.body.amount !== undefined) {
    const newAmt = Number(req.body.customer_debt_money ?? req.body.amount);
    updateFields.customer_debt_money = newAmt;

    const { data: payments } = await supabase
      .from('finance_payment_history')
      .select('payment_uuid')
      .or(`finance_uuid.eq.${uuid}`);

    if (!payments || payments.length === 0) {
      updateFields.current_principal = newAmt;
    }
  }

  try {
    const isNumericId = /^\d+$/.test(uuid);
    const query = supabase.from('finance').update(updateFields);
    const { data, error } = isNumericId
      ? await query.eq('id', Number(uuid)).select().single()
      : await query.eq('finance_uuid', uuid).select().single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    // Synchronize with cash_transaction_ledger
    try {
      const { syncCashHistoryDayRow, getISTTimestamp } = await import('../../utils/cashLedgerHelper');
      const loanUuid = data.finance_uuid || uuid;
      const effectiveDate = data.debt_date || rawDebtDate;
      const effectiveAmount = Number(data.customer_debt_money || data.amount || 0);

      // Find initial disbursement entry in cash_transaction_ledger across possible ID matches
      const { data: existingLedgerRows } = await supabase
        .from('cash_transaction_ledger')
        .select('*')
        .or(`transaction_id.eq.${loanUuid},transaction_id.eq.${uuid},transaction_id.eq.${data.id}`)
        .eq('flow_type', 'OUT');

      // Helper to resolve/create target cash_history bucket
      let targetCashHistoryUuid: string | null = null;
      if (effectiveDate) {
        const { data: targetDays } = await supabase
          .from('cash_history')
          .select('cash_history_uuid')
          .eq('date', effectiveDate)
          .order('created_at', { ascending: false });

        if (targetDays && targetDays.length > 0) {
          targetCashHistoryUuid = targetDays[0].cash_history_uuid;
        } else {
          const { data: createdDay } = await supabase
            .from('cash_history')
            .insert([{
              date: effectiveDate,
              current_cash: 0,
              no_of_transactions: 0,
              created_at: getISTTimestamp(effectiveDate),
              updated_at: getNowISTISO(),
            }])
            .select()
            .single();
          if (createdDay) targetCashHistoryUuid = createdDay.cash_history_uuid;
        }
      }

      const metalType = (data.debt_category === 'SILVER' ? 'SILVER' : 'GOLD');
      const notes = `Loan disbursed ₹${effectiveAmount.toLocaleString('en-IN')} to ${data.customer_name || 'Customer'}`;

      if (existingLedgerRows && existingLedgerRows.length > 0) {
        for (const ledgerRow of existingLedgerRows) {
          const oldCashHistoryUuid = ledgerRow.cash_history_uuid;
          const newCashHistoryUuid = targetCashHistoryUuid || oldCashHistoryUuid;

          await supabase
            .from('cash_transaction_ledger')
            .update({
              cash_history_uuid: newCashHistoryUuid,
              transaction_cash_total: effectiveAmount,
              metal_type: metalType,
              item_type: `Pledge Loan: ${data.item_name || 'Ornament'}`,
              notes: notes,
              created_at: getISTTimestamp(effectiveDate),
              bill_date: effectiveDate,
            })
            .eq('uuid', ledgerRow.uuid);

          // Re-sync daily balances for old and new day buckets
          if (oldCashHistoryUuid) await syncCashHistoryDayRow(oldCashHistoryUuid);
          if (newCashHistoryUuid && newCashHistoryUuid !== oldCashHistoryUuid) {
            await syncCashHistoryDayRow(newCashHistoryUuid);
          }
        }
      } else if (targetCashHistoryUuid && effectiveAmount > 0) {
        // If no ledger entry existed yet, insert one now
        await supabase
          .from('cash_transaction_ledger')
          .insert([{
            cash_history_uuid: targetCashHistoryUuid,
            transaction_id: loanUuid,
            transaction_type: 'FINANCE',
            flow_type: 'OUT',
            transaction_cash_total: effectiveAmount,
            metal_type: metalType,
            item_type: `Pledge Loan: ${data.item_name || 'Ornament'}`,
            notes: notes,
            created_at: getISTTimestamp(effectiveDate),
            bill_date: effectiveDate,
          }]);
        await syncCashHistoryDayRow(targetCashHistoryUuid);
      }
    } catch (syncErr) {
      console.warn('⚠️ Cash ledger update sync error on loan update:', syncErr);
    }

    memoryCache.clear();
    res.json({ success: true, message: 'Loan updated successfully.', record: data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/finance/:uuid — Cascading Delete of Loan Record
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:uuid', async (req: Request, res: Response) => {
  const { uuid } = req.params;
  try {
    // 1. Delete all installment payments from payment history
    await supabase.from('finance_payment_history').delete().eq('finance_uuid', uuid);

    // 2. Capture affected cash_history_uuids before deleting
    const { data: affectedLedgerRows } = await supabase
      .from('cash_transaction_ledger')
      .select('cash_history_uuid')
      .or(`transaction_id.eq.${uuid},notes.ilike.%${uuid}%`);

    const affectedDayUuids = Array.from(new Set((affectedLedgerRows || []).map((r: any) => r.cash_history_uuid).filter(Boolean)));

    // 3. Delete any matching entries from cash_transaction_ledger
    await supabase
      .from('cash_transaction_ledger')
      .delete()
      .or(`transaction_id.eq.${uuid},notes.ilike.%${uuid}%`);

    // 4. Re-sync affected daily cash balances
    try {
      const { syncCashHistoryDayRow } = await import('../../utils/cashLedgerHelper');
      for (const dayUuid of affectedDayUuids) {
        await syncCashHistoryDayRow(dayUuid as string);
      }
    } catch (syncErr) {
      console.warn('⚠️ Cash ledger re-sync warning on loan delete:', syncErr);
    }

    // 5. Delete master loan record from finance table
    const { error } = await supabase.from('finance').delete().eq('finance_uuid', uuid);
    if (error) return res.status(500).json({ success: false, message: error.message });

    memoryCache.clear();
    res.json({ success: true, message: 'Loan record and payment history permanently deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});



export default router;
