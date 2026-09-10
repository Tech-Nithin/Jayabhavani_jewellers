import { supabase } from '../../config/supabase';
import { memoryCache } from '../../config/memoryCache';
import { Router, Request, Response } from 'express';
import { activeMetalValues } from '../../metal-rates-backend/index';
import { getNowISTISO, getTodayIST, toISTTimestamp, toISTDateOnly } from '../../utils/dateHelper';

const router = Router();

const round3Decimals = (val: number): number => {
  if (isNaN(val)) return 0;
  const scaled = val * 1000;
  const floorVal = Math.floor(scaled);
  const diff = Number((scaled - floorVal).toFixed(6));
  return diff > 0.5 ? Math.ceil(scaled) / 1000 : floorVal / 1000;
};

let invoicesList: any[] = [];

router.post('/calculate', (req: Request, res: Response) => {
  const { items, rates, mode } = req.body;
  const isOrderMode = (mode || '').toUpperCase() === 'ORDER';

  const currentRates = rates || activeMetalValues;

  if (items && Array.isArray(items)) {
    const itemDetails: Record<string, { metalVal: number; netWeight: number; pureWeight: number; wastageVal: number; makingVal: number; additionalVal: number; lineTotal: number; rate: number }> = {};
    let totalSellValue = 0;
    let totalBuyCredit = 0;

    items.forEach((it: any) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
      const customRate = Number(it.custom_rate_per_gram || it.customRate || it.appliedRate);
      const defaultRate = isGold
        ? (isSell ? currentRates.gold_sell_value || 0 : currentRates.gold_buy_value || 0)
        : (isSell ? currentRates.silver_sell_value || 0 : currentRates.silver_buy_value || 0);
      const rate = customRate > 0 ? customRate : defaultRate;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, round3Decimals(grossWeight - deductionWeight));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = round3Decimals(netWeight * (purityPercent / 100));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const wastageWeight = isSell ? round3Decimals((wastagePercent / 100) * netWeight) : 0;
      // SELL: totalChargedWeight = netWeight + HMW wastage weight (rate applied on this)
      // BUY:  pureWeight = netWeight * (purity/100) (rate applied on this)
      const totalChargedWeight = isSell ? round3Decimals(netWeight + wastageWeight) : pureWeight;

      const makingChargesPerGram = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const wastageVal = 0;
      let metalVal = 0;

      if (isSell) {
        // SELL / ORDER JBJ item / TRADE-IN new ornament: totalChargedWeight (after HMW) × rate
        metalVal = Number((totalChargedWeight * rate).toFixed(2));
      } else {
        // BUY items
        if (isOrderMode) {
          // ORDER customer old metal: netWeight × rate
          metalVal = Number((netWeight * rate).toFixed(2));
        } else {
          // BUY / TRADE-IN customer old item: pureWeight × rate
          metalVal = Number((pureWeight * rate).toFixed(2));
        }
      }

      // making charges added directly as flat amount
      const makingVal = isSell ? Number(makingChargesPerGram.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      itemDetails[it.id] = { metalVal, netWeight, pureWeight, wastageVal, makingVal, additionalVal, lineTotal, rate };

      if (isSell) {
        totalSellValue += lineTotal;
      } else {
        totalBuyCredit += lineTotal;
      }
    });

    totalSellValue = Number(totalSellValue.toFixed(2));
    totalBuyCredit = Number(totalBuyCredit.toFixed(2));
    const netPayable = Number(Math.abs(totalSellValue - totalBuyCredit).toFixed(2));

    return res.json({
      success: true,
      itemDetails,
      totalSellValue,
      totalBuyCredit,
      netPayable,
    });
  }

  const {
    transaction_type,
    metal_type,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
  } = req.body;

  const weight = Number(weight_grams) || 0;
  const purity = Number(purity_percentage) || 100;
  const mcPerGram = Number(making_charges_per_gram) || 0;
  const gstRate = Number(gst_percent) || 0;

  let applied_rate_per_gram = 0;
  if (metal_type === 'GOLD') {
    applied_rate_per_gram = transaction_type === 'SELL' ? currentRates.gold_sell_value : currentRates.gold_buy_value;
  } else {
    applied_rate_per_gram = transaction_type === 'SELL' ? currentRates.silver_sell_value : currentRates.silver_buy_value;
  }

  const pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
  const metal_value = Number((weightUsed * applied_rate_per_gram).toFixed(2));
  const making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
  const subtotal = metal_value + making_charges;
  const gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;
  const final_amount = Number((subtotal + gst_amount).toFixed(2));

  res.json({
    success: true,
    calculation: {
      transaction_type,
      metal_type,
      weight_grams: weight,
      purity_percentage: purity,
      applied_rate_per_gram,
      pure_metal_weight,
      metal_value,
      making_charges,
      gst_amount,
      final_amount,
    },
  });
});

const formatCustomerBillingToInvoice = (b: any) => {
  const receipt = typeof b.bill_json === 'string' ? JSON.parse(b.bill_json) : (b.bill_json || {});
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const primaryItem = items[0] || {};
  const productNames = items.length > 0
    ? items.map((i: any) => i.product_name || i.item_name || i.name).filter(Boolean).join(', ')
    : (primaryItem.product_name || primaryItem.item_name || `${b.bill_type || 'SELL'} Item`);

  const totalWeight = items.reduce((acc: number, i: any) => acc + Number(i.weight_grams || i.gross_weight_grams || i.item_weight || 0), 0);

  return {
    id: b.billing_id || b.customer_billing_uuid,
    customer_billing_uuid: b.customer_billing_uuid,
    customer_name: b.customer_name,
    customer_phone: b.customer_phone || '-',
    customer_address: b.customer_address || receipt.customer_address || '',
    transaction_type: b.bill_type || 'SELL',
    metal_type: primaryItem.metal_type || 'GOLD',
    product_name: productNames,
    weight_grams: totalWeight || Number(primaryItem.weight_grams || 0),
    purity_percentage: Number(primaryItem.purity_percentage || primaryItem.touch_percentage || 91.6),
    applied_rate_per_gram: Number(primaryItem.applied_rate_per_gram || primaryItem.appliedRate || receipt.rates?.gold_sell_value || 0),
    pure_metal_weight: Number(primaryItem.pure_metal_weight || primaryItem.pure_weight_grams || 0),
    metal_value: Number(receipt.totalSellValue || b.total_amount || 0),
    making_charges: Number(primaryItem.making_charges || primaryItem.making_charges_per_gram || 0),
    gst_amount: Number(receipt.gstVal || 0),
    final_amount: Number(b.total_amount || 0),
    paid_amount: Number(b.paid_amount || 0),
    due_amount: Number(b.due_amount || 0),
    bill_date: b.bill_date || receipt.bill_date || (b.created_at ? b.created_at.split('T')[0] : null),
    payment_status: b.payment_status || (Number(b.due_amount || 0) <= 0 ? 'PAID' : 'PARTIAL'),
    image_url: primaryItem.image_url || receipt.image_url || null,
    receipt_json_data: receipt,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
};

async function generateNextBillingId(billType: string): Promise<string> {
  const prefix = billType.toUpperCase() === 'ORDER' ? 'ORD' : 'INV';
  try {
    const { data } = await supabase
      .from('customer_billing')
      .select('billing_id')
      .order('created_at', { ascending: false })
      .limit(100);

    let maxNum = 0;
    (data || []).forEach((row: any) => {
      if (row.billing_id) {
        const match = String(row.billing_id).match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num < 1000000 && num > maxNum) maxNum = num;
        }
      }
    });
    return `${prefix}-${Math.max(maxNum + 1, 1001)}`;
  } catch (e) {
    return `${prefix}-${Date.now()}`;
  }
}

