import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../../config/supabase';

const router = Router();
const BUCKET = 'loan-item-images';

// In-memory fallback ledger (in case interests table is not created in Supabase yet)
let fallbackLedger: any[] = [
  {
    id: '1',
    customer_id: 'CUST-0001',
    loan_date: '2026-01-10',
    customer_name: 'Suresh',
    customer_surname: 'Patel',
    customer_phone: '9876501234',
    amount: 85000,
    interest_rate_percent: 1.5,
    timeline_months: 6,
    monthly_interest: 1275,
    total_interest: 7650,
    total_payable: 92650,
    item_name: '22K Gold Bangle Set',
    item_weight_grams: 18.5,
    item_purity_percent: 91.6,
    item_metal_type: 'gold',
    item_pure_weight: 16.946,
    item_metal_rate_per_gram: 15000,
    item_total_value: 254190,
    item_image_url: null,
    status: 'OPEN',
  },
];

// Multer: store file in memory buffer (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req: any, file: any, cb: any) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

// Ensure the loan-item-images bucket exists (auto-create if not)
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: { name: string }) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/*'],
      });
      console.log(`✅ Storage bucket '${BUCKET}' created automatically.`);
    }
  } catch (err) {
    console.warn('⚠️ Supabase bucket check warning:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/upload-image
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-image', upload.single('image'), async (req: Request & { file?: any }, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided or unsupported format.' });
  }

  try {
    await ensureBucketExists();
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `loan-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error || !data) {
      console.error('❌ Supabase Storage upload error:', JSON.stringify(error));
      return res.status(500).json({
        success: false,
        message: `Storage upload failed: ${error?.message || 'Unknown Supabase error'}`,
        detail: error,
      });
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    res.json({ success: true, url: publicUrlData.publicUrl, path: data.path });
  } catch (err: any) {
    console.error('❌ Image upload exception:', err);
    res.status(500).json({ success: false, message: `Image upload exception: ${err?.message || err}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/metal-rates
// ─────────────────────────────────────────────────────────────────────────────
router.get('/metal-rates', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('updated_metal_values')
      .select('gold_buy_value, silver_buy_value')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.warn('⚠️ Could not fetch updated_metal_values from Supabase, using defaults:', error?.message);
      return res.json({
        success: true,
        gold_buy_value: 15000,
        silver_buy_value: 250,
        gold_rate_per_gram: 15000,
        silver_rate_per_gram: 250,
      });
    }

    res.json({
      success: true,
      gold_buy_value: Number(data.gold_buy_value),
      silver_buy_value: Number(data.silver_buy_value),
      gold_rate_per_gram: Number(data.gold_buy_value),
      silver_rate_per_gram: Number(data.silver_buy_value),
    });
  } catch (err) {
    res.json({
      success: true,
      gold_buy_value: 15000,
      silver_buy_value: 250,
      gold_rate_per_gram: 15000,
      silver_rate_per_gram: 250,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/overview
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', async (req: Request, res: Response) => {
  try {
    let records: any[] = [];
    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('⚠️ Could not fetch interests table from Supabase, using in-memory ledger:', error?.message);
      records = fallbackLedger;
    } else {
      records = data;
    }

    const calculatedLedger = records.map((rec: any) => {
      const startDate = new Date(rec.loan_date);
      const endDate = rec.status === 'CLOSED' && rec.closing_date ? new Date(rec.closing_date) : new Date();
      const diffDays = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      const totalMonthsExact = diffDays / 30;
      const interestTillToday = Number((rec.amount * (rec.interest_rate_percent / 100) * totalMonthsExact).toFixed(2));

      // Month-wise Interest (Day 0-30 = 1 mo, Day 31-60 = 2 mos...)
      const monthlyInterestVal = Number(rec.amount) * (Number(rec.interest_rate_percent) / 100);
      const monthWiseCount = diffDays === 0 ? 1 : Math.floor((diffDays - 1) / 30) + 1;
      const monthWiseInterest = Number((monthlyInterestVal * monthWiseCount).toFixed(2));

      return {
        ...rec,
        actual_timeline_till_date: `${months} Mos ${days} Days`,
        total_interest_till_today: interestTillToday,
        total_payable_till_today: Number((rec.amount + interestTillToday).toFixed(2)),
        month_wise_count: monthWiseCount,
        month_wise_interest: monthWiseInterest,
      };
    });

    const openLoans = calculatedLedger.filter((r: any) => r.status === 'OPEN');
    const summary = {
      totalDebtIssued: openLoans.reduce((acc: number, r: any) => acc + Number(r.amount), 0),
      totalInterestEarned: calculatedLedger.reduce((acc: number, r: any) => {
        const interestVal = r.status === 'CLOSED'
          ? Number(r.final_consideration_interest_amount ?? r.total_interest_till_today ?? 0)
          : Number(r.total_interest_till_today || 0);
        return acc + interestVal;
      }, 0),
      activeOpenLoans: openLoans.length,
      totalClosedLoans: calculatedLedger.filter((r: any) => r.status === 'CLOSED').length,
    };

    res.json({ success: true, module: 'finance-backend', summary, ledger: calculatedLedger });
  } catch (err) {
    res.json({
      success: true,
      module: 'finance-backend',
      summary: { totalDebtIssued: 85000, totalInterestEarned: 1275, activeOpenLoans: 1, totalClosedLoans: 0 },
      ledger: fallbackLedger,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/debt/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/debt/create', async (req: Request, res: Response) => {
  const {
    loan_date,
    customer_name,
    customer_surname,
    customer_phone,
    customer_address,
    amount,
    interest_rate_percent,
    timeline_months,
    item_name,
    item_weight_grams,
    item_purity_percent,
    item_metal_type,
    item_metal_rate_per_gram,
    item_image_url,
  } = req.body;

  if (
    !customer_name || !customer_surname || !customer_phone ||
    !amount || !interest_rate_percent || !timeline_months ||
    !item_name || !item_weight_grams || !item_purity_percent ||
    !item_metal_type || !item_metal_rate_per_gram
  ) {
    return res.status(400).json({ success: false, message: 'Missing required loan fields' });
  }

  const payload = {
    loan_date: loan_date || new Date().toISOString().split('T')[0],
    customer_name: String(customer_name).trim(),
    customer_surname: String(customer_surname).trim(),
    customer_phone: String(customer_phone).trim(),
    customer_address: customer_address ? String(customer_address).trim() : '',
    amount: Number(amount),
    interest_rate_percent: Number(interest_rate_percent),
    timeline_months: Number(timeline_months),
    item_name: String(item_name).trim(),
    item_weight_grams: Number(item_weight_grams),
    item_purity_percent: Number(item_purity_percent),
    item_metal_type: String(item_metal_type),
    item_metal_rate_per_gram: Number(item_metal_rate_per_gram),
    item_image_url: item_image_url || null,
    status: 'OPEN',
  };

  try {
    const { data, error } = await supabase
      .from('interests')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.warn('⚠️ Supabase insert into interests failed:', JSON.stringify(error || 'No data returned'));
      const pureWt = Number(item_weight_grams) * (Number(item_purity_percent) / 100);
      const monthlyInt = Number(amount) * (Number(interest_rate_percent) / 100);
      const totalInt = monthlyInt * Number(timeline_months);

      const fallbackRecord = {
        id: String(fallbackLedger.length + 1),
        customer_id: `CUST-${String(fallbackLedger.length + 1).padStart(2, '0')}`,
        ...payload,
        monthly_interest: monthlyInt,
        total_interest: totalInt,
        total_payable: Number(amount) + totalInt,
        item_pure_weight: pureWt,
        item_total_value: pureWt * Number(item_metal_rate_per_gram),
        actual_timeline_till_date: '0 Mos 0 Days',
        total_interest_till_today: 0,
        total_payable_till_today: Number(amount),
      };

      fallbackLedger.unshift(fallbackRecord);
      return res.json({ success: true, message: 'Loan created (in-memory mode)', record: fallbackRecord });
    }

    res.json({ success: true, message: 'Pledge loan record created successfully', record: data });
  } catch (err: any) {
    const pureWt = Number(item_weight_grams) * (Number(item_purity_percent) / 100);
    const monthlyInt = Number(amount) * (Number(interest_rate_percent) / 100);
    const totalInt = monthlyInt * Number(timeline_months);

    const fallbackRecord = {
      id: String(fallbackLedger.length + 1),
      customer_id: `CUST-${String(fallbackLedger.length + 1).padStart(4, '0')}`,
      ...payload,
      monthly_interest: monthlyInt,
      total_interest: totalInt,
      total_payable: Number(amount) + totalInt,
      item_pure_weight: pureWt,
      item_total_value: pureWt * Number(item_metal_rate_per_gram),
      actual_timeline_till_date: '0 Mos 0 Days',
      total_interest_till_today: 0,
      total_payable_till_today: Number(amount),
    };

    fallbackLedger.unshift(fallbackRecord);
    res.json({ success: true, message: 'Loan created (fallback mode)', record: fallbackRecord });
  }
});

// PATCH /api/finance/debt/:id/close
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/debt/:id/close', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { final_consideration_interest_amount, closing_date, considered_type } = req.body || {};
  const closeDate = closing_date || new Date().toISOString().split('T')[0];

  const updateFields: any = {
    status: 'CLOSED',
    closing_date: closeDate,
    updated_at: new Date().toISOString(),
  };

  if (final_consideration_interest_amount !== undefined) {
    updateFields.final_consideration_interest_amount = Number(final_consideration_interest_amount);
  }
  if (considered_type) {
    updateFields.considered_type = String(considered_type);
  }

  try {
    const { data, error } = await supabase
      .from('interests')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('⚠️ Supabase update status failed, updating fallback ledger:', error?.message);
      const idx = fallbackLedger.findIndex(r => r.id === id);
      if (idx !== -1) {
        fallbackLedger[idx].status = 'CLOSED';
        fallbackLedger[idx].closing_date = closeDate;
        if (final_consideration_interest_amount !== undefined) {
          fallbackLedger[idx].final_consideration_interest_amount = Number(final_consideration_interest_amount);
        }
        if (considered_type) {
          fallbackLedger[idx].considered_type = String(considered_type);
        }
      }
      return res.json({ success: true, message: 'Loan closed (fallback mode)' });
    }

    res.json({ success: true, message: 'Loan closed successfully', record: data });
  } catch (err) {
    const idx = fallbackLedger.findIndex(r => r.id === id);
    if (idx !== -1) fallbackLedger[idx].status = 'CLOSED';
    res.json({ success: true, message: 'Loan closed (fallback mode)' });
  }
});

export default router;