// GET /api/billing/invoices/:id - Fetch single invoice with full receipt_json_data on demand
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let dbInvoice: any = null;

    const { data: byBillingId } = await supabase
      .from('customer_billing')
      .select('*')
      .eq('billing_id', id)
      .maybeSingle();

    if (byBillingId) {
      dbInvoice = formatCustomerBillingToInvoice(byBillingId);
    } else {
      const { data: byUuid } = await supabase
        .from('customer_billing')
        .select('*')
        .eq('customer_billing_uuid', id)
        .maybeSingle();
      if (byUuid) {
        dbInvoice = formatCustomerBillingToInvoice(byUuid);
      }
    }

    if (dbInvoice) {
      return res.json({ success: true, invoice: dbInvoice });
    }
    const mockMatch = invoicesList.find((inv) => inv.id === id);
    return res.json({ success: true, invoice: mockMatch || null });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/billing/customer-directory - 1:1 Individual Invoice Directory Records with Server-Side Pagination
router.get('/customer-directory', async (req: Request, res: Response) => {
  try {
    const rawLimit = (req.query.limit as string) || '10';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const search = ((req.query.search as string) || '').trim();
    const history = ((req.query.history as string) || '').trim().toUpperCase();
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const isAll = rawLimit.toUpperCase() === 'ALL' || rawLimit === '0';
    const limit = isAll ? 0 : (parseInt(rawLimit, 10) || 10);

    const isDefaultDirQuery = page === 1 && limit === 10 && !search && (!history || history === 'ALL') && !from && !to;
    const cacheKey = isDefaultDirQuery ? 'customer_directory_page_1' : null;

    if (cacheKey) {
      const cached = memoryCache.get<any>(cacheKey);
      if (cached) return res.json(cached);
    }

    let query = supabase
      .from('customer_billing')
      .select('*', { count: 'estimated' });

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    if (history && history !== 'ALL') {
      query = query.eq('bill_type', history);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    query = query.order('created_at', { ascending: false });

    if (!isAll && limit > 0) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;

    let list: any[] = data ? data.map(formatCustomerBillingToInvoice) : [];
    let totalCount = count !== null && count !== undefined ? count : list.length;

    if (error) {
      console.warn('Supabase DB fetch customer-directory warning:', error);
      list = invoicesList;
      totalCount = list.length;
    }

    const customers = list.map((inv) => ({
      name: inv.customer_name,
      phone: inv.customer_phone || '-',
      address: inv.customer_address || inv.receipt_json_data?.customer_address || 'N/A',
      products: inv.product_name ? [inv.product_name] : ['-'],
      totalWeight: Number(inv.weight_grams) || 0,
      totalSpent: Number(inv.final_amount) || (inv.receipt_json_data ? Math.abs(Number(inv.receipt_json_data.totalSellValue || 0) - Number(inv.receipt_json_data.totalBuyCredit || 0)) : 0),
      ordersCount: 1,
      lastDate: inv.created_at,
      latestInvoice: {
        ...inv,
        transaction_type: inv.transaction_type || inv.receipt_json_data?.transaction_type || 'SELL',
      },
    }));

    const totalPages = isAll || limit <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / limit));

    const responseObj = {
      success: true,
      customers,
      totalCount,
      page,
      limit: isAll ? 'ALL' : limit,
      totalPages,
    };

    if (cacheKey) {
      memoryCache.set(cacheKey, responseObj, 300);
    }

    return res.json(responseObj);
  } catch (err) {
    console.error('Error in customer-directory route:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching customer directory.' });
  }
});

// GET /api/billing/invoices - Fetch all invoice records from PostgreSQL / Supabase
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('customer_billing')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return res.json({
        success: true,
        invoices: data.map(formatCustomerBillingToInvoice),
      });
    }
  } catch (err) {
    console.error('Supabase DB customer_billing fetch warning:', err);
  }

  res.json({
    success: true,
    invoices: invoicesList,
  });
});

// POST /api/billing/create - Create & save new invoice in PostgreSQL
router.post('/create', async (req: Request, res: Response) => {
  const {
    customer_name,
    customer_phone = '',
    customer_address = '',
    transaction_type,
    metal_type,
    product_name,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
    receipt_json_data = null,
  } = req.body;

  if (!customer_name || !transaction_type || !metal_type || !product_name || !weight_grams) {
    return res.status(400).json({
      success: false,
      message: 'Missing required billing fields',
    });
  }

  const weight = Number(weight_grams);
  const purity = Number(purity_percentage) || 100;
  const mcPerGram = Number(making_charges_per_gram) || 0;
  const gstRate = Number(gst_percent) || 0;

  let applied_rate_per_gram = 0;
  if (metal_type === 'GOLD') {
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value;
  } else {
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value;
  }

  let pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
  let metal_value = Number((weightUsed * applied_rate_per_gram).toFixed(2));
  let making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
  const subtotal = metal_value + making_charges;
  let gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;

  let final_weight = weight;
  let final_product_name = product_name;
  let final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  let resolvedMetalType = (metal_type || 'GOLD').toUpperCase();

  if (receipt_json_data && receipt_json_data.items && Array.isArray(receipt_json_data.items)) {
    let sumPureW = 0;
    let sumMetalVal = 0;
    let sumMaking = 0;
    let sumGst = 0;

    receipt_json_data.items = receipt_json_data.items.map((it: any) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
      const customRate = Number(it.custom_rate_per_gram || it.customRate || it.appliedRate);
      const defaultRate = isGold
        ? (isSell ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
        : (isSell ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);
      const rate = customRate > 0 ? customRate : defaultRate;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, Number((grossWeight - deductionWeight).toFixed(3)));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = Number((netWeight * (purityPercent / 100)).toFixed(3));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const makingCharges = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const metalVal = isSell
        ? Number((netWeight * rate).toFixed(2))
        : Number((pureWeight * rate).toFixed(2));

      const wastageVal = isSell ? Number(((wastagePercent / 100) * netWeight * rate).toFixed(2)) : 0;
      const makingVal = isSell ? Number(makingCharges.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      sumPureW += pureWeight;
      sumMetalVal += metalVal;
      sumMaking += makingVal;
      sumGst += wastageVal;

      return {
        ...it,
        net_weight_grams: netWeight,
        netWeight,
        metalVal,
        wastageVal,
        makingVal,
        additionalVal,
        appliedRate: rate,
        applied_rate_per_gram: rate,
        lineTotal,
        line_total: lineTotal,
      };
    });

    if (transaction_type === 'BUY') {
      final_amount_val = Number(receipt_json_data.totalBuyCredit) || Number((subtotal + gst_amount).toFixed(2));
    } else if (transaction_type === 'EXCHANGE') {
      const sellVal = Number(receipt_json_data.totalSellValue) || 0;
      const buyVal = Number(receipt_json_data.totalBuyCredit) || 0;
      final_amount_val = Number(Math.abs(sellVal - buyVal).toFixed(2));
    } else if (receipt_json_data.netPayable !== undefined) {
      final_amount_val = Number(receipt_json_data.netPayable);
    }

    final_weight = receipt_json_data.items.reduce((acc: number, item: any) => acc + (Number(item.weight_grams) || 0), 0);
    pure_metal_weight = Number(sumPureW.toFixed(3));
    metal_value = Number(sumMetalVal.toFixed(2));
    making_charges = Number(sumMaking.toFixed(2));
    gst_amount = Number(sumGst.toFixed(2));

    const hasGold = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'GOLD');
    const hasSilver = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'SILVER');
    if (hasGold && hasSilver) {
      resolvedMetalType = 'MIXED';
    } else if (hasSilver && !hasGold) {
      resolvedMetalType = 'SILVER';
    } else if (hasGold && !hasSilver) {
      resolvedMetalType = 'GOLD';
    }
    receipt_json_data.metal_type = resolvedMetalType;
    if (!receipt_json_data.rates) {
      receipt_json_data.rates = activeMetalValues;
    }

    final_product_name = receipt_json_data.items
      .map((i: any) => `${i.product_name || (i.metal_type + ' Item')} (${i.weight_grams}g)`)
      .join(', ');
  } else if (transaction_type === 'BUY') {
    final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  }

  const paidAmt = req.body.paid_amount !== undefined ? Number(req.body.paid_amount) : Number(receipt_json_data?.advancePaidAmount ?? final_amount_val);
  const dueAmt = req.body.due_amount !== undefined ? Number(req.body.due_amount) : Number(receipt_json_data?.balanceDueAmount ?? 0);

  const rawBillDate = req.body.bill_date || req.body.billDate || req.body.date || receipt_json_data?.bill_date || receipt_json_data?.billDate;
  const invoiceCreatedAt = req.body.created_at ? toISTTimestamp(req.body.created_at) : (rawBillDate ? getNowISTISO(`${rawBillDate}T${getNowISTISO().split('T')[1]}`) : getNowISTISO());
  const resolvedBillDate = rawBillDate || toISTDateOnly(invoiceCreatedAt);

  const newInvoicePayload: any = {
    customer_name: customer_name || 'Walk-in Customer',
    customer_phone: customer_phone || '',
    customer_address: customer_address || '',
    transaction_type: transaction_type || 'SELL',
    metal_type: resolvedMetalType,
    product_name: (final_product_name || 'Jewellery Item').substring(0, 250),
    weight_grams: Number(final_weight) || 0,
    purity_percentage: Number(purity) || 100,
    applied_rate_per_gram: Number(applied_rate_per_gram) || 0,
    pure_metal_weight: Number(pure_metal_weight) || 0,
    metal_value: Number(metal_value) || 0,
    making_charges: Number(making_charges) || 0,
    gst_amount: Number(gst_amount) || 0,
    final_amount: Number(final_amount_val) || 0,
    paid_amount: Number(paidAmt) || 0,
    due_amount: Number(dueAmt) || 0,
    bill_date: resolvedBillDate,
    gold_buy_rate_snapshot: Number(activeMetalValues.gold_buy_value) || 0,
    gold_sell_rate_snapshot: Number(activeMetalValues.gold_sell_value) || 0,
    silver_buy_rate_snapshot: Number(activeMetalValues.silver_buy_value) || 0,
    silver_sell_rate_snapshot: Number(activeMetalValues.silver_sell_value) || 0,
    return_purity_percentage: Number(receipt_json_data?.items?.[0]?.return_purity_percentage) || 0,
    return_pure_gold: Number(receipt_json_data?.items?.[0]?.return_pure_gold) || 0,
    receipt_json_data: {
      ...receipt_json_data,
      bill_date: resolvedBillDate,
    },
    created_at: invoiceCreatedAt,
  };

  const billingId = await generateNextBillingId(transaction_type || 'SELL');
  const createdInvoice = { ...newInvoicePayload, id: billingId, billing_id: billingId };

  invoicesList.unshift(createdInvoice);

  // Record cash movement only — inventory deduction is handled by storeBillingTransaction -> recordInventoryMovement (single source of truth)
  recordInvoiceCashTransaction(createdInvoice).catch(() => { });

  // Trigger 3-table billing storage (customer_billing, billing_sell_buy_records, billing_payment_history)
  try {
    const { storeBillingTransaction } = await import('../../utils/billingStorageHelper');
    const storeRes = await storeBillingTransaction({
      billing_id: billingId,
      bill_type: (createdInvoice.transaction_type || 'SELL').toUpperCase(),
      bill_date: resolvedBillDate,
      customer_name: createdInvoice.customer_name,
      customer_phone: createdInvoice.customer_phone,
      customer_address: createdInvoice.customer_address,
      total_amount: Number(createdInvoice.final_amount || 0),
      paid_amount: Number(createdInvoice.paid_amount ?? (createdInvoice.transaction_type === 'BUY' ? 0 : createdInvoice.final_amount)),
      due_amount: Number(createdInvoice.due_amount || 0),
      receipt_json_data: createdInvoice.receipt_json_data,
      created_at: createdInvoice.created_at,
      metal_type: createdInvoice.metal_type,
      weight_grams: Number(createdInvoice.weight_grams || 0),
      product_name: createdInvoice.product_name,
      image_url: createdInvoice.image_url,
    });

    if (!storeRes.success) {
      console.warn('⚠️ storeBillingTransaction notice:', storeRes.error);
    }
  } catch (e) {
    console.warn('⚠️ storeBillingTransaction invocation warning:', e);
  }

  // Invalidate RAM cache instantly so all admins get fresh customer & order records
  memoryCache.clear();

  res.json({
    success: true,
    message: 'Billing invoice generated & persisted successfully',
    invoice: createdInvoice,
  });
});

// Helper to record invoice cash transaction into cash_history & cash_transaction_ledger
async function recordInvoiceCashTransaction(invoice: any) {
  try {
    const txnType = (invoice.transaction_type || 'SELL').toUpperCase();

    // BUG FIX: Use paid_amount for SELL/ORDER/EXCHANGE (actual cash received, not full invoice value)
    // For BUY (scrap purchase), use final_amount — shop always pays the full amount in cash
    let cashAmount = Number(invoice.paid_amount || invoice.final_amount || 0);
    let flowType: 'IN' | 'OUT' = 'IN';

    // 1. BUY (Scrap purchases from customer): Shop pays cash OUT to customer
    if (txnType === 'BUY') {
      cashAmount = Math.abs(Number(invoice.final_amount || invoice.paid_amount || 0));
      flowType = 'OUT';
    } 
    // 2. ORDER, SELL, EXCHANGE: Check exact cash direction (IN vs OUT)
    else {
      const totalBuyCredit = Number(invoice.total_buy_credit || invoice.receipt_json_data?.totalBuyCredit || 0);
      const totalSellValue = Number(invoice.total_sell_value || invoice.receipt_json_data?.totalSellValue || 0);

      const isShopPayingCustomer = 
        String(invoice.flow_type || invoice.direction || '').toUpperCase().includes('OUT') ||
        Number(invoice.paid_amount || 0) < 0 ||
        Boolean(invoice.is_refund) ||
        Boolean(invoice.shop_pays_customer) ||
        (totalBuyCredit > totalSellValue && totalBuyCredit > 0);

      if (isShopPayingCustomer) {
        flowType = 'OUT';
        cashAmount = Math.abs(Number(invoice.paid_amount || invoice.final_amount || 0));
      } else {
        flowType = 'IN';
        cashAmount = Math.abs(Number(invoice.paid_amount || invoice.final_amount || 0));
      }
    }

    if (cashAmount <= 0) {
      console.log(`ℹ️ No cash movement for ${txnType} Invoice #${invoice.id} (paid_amount = 0, Udhaari/Credit sale)`);
      return;
    }

    const { recordCashTransaction } = await import('../../utils/cashLedgerHelper');
    await recordCashTransaction({
      transaction_id: String(invoice.id),
      transaction_type: txnType as any,
      flow_type: flowType,
      amount: cashAmount,
      metal_type: invoice.metal_type || 'GOLD',
      item_type: invoice.product_name || `${txnType} Invoice`,
      notes: `${txnType} Invoice #${invoice.id} - ${invoice.customer_name || 'Walk-in'} (${flowType === 'OUT' ? 'Paid to Customer' : 'Collected'}: ₹${cashAmount.toLocaleString('en-IN')})`,
      date: invoice.bill_date || (invoice.created_at ? String(invoice.created_at).split('T')[0] : undefined),
    });
  } catch (err) {
    console.warn('⚠️ Error recording invoice cash transaction:', err);
  }
}

// Helper to deduct sold items from inventory_products (current_stock_weight, sold_quantity, sell_count) & log SALE_DEDUCTION
async function deductInventoryStockOnSale(invoice: any) {
  try {
    let rawData = typeof invoice.receipt_json_data === 'string'
      ? JSON.parse(invoice.receipt_json_data)
      : (invoice.receipt_json_data || {});

    const items: any[] = Array.isArray(rawData?.items) ? rawData.items : [];
    for (const item of items) {
      if (item.item_type === 'SELL') {
        const pName = item.product_name || item.name;
        const pId = item.product_id || item.id;
        const qtySold = Number(item.quantity || 1);
        const weightSold = Number(item.weight_grams || item.gross_weight_grams || item.net_weight_grams || 0);

        if (pName || pId) {
          let query = supabase.from('inventory_products').select('*');
          if (pId && !String(pId).startsWith('item-')) {
            query = query.eq('id', pId);
          } else if (pName) {
            query = query.ilike('name', `%${String(pName).trim()}%`);
          }

          const { data: matchedProds } = await query.limit(1);
          if (matchedProds && matchedProds.length > 0) {
            const prod = matchedProds[0];
            const currentStock = Number(prod.stock_quantity || 1);
            const currentSold = Number(prod.sold_quantity || 0);
            const currentWeight = Number(prod.current_stock_weight || 0);
            const newStock = Math.max(0, currentStock - qtySold);
            const newSold = currentSold + qtySold;
            const newWeight = Math.max(0, Number((currentWeight - weightSold).toFixed(3)));
            const newSellCount = Number(prod.sell_count || 0) + 1;

            await supabase
              .from('inventory_products')
              .update({
                sold_quantity: newSold,
                current_stock_weight: newWeight,
                sell_count: newSellCount,
              })
              .eq('id', prod.id);

            await supabase.from('inventory_stock_logs').insert([{
              item_id: prod.id,
              item_name: prod.item_name || prod.name || prod.category,
              metal_category: prod.item_type || 'GOLD',
              item_category: prod.category || 'General',
              previous_stock_weight: currentWeight,
              new_stock_weight: newWeight,
              notes: `Sold in ${invoice.transaction_type || 'SELL'} Invoice #${invoice.id} to ${invoice.customer_name || 'Customer'} (-${weightSold}g)`,
              created_at: getNowISTISO(),
            }]);
          }
        }
      } else if (item.item_type === 'BUY') {
        // Scrap metal purchase log
        const scrapWeight = Number(item.weight_grams || item.gross_weight_grams || item.net_weight_grams || 0);
        const cleanMetal = (item.metal_type || invoice.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
        if (scrapWeight > 0) {
          try {
            await supabase.from('inventory_stock_logs').insert([{
              item_id: `scrap-${Date.now()}`,
              item_name: `Old ${cleanMetal} Scrap / Buy-in`,
              metal_category: cleanMetal,
              item_category: 'Scrap Metal',
              previous_stock_weight: 0,
              new_stock_weight: scrapWeight,
              notes: `Scrap ${cleanMetal} received in ${invoice.transaction_type || 'BUY'} Invoice #${invoice.id} from ${invoice.customer_name || 'Customer'} (+${scrapWeight}g)`,
              created_at: getNowISTISO(),
            }]);
          } catch (logErr) {
            console.warn('⚠️ Scrap purchase stock log error:', logErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Inventory auto-deduction error:', err);
  }
}

// GET /api/billing/kpi-summary - Calculate cumulative running totals directly from billing_sell_buy_records
router.get('/kpi-summary', async (req: Request, res: Response) => {
  try {
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = supabase.from('billing_sell_buy_records').select('*');
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: rows, error } = await query;
    if (error) {
      console.warn('⚠️ Error fetching billing_sell_buy_records for KPI:', error.message);
    }

    const summary = (rows || []).reduce(
      (acc: any, r: any) => {
        const w = Number(r.item_weight) || 0;
        const amt = Number(r.total_item_price) || 0;
        const purity = Number(r.item_quality_percentage || r.hallmark_percentage) || 0;
        const metal = (r.metal_type || '').toUpperCase();
        const itemType = (r.transaction_type || '').toUpperCase();

        const billingMode = (r.billing_mode || '').toUpperCase();
        if (billingMode === 'ORDER') acc.orderCount++;
        else if (billingMode === 'SELL') acc.sellCount++;
        else if (billingMode === 'TRADE_IN' || billingMode === 'EXCHANGE') acc.exchangeCount++;

        if (itemType === 'BUY' || billingMode === 'BUY') {
          acc.buyCount++;
        }

        if (metal === 'GOLD' && itemType === 'SELL') {
          acc.goldSoldWeight += w;
          acc.goldSoldAmount += amt;
        } else if (metal === 'GOLD' && itemType === 'BUY') {
          acc.goldBoughtWeight += w;
          acc.goldBoughtAmount += amt;
          acc.goldBoughtPurityWeightedSum += purity * w;
        } else if (metal === 'SILVER' && itemType === 'SELL') {
          acc.silverSoldWeight += w;
          acc.silverSoldAmount += amt;
        } else if (metal === 'SILVER' && itemType === 'BUY') {
          acc.silverBoughtWeight += w;
          acc.silverBoughtAmount += amt;
          acc.silverBoughtPurityWeightedSum += purity * w;
        }
        return acc;
      },
      {
        orderCount: 0,
        sellCount: 0,
        buyCount: 0,
        exchangeCount: 0,
        goldSoldWeight: 0,
        goldSoldAmount: 0,
        goldBoughtWeight: 0,
        goldBoughtAmount: 0,
        goldBoughtPurityWeightedSum: 0,
        silverSoldWeight: 0,
        silverSoldAmount: 0,
        silverBoughtWeight: 0,
        silverBoughtAmount: 0,
        silverBoughtPurityWeightedSum: 0,
      }
    );

    res.json({
      success: true,
      summary,
      activityCounts: {
        orderCount: summary.orderCount,
        sellCount: summary.sellCount,
        buyCount: summary.buyCount,
        exchangeCount: summary.exchangeCount,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/billing/update/:id - Completely overwrite existing invoice record on the same ID
router.put('/update/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    customer_name,
    customer_phone = '',
    customer_address = '',
    transaction_type,
    metal_type,
    product_name,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
    receipt_json_data = null,
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({
      success: false,
      message: 'Missing customer name',
    });
  }

  const existingInv = invoicesList.find((i) => String(i.id) === String(id));
  const createdAt = existingInv?.created_at ? toISTTimestamp(existingInv.created_at) : getNowISTISO();

  let final_weight = Number(weight_grams) || 0;
  let final_product_name = product_name || 'Jewellery Item';
  let final_amount_val = 0;
  let pure_metal_weight = 0;
  let metal_value = 0;
  let making_charges = 0;
  let gst_amount = 0;
  let resolvedUpdateMetalType = (metal_type || 'GOLD').toUpperCase();

  if (receipt_json_data && receipt_json_data.items && Array.isArray(receipt_json_data.items)) {
    let totalSell = 0;
    let totalBuy = 0;
    let sumWeight = 0;
    const names: string[] = [];

    receipt_json_data.items.forEach((it: any) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
      const itemCustomRate = Number(it.custom_rate_per_gram || it.applied_rate_per_gram || it.appliedRate || it.rate || it.rate_per_gram || it.metal_rate || 0);
      const defaultRate = isGold
        ? (isSell ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
        : (isSell ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);
      const rate = itemCustomRate > 0 ? itemCustomRate : defaultRate;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, Number((grossWeight - deductionWeight).toFixed(3)));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = Number((netWeight * (purityPercent / 100)).toFixed(3));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const makingCharges = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const metalVal = isSell
        ? Number((netWeight * rate).toFixed(2))
        : Number((pureWeight * rate).toFixed(2));

      const wastageVal = isSell ? Number(((wastagePercent / 100) * netWeight * rate).toFixed(2)) : 0;
      const makingVal = isSell ? Number(makingCharges.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      sumWeight += grossWeight;
      pure_metal_weight += pureWeight;
      metal_value += metalVal;
      making_charges += makingVal;
      gst_amount += wastageVal;

      if (isSell) totalSell += lineTotal;
      else totalBuy += lineTotal;

      it.netWeight = netWeight;
      it.net_weight_grams = netWeight;
      it.metalVal = metalVal;
      it.wastageVal = wastageVal;
      it.makingVal = makingVal;
      it.additionalVal = additionalVal;
      it.appliedRate = rate;
      it.applied_rate_per_gram = rate;
      it.custom_rate_per_gram = rate;
      it.rate = rate;
      it.lineTotal = lineTotal;
      it.line_total = lineTotal;

      const itemName = it.product_name || `${it.metal_type} Item`;
      names.push(`${itemName} (${grossWeight}g)`);
    });

    final_weight = Number(sumWeight.toFixed(3));
    final_product_name = names.join(', ');
    final_amount_val = (transaction_type === 'EXCHANGE')
      ? Number(Math.abs(totalSell - totalBuy).toFixed(2))
      : Math.max(0, Number((totalSell - totalBuy).toFixed(2)));
    pure_metal_weight = Number(pure_metal_weight.toFixed(3));
    metal_value = Number(metal_value.toFixed(2));
    making_charges = Number(making_charges.toFixed(2));
    gst_amount = Number(gst_amount.toFixed(2));

    const hasGold = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'GOLD');
    const hasSilver = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'SILVER');
    if (hasGold && hasSilver) {
      resolvedUpdateMetalType = 'MIXED';
    } else if (hasSilver && !hasGold) {
      resolvedUpdateMetalType = 'SILVER';
    } else if (hasGold && !hasSilver) {
      resolvedUpdateMetalType = 'GOLD';
    }
    receipt_json_data.metal_type = resolvedUpdateMetalType;
  } else {
    const weight = Number(weight_grams) || 0;
    const purity = Number(purity_percentage) || 100;
    const mcPerGram = Number(making_charges_per_gram) || 0;
    const gstRate = Number(gst_percent) || 0;

    const itemCustomRate = Number(req.body.custom_rate_per_gram || req.body.applied_rate_per_gram || req.body.rate || req.body.metal_rate || 0);
    const defaultRate = metal_type === 'GOLD'
      ? (transaction_type === 'SELL' ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
      : (transaction_type === 'SELL' ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);
    const applied_rate = itemCustomRate > 0 ? itemCustomRate : defaultRate;

    pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
    const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
    metal_value = Number((weightUsed * applied_rate).toFixed(2));
    making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
    const subtotal = metal_value + making_charges;
    gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;
    final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  }

  const nowIso = getNowISTISO();
  const todayISTStr = getTodayIST();
  const rawBillDate = req.body.bill_date || req.body.billDate || req.body.date || receipt_json_data?.bill_date || receipt_json_data?.billDate;
  const resolvedBillDate = rawBillDate ? String(rawBillDate).trim() : (createdAt ? createdAt.split('T')[0] : todayISTStr);

  const existingHistory = Array.isArray(receipt_json_data?.update_history) ? receipt_json_data.update_history : [];
  const updateHistoryList = [...existingHistory, nowIso];

  const primaryItem = (receipt_json_data && receipt_json_data.items && receipt_json_data.items[0]) || {};
  const primaryRate = Number(primaryItem.applied_rate_per_gram || primaryItem.custom_rate_per_gram || primaryItem.rate || req.body.applied_rate_per_gram || (resolvedUpdateMetalType === 'SILVER' ? activeMetalValues.silver_sell_value : activeMetalValues.gold_sell_value));

  receipt_json_data.updated_at = nowIso;
  receipt_json_data.update_history = updateHistoryList;
  receipt_json_data.bill_date = resolvedBillDate;
  receipt_json_data.applied_rate_per_gram = primaryRate;

  const rawPaidVal = req.body.paid_amount ?? receipt_json_data?.paid_amount ?? receipt_json_data?.paidAmount;
  const paidVal = rawPaidVal !== undefined ? Number(rawPaidVal) : (transaction_type === 'BUY' ? 0 : final_amount_val);
  const rawDueVal = req.body.due_amount ?? receipt_json_data?.due_amount ?? receipt_json_data?.dueAmount;
  const dueVal = rawDueVal !== undefined ? Number(rawDueVal) : Math.max(0, Number((final_amount_val - paidVal).toFixed(2)));

  const updatedInvoice = {
    id,
    customer_name,
    customer_phone,
    customer_address,
    transaction_type: transaction_type || 'SELL',
    metal_type: resolvedUpdateMetalType,
    product_name: final_product_name,
    weight_grams: final_weight,
    purity_percentage: Number(purity_percentage) || 100,
    applied_rate_per_gram: primaryRate,
    pure_metal_weight,
    metal_value,
    making_charges,
    gst_amount,
    final_amount: final_amount_val,
    paid_amount: paidVal,
    due_amount: dueVal,
    bill_date: resolvedBillDate,
    gold_buy_rate_snapshot: activeMetalValues.gold_buy_value,
    gold_sell_rate_snapshot: activeMetalValues.gold_sell_value,
    silver_buy_rate_snapshot: activeMetalValues.silver_buy_value,
    silver_sell_rate_snapshot: activeMetalValues.silver_sell_value,
    receipt_json_data,
    created_at: createdAt,
    updated_at: nowIso,
  };

  // Overwrite in memory list
  const index = invoicesList.findIndex((i) => String(i.id) === String(id));
  if (index !== -1) {
    invoicesList[index] = updatedInvoice;
  } else {
    invoicesList.unshift(updatedInvoice);
  }

  // 1. Persist update to customer_billing, billing_sell_buy_records, and billing_payment_history
  try {
    const { storeBillingTransaction } = await import('../../utils/billingStorageHelper');
    const storeRes = await storeBillingTransaction({
      billing_id: String(updatedInvoice.id),
      bill_type: (updatedInvoice.transaction_type || 'SELL').toUpperCase(),
      bill_date: resolvedBillDate,
      customer_name: updatedInvoice.customer_name,
      customer_phone: updatedInvoice.customer_phone,
      customer_address: updatedInvoice.customer_address,
      total_amount: Number(updatedInvoice.final_amount || 0),
      paid_amount: Number(updatedInvoice.paid_amount),
      due_amount: Number(updatedInvoice.due_amount),
      receipt_json_data: updatedInvoice.receipt_json_data,
      created_at: updatedInvoice.created_at,
      metal_type: updatedInvoice.metal_type,
      weight_grams: Number(updatedInvoice.weight_grams || 0),
      product_name: updatedInvoice.product_name,
      image_url: (updatedInvoice as any).image_url,
    });

    if (!storeRes.success) {
      console.warn('⚠️ storeBillingTransaction update notice:', storeRes.error);
    }
  } catch (e) {
    console.warn('⚠️ storeBillingTransaction update warning:', e);
  }

  // 2. Synchronize cash_transaction_ledger & cash_history for this invoice ID
  try {
    const { syncCashHistoryDayRow } = await import('../../utils/cashLedgerHelper');
    const { data: oldLedgerEntries } = await supabase
      .from('cash_transaction_ledger')
      .select('cash_history_uuid')
      .or(`transaction_id.eq.${String(id)},transaction_id.eq.${String(updatedInvoice.id)}`);

    const affectedHistoryUuids = new Set<string>();
    if (oldLedgerEntries && oldLedgerEntries.length > 0) {
      oldLedgerEntries.forEach((e) => {
        if (e.cash_history_uuid) affectedHistoryUuids.add(e.cash_history_uuid);
      });
      await supabase
        .from('cash_transaction_ledger')
        .delete()
        .or(`transaction_id.eq.${String(id)},transaction_id.eq.${String(updatedInvoice.id)}`);
    }

    // Now record the updated cash movement cleanly
    await recordInvoiceCashTransaction(updatedInvoice);

    // Collect new cash_history_uuid
    const { data: newLedgerEntries } = await supabase
      .from('cash_transaction_ledger')
      .select('cash_history_uuid')
      .or(`transaction_id.eq.${String(id)},transaction_id.eq.${String(updatedInvoice.id)}`);

    if (newLedgerEntries && newLedgerEntries.length > 0) {
      newLedgerEntries.forEach((e) => {
        if (e.cash_history_uuid) affectedHistoryUuids.add(e.cash_history_uuid);
      });
    }

    // Automatically recalculate exact sum for all affected day rows
    for (const hUuid of affectedHistoryUuids) {
      await syncCashHistoryDayRow(hUuid);
    }
  } catch (cashErr) {
    console.warn('⚠️ Cash ledger synchronization warning on update:', cashErr);
  }

  // 3. Synchronize customer_metal_transactions for trade-in / scrap buy items
  try {
    await supabase.from('customer_metal_transactions').delete().eq('invoice_id', String(id));
    const itemsList: any[] = Array.isArray(receipt_json_data?.items) ? receipt_json_data.items : [];
    const scrapItems = itemsList.filter((i) => (i.item_type || '').toUpperCase() === 'BUY');
    if (scrapItems.length > 0) {
      const metalRecords = scrapItems.map((it) => ({
        invoice_id: String(id),
        customer_id: updatedInvoice.customer_phone || null,
        customer_phone: updatedInvoice.customer_phone,
        customer_name: updatedInvoice.customer_name,
        transaction_type: (updatedInvoice.transaction_type || 'SELL').toUpperCase(),
        metal_type: (it.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD',
        item_type: 'BUY',
        product_name: it.product_name || `Scrap Metal Intake`,
        weight_grams: Number(it.weight_grams || it.gross_weight_grams || 0),
        amount: Number(it.lineTotal || it.line_total || it.metalVal || 0),
        purity_percentage: Number(it.purity_percentage) || 100,
        created_at: updatedInvoice.created_at ? toISTTimestamp(updatedInvoice.created_at) : getNowISTISO(),
      }));
      await supabase.from('customer_metal_transactions').insert(metalRecords);
    }
  } catch (metalErr) {
    console.warn('⚠️ Metal transaction update warning:', metalErr);
  }

  // Invalidate cache
  memoryCache.clear();

  res.json({
    success: true,
    message: 'Invoice record completely updated across all tables',
    invoice: updatedInvoice,
  });
});

// GET /api/billing/presets - Fetch presets 100% directly from billing_presets database table
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('billing_presets')
      .select('*')
      .order('preset_name', { ascending: true });

    if (error) {
      console.warn('⚠️ Supabase billing_presets fetch error:', error);
      return res.status(500).json({ success: false, message: error.message, presets: {} });
    }

    const grouped: Record<string, string[]> = {};

    (data || []).forEach((row: any) => {
      const cat = row.category_name;
      if (!grouped[cat]) grouped[cat] = [];
      if (!grouped[cat].includes(row.preset_name)) {
        grouped[cat].push(row.preset_name);
      }
    });

    res.json({ success: true, presets: grouped });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server Error', presets: {} });
  }
});

// POST /api/billing/presets - Insert new custom preset into database
router.post('/presets', async (req: Request, res: Response) => {
  try {
    const { preset_name, category_name } = req.body;
    if (!preset_name || !category_name) {
      return res.status(400).json({ success: false, message: 'preset_name and category_name are required' });
    }

    const cleanName = String(preset_name).trim();
    const cleanCat = String(category_name).trim().toLowerCase();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'preset_name cannot be empty' });
    }

    const { data, error } = await supabase
      .from('billing_presets')
      .upsert([{ preset_name: cleanName, category_name: cleanCat }], { onConflict: 'preset_name,category_name' })
      .select('*');

    if (error) {
      console.warn('Supabase billing_presets insert error:', error);
    }

    res.json({ success: true, message: 'Preset saved successfully', preset: { preset_name: cleanName, category_name: cleanCat } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// PUT /api/billing/invoices/:id/settlement - Record installment/settlement payment on an invoice
router.put('/invoices/:id/settlement', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_now, note, bill_date, payment_date, custom_paid_at, payment_mode } = req.body;

    const pNow = Number(paid_now) || 0;
    if (pNow <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const resolvedDate = (custom_paid_at ? String(custom_paid_at).split('T')[0] : '') || bill_date || payment_date;

    const { recordAdditionalPayment } = await import('../../utils/billingStorageHelper');
    const result = await recordAdditionalPayment({
      billing_id: String(id),
      amount_paid: pNow,
      payment_mode: payment_mode || 'CASH',
      notes: note,
      bill_date: resolvedDate,
      payment_date: resolvedDate,
      custom_paid_at: custom_paid_at ? (String(custom_paid_at).includes('T') ? String(custom_paid_at) : toISTTimestamp(custom_paid_at)) : undefined,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Invalidate cache
    memoryCache.clear();

    res.json({
      success: true,
      message: `Payment of ₹${pNow.toLocaleString('en-IN')} recorded successfully in billing_payment_history`,
      paid_amount: result.paid_amount,
      due_amount: result.due_amount,
      payment_history: result.payment_history,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record invoice settlement' });
  }
});

// Helper: Checks if a date/timestamp matches date filter (all, single date, or date range) without timezone conversions
function matchesDateFilterIST(created_at: any, targetDate: string, startDate?: string, endDate?: string): boolean {
  if (targetDate === 'all' || targetDate === 'ALL') return true;
  if (!created_at) return false;

  const rawStr = String(created_at).trim();
  const datePart = rawStr.includes('T') ? rawStr.split('T')[0] : rawStr.split(' ')[0];

  if ((targetDate === 'range' || (startDate && endDate)) && startDate && endDate) {
    return datePart >= startDate && datePart <= endDate;
  }

  return datePart === targetDate;
}

// PUT /api/billing/invoices/:id — Edit Master Invoice details
router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invIdStr = String(id);
    const { customer_name, customer_phone, customer_address, bill_date, notes, total_amount, paid_amount, due_amount } = req.body;

    // Find master record
    const { data: billRow, error: fetchErr } = await supabase
      .from('customer_billing')
      .select('*')
      .or(`customer_billing_uuid.eq.${invIdStr},billing_id.eq.${invIdStr}`)
      .single();

    if (fetchErr || !billRow) {
      return res.status(404).json({ success: false, message: `Invoice #${id} not found` });
    }

    const updateFields: any = { updated_at: getNowISTISO() };
    if (customer_name !== undefined) updateFields.customer_name = customer_name;
    if (customer_phone !== undefined) updateFields.customer_phone = customer_phone;
    if (customer_address !== undefined) updateFields.customer_address = customer_address;
    if (bill_date !== undefined) updateFields.bill_date = bill_date;
    if (total_amount !== undefined) updateFields.total_amount = Number(total_amount);
    if (paid_amount !== undefined) updateFields.paid_amount = Number(paid_amount);
    if (due_amount !== undefined) updateFields.due_amount = Number(due_amount);

    const existingBillJson = billRow.bill_json || {};
    const updatedBillJson = {
      ...existingBillJson,
      customer_name: updateFields.customer_name || existingBillJson.customer_name,
      customer_phone: updateFields.customer_phone || existingBillJson.customer_phone,
      customer_address: updateFields.customer_address || existingBillJson.customer_address,
      bill_date: updateFields.bill_date || existingBillJson.bill_date,
    };
    updateFields.bill_json = updatedBillJson;

    const { data: updatedMaster, error: updateErr } = await supabase
      .from('customer_billing')
      .update(updateFields)
      .eq('customer_billing_uuid', billRow.customer_billing_uuid)
      .select('*')
      .single();

    if (updateErr) {
      return res.status(500).json({ success: false, message: updateErr.message });
    }

    // Sync changes to line items in billing_sell_buy_records
    await supabase
      .from('billing_sell_buy_records')
      .update({
        customer_name: updateFields.customer_name,
        bill_date: updateFields.bill_date,
        updated_at: getNowISTISO(),
      })
      .eq('customer_billing_uuid', billRow.customer_billing_uuid);

    // Sync to cash_transactions & cash_transaction_ledger
    if (updateFields.customer_name || updateFields.bill_date || updateFields.paid_amount !== undefined) {
      try {
        await supabase
          .from('cash_transactions')
          .update({
            notes: `Updated for ${updateFields.customer_name || billRow.customer_name} (${billRow.billing_id})`,
            created_at: updateFields.bill_date ? `${updateFields.bill_date}T12:00:00.000Z` : undefined,
          })
          .or(`transaction_id.eq.${billRow.billing_id},transaction_id.eq.${billRow.customer_billing_uuid}`);

        await supabase
          .from('cash_transaction_ledger')
          .update({
            notes: `Updated for ${updateFields.customer_name || billRow.customer_name} (${billRow.billing_id})`,
            created_at: updateFields.bill_date ? `${updateFields.bill_date}T12:00:00.000Z` : undefined,
          })
          .or(`transaction_id.eq.${billRow.billing_id},transaction_id.eq.${billRow.customer_billing_uuid},notes.ilike.%${billRow.billing_id}%`);
      } catch (e) {}
    }

    memoryCache.deletePattern('billing');
    memoryCache.deletePattern('accounts');

    res.json({
      success: true,
      message: `Invoice #${billRow.billing_id} updated successfully!`,
      invoice: updatedMaster,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update invoice' });
  }
});

// DELETE /api/billing/invoices/:id — Cascading Delete of Invoice
router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invIdStr = String(id);

    // 1. Fetch master record
    const { data: billRow, error: fetchErr } = await supabase
      .from('customer_billing')
      .select('*')
      .or(`customer_billing_uuid.eq.${invIdStr},billing_id.eq.${invIdStr}`)
      .single();

    if (fetchErr || !billRow) {
      return res.status(404).json({ success: false, message: `Invoice #${id} not found` });
    }

    const uuid = billRow.customer_billing_uuid;
    const bId = billRow.billing_id;

    // 2. Cascading Deletion across all related tables
    try {
      // Delete installments from billing_payment_history
      await supabase
        .from('billing_payment_history')
        .delete()
        .or(`customer_billing_uuid.eq.${uuid},notes.ilike.%${bId}%`);

      // 1. Fetch line items from billing_sell_buy_records before deletion to refund inventory stock
      const { data: sellRecordsToRefund } = await supabase
        .from('billing_sell_buy_records')
        .select('*')
        .or(`customer_billing_uuid.eq.${uuid},customer_billing_uuid.eq.${bId}`)
        .eq('transaction_type', 'SELL');

      if (sellRecordsToRefund && sellRecordsToRefund.length > 0) {
        try {
          const { recordInventoryMovement } = await import('../../utils/inventoryLedgerHelper');
          for (const sr of sellRecordsToRefund) {
            const isOrderMode = (sr.billing_mode || '').toUpperCase() === 'ORDER';
            const isSubmitted = (sr.is_item_submitted || 'no').toLowerCase() === 'yes';
            if ((!isOrderMode || isSubmitted) && Number(sr.item_weight) > 0) {
              const cleanMetal = (sr.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
              const { data: invMatches } = await supabase
                .from('inventory_products')
                .select('*')
                .eq('item_type', cleanMetal);

              const matched = (invMatches || []).find((p: any) => {
                const pName = (p.item_name || '').toLowerCase();
                const pCat = (p.category || '').toLowerCase();
                const target = (sr.item_name || '').toLowerCase();
                return pName === target || pCat === target || target.includes(pName) || pName.includes(target);
              });

              if (matched) {
                await recordInventoryMovement({
                  itemId: matched.id,
                  itemName: matched.item_name,
                  itemType: cleanMetal,
                  eventType: 'CUSTOMER_RETURN',
                  weightDeltaGrams: Number(sr.item_weight),
                  referenceId: bId,
                  referenceType: 'INVOICE',
                  notes: `Stock refunded (+${sr.item_weight}g) due to deleted invoice #${bId}`,
                });
              }
            }
          }
        } catch (refundErr) {
          console.warn('⚠️ Inventory refund on delete warning:', refundErr);
        }
      }

      // Delete line items from billing_sell_buy_records
      await supabase
        .from('billing_sell_buy_records')
        .delete()
        .or(`customer_billing_uuid.eq.${uuid},billing_id.eq.${bId}`);

      // Delete metal scrap/buy transactions
      await supabase
        .from('customer_metal_transactions')
        .delete()
        .or(`transaction_id.eq.${bId},transaction_id.eq.${uuid}`);

      // Delete cash drawer entries from cash_transactions & cash_transaction_ledger
      await supabase
        .from('cash_transactions')
        .delete()
        .or(`transaction_id.eq.${bId},transaction_id.eq.${uuid}`);

      await supabase
        .from('cash_transaction_ledger')
        .delete()
        .or(`transaction_id.eq.${bId},transaction_id.eq.${uuid},notes.ilike.%${bId}%`);

      // Delete inventory logs
      await supabase
        .from('inventory_stock_logs')
        .delete()
        .or(`transaction_id.eq.${bId},transaction_id.eq.${uuid}`);

      // If this was an ORDER bill, also clean orders table if matched
      if (billRow.bill_type === 'ORDER') {
        await supabase
          .from('orders')
          .delete()
          .or(`id.eq.${bId},id.eq.${uuid}`);
      }

      // Finally, delete the master customer_billing record
      await supabase
        .from('customer_billing')
        .delete()
        .eq('customer_billing_uuid', uuid);
    } catch (delErr) {
      console.warn('⚠️ Error during invoice cascading delete:', delErr);
    }

    memoryCache.deletePattern('billing');
    memoryCache.deletePattern('accounts');

    res.json({
      success: true,
      message: `Invoice #${bId} deleted permanently from all registers.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete invoice' });
  }
});

export default router;
