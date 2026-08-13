import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';

const router = Router();

// In-Memory fallback store initialized with realistic demo data
export interface OrderItem {
  id: string; // e.g. ORD-2026-1001
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  metal_type: 'GOLD' | 'SILVER';
  item_name: string;
  quantity_unit?: 'PIECES' | 'PAIRS' | 'GRAMS';
  quantity_value?: number;
  item_length_inches?: string | number;
  gross_weight_grams: number;
  net_weight_grams: number;
  touch_percentage: number; // e.g. 91.6
  fine_weight_grams: number;
  making_charges: number;
  estimated_delivery_date: string;
  notes: string;
  hmw_percentage?: number;
  hmw_weight?: number;
  additional_charge_name?: string;
  additional_charge_value?: number;
  return_purity_percentage?: number;
  return_pure_gold?: number;
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED';
  sold_status?: 'DUE' | 'SOLD';
  submitted?: 'yes' | 'no';
  paid_amount?: number;
  due_amount?: number;
  applied_rate_per_gram?: number;
  pure_metal_weight?: number;
  metal_value?: number;
  gst_amount?: number;
  final_amount?: number;
  receipt_json_data?: any;
  assigned_worker_id: string | null;
  assigned_worker_name: string | null;
  created_at: string;
}

export interface WorkerItem {
  id: string; // e.g. WRK-101
  name: string;
  phone: string;
  address?: string;
  specialization: string; // e.g. 'Gold Casting & Stone Setting'
  photo_url?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface WorkerTransactionItem {
  id: string; // e.g. TXN-5001
  worker_id: string;
  order_id?: string | null;
  direction: 'OUTGOING' | 'INCOMING'; // OUTGOING = Store sent to worker (Cash/Gold), INCOMING = Worker sent to store (Ornament/Gold)
  category: 'CASH' | 'GOLD' | 'ORNAMENT';
  amount_cash?: number;
  weight_grams?: number;
  touch_percentage?: number;
  fine_weight_grams?: number;
  item_name?: string;
  photos: string[]; // Multiple image URLs/base64
  notes: string;
  created_at: string;
}

// Initial state (Empty for production)
let mockOrders: OrderItem[] = [];
let mockWorkers: WorkerItem[] = [];
let mockTransactions: WorkerTransactionItem[] = [];

// Helper to generate IDs
const generateOrderId = () => `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

// Helper to generate unique Worker ID

// ── ORDERS ENDPOINTS ──

// GET /api/orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { data: dbOrders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && dbOrders && dbOrders.length > 0) {
      return res.json({ success: true, orders: dbOrders, total: dbOrders.length });
    }
  } catch (e) {
    // fallback to mock
  }

  res.json({
    success: true,
    orders: mockOrders,
    total: mockOrders.length,
  });
});

// POST /api/orders
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_address,
      metal_type,
      item_name,
      quantity_unit,
      quantity_value,
      item_length_inches,
      gross_weight_grams,
      net_weight_grams,
      touch_percentage,
      making_charges,
      estimated_delivery_date,
      notes,
      hmw_percentage,
      hmw_weight,
      additional_charge_name,
      additional_charge_value,
      return_purity_percentage,
      return_pure_gold,
      paid_amount,
      due_amount,
      applied_rate_per_gram,
      pure_metal_weight,
      metal_value,
      gst_amount,
      final_amount,
      receipt_json_data,
      submitted,
    } = req.body;

    const gross = Number(gross_weight_grams) || 0;
    const net = Number(net_weight_grams) || gross;
    const touch = Number(touch_percentage) || 91.6;
    const fine = Number(((net * touch) / 100).toFixed(3));
    const hmwPct = Number(hmw_percentage) || 0;
    const hmwW = Number(hmw_weight) || Number(((gross * hmwPct) / 100).toFixed(3));
    const retPurity = Number(return_purity_percentage) || 0;
    const retPureG = Number(return_pure_gold) || Number(((net * retPurity) / 100).toFixed(3));

    const newOrder: OrderItem = {
      id: generateOrderId(),
      customer_name: customer_name || 'Walk-in Customer',
      customer_phone: customer_phone || '',
      customer_address: customer_address || '',
      metal_type: (metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD',
      item_name: item_name || 'Custom Jewelry Order',
      quantity_unit: quantity_unit || 'PIECES',
      quantity_value: Number(quantity_value) || 1,
      item_length_inches: item_length_inches || '',
      gross_weight_grams: gross,
      net_weight_grams: net,
      touch_percentage: touch,
      fine_weight_grams: fine,
      making_charges: Number(making_charges) || 0,
      estimated_delivery_date: estimated_delivery_date || new Date().toISOString().split('T')[0],
      notes: notes || '',
      hmw_percentage: hmwPct,
      hmw_weight: hmwW,
      additional_charge_name: additional_charge_name || '',
      additional_charge_value: Number(additional_charge_value) || 0,
      return_purity_percentage: retPurity,
      return_pure_gold: retPureG,
      status: 'PENDING',
      submitted: submitted === 'yes' ? 'yes' : 'no',
      sold_status: (due_amount !== undefined && Number(due_amount) === 0) ? 'SOLD' : 'DUE',
      paid_amount: paid_amount !== undefined ? Number(paid_amount) : 0,
      due_amount: due_amount !== undefined ? Number(due_amount) : 0,
      applied_rate_per_gram: Number(applied_rate_per_gram) || 0,
      pure_metal_weight: Number(pure_metal_weight) || 0,
      metal_value: Number(metal_value) || 0,
      gst_amount: Number(gst_amount) || 0,
      final_amount: Number(final_amount) || 0,
      receipt_json_data: receipt_json_data || null,
      assigned_worker_id: null,
      assigned_worker_name: null,
      created_at: new Date().toISOString(),
    };

    // Strip fine_weight_grams because it is a GENERATED ALWAYS AS STORED column in PostgreSQL
    const { fine_weight_grams, ...dbPayload } = newOrder;

    try {
      const { data: dbOrder, error: dbErr } = await supabase.from('orders').insert([dbPayload]).select('*').single();
      if (!dbErr && dbOrder) {
        return res.json({ success: true, message: 'Order created & stored in database successfully!', order: dbOrder });
      } else if (dbErr) {
        console.error('❌ Supabase orders insert error:', dbErr.message, dbErr.details, dbErr.hint);
        return res.status(500).json({
          success: false,
          message: `Database Error (${dbErr.code || 'DB_ERR'}): ${dbErr.message}`,
          details: dbErr.details,
          hint: dbErr.hint,
        });
      }
    } catch (e: any) {
      console.error('Orders Supabase insert exception:', e);
      return res.status(500).json({
        success: false,
        message: `Database Exception: ${e.message || String(e)}`,
      });
    }

    mockOrders.unshift(newOrder);

    res.json({
      success: true,
      message: 'Order created successfully!',
      order: newOrder,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create order' });
  }
});

// PUT /api/orders/:id/assign
router.put('/orders/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { worker_id, worker_name } = req.body;

    let order = mockOrders.find((o) => o.id === id);

    const workerIdVal = worker_id || null;
    const workerNameVal = worker_name || null;
    const statusVal = workerIdVal ? 'ASSIGNED' : 'PENDING';
    const assignedAtVal = workerIdVal ? new Date().toISOString() : null;

    if (order) {
      order.assigned_worker_id = workerIdVal;
      order.assigned_worker_name = workerNameVal;
      order.status = statusVal;
      (order as any).assigned_at = assignedAtVal;
    }

    const { error: dbErr } = await supabase.from('orders').update({
      assigned_worker_id: workerIdVal,
      assigned_worker_name: workerNameVal,
      status: statusVal,
      assigned_at: assignedAtVal,
    }).eq('id', id);

    if (dbErr) {
      console.error('❌ Supabase Update Error (assign):', dbErr);
      return res.status(500).json({
        success: false,
        message: `Database error: ${dbErr.message}`,
        code: dbErr.code,
        details: dbErr.details,
        hint: dbErr.hint,
      });
    }

    res.json({
      success: true,
      message: worker_id ? `Order assigned to ${worker_name}` : 'Order status updated',
      order: order || { id, assigned_worker_id: workerIdVal, assigned_worker_name: workerNameVal, status: statusVal, assigned_at: assignedAtVal },
      assigned_at: assignedAtVal,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to assign order' });
  }
});


// PUT /api/orders/:id/return-status
router.put('/orders/:id/return-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { returned_from_worker, returned_at, return_purity_percentage, return_pure_gold } = req.body;

    const returnVal = returned_from_worker === 'yes' ? 'yes' : 'no';
    const returnAtVal = returnVal === 'yes' ? (returned_at || new Date().toISOString()) : null;

    let order = mockOrders.find((o) => o.id === id);
    if (order) {
      (order as any).returned_from_worker = returnVal;
      (order as any).returned_at = returnAtVal;
      if (return_purity_percentage !== undefined) order.return_purity_percentage = Number(return_purity_percentage);
      if (return_pure_gold !== undefined) order.return_pure_gold = Number(return_pure_gold);
    }

    try {
      const updateData: any = {
        returned_from_worker: returnVal,
        returned_at: returnAtVal,
      };
      if (return_purity_percentage !== undefined) updateData.return_purity_percentage = Number(return_purity_percentage);
      if (return_pure_gold !== undefined) updateData.return_pure_gold = Number(return_pure_gold);

      await supabase.from('orders').update(updateData).eq('id', id);
    } catch (e) {}

    res.json({
      success: true,
      message: returnVal === 'yes' ? 'Item marked as returned from worker' : 'Return status updated',
      returned_from_worker: returnVal,
      returned_at: returnAtVal,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update return status' });
  }
});

// PUT /api/orders/:id/sold-status
router.put('/orders/:id/sold-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sold_status, submitted, paid_now, remaining_due } = req.body;

    let order = mockOrders.find((o) => o.id === id);

    // If not found in mock, try querying from Supabase
    if (!order) {
      try {
        const { data: fetchDbOrder } = await supabase.from('orders').select('*').eq('id', id).single();
        if (fetchDbOrder) order = fetchDbOrder;
      } catch (e) {}
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const pNow = Number(paid_now) || 0;
    if (paid_now !== undefined) {
      order.paid_amount = (order.paid_amount || 0) + pNow;
    }
    if (remaining_due !== undefined) {
      order.due_amount = Math.max(0, Number(remaining_due));
    }

    const newSubmitted = submitted === 'yes' || order.due_amount === 0 ? 'yes' : (submitted || order.submitted || 'no');
    const newSoldStatus = (sold_status === 'SOLD' || newSubmitted === 'yes' || order.due_amount === 0) ? 'SOLD' : 'DUE';
    
    order.submitted = newSubmitted;
    order.sold_status = newSoldStatus;
    if (newSoldStatus === 'SOLD') {
      order.status = 'COMPLETED';
      order.due_amount = 0;
    }

    // Update receipt JSON blob to reflect latest paid_amount, due_amount & installment payment history
    const existingJSON = typeof order.receipt_json_data === 'string'
      ? JSON.parse(order.receipt_json_data)
      : (order.receipt_json_data || {});

    const historyList: any[] = Array.isArray(existingJSON.payment_history) ? [...existingJSON.payment_history] : [];
    
    const currentPaid = Number(order.paid_amount) || 0;
    const currentDue = Number(order.due_amount) || 0;
    const finalAmt = Number(order.final_amount) || (currentPaid + currentDue);

    // Seed initial advance payment if history is empty and order had previous paid amount
    if (historyList.length === 0 && currentPaid > 0) {
      const initialPaid = pNow > 0 ? Math.max(0, currentPaid - pNow) : currentPaid;
      const initialDue = Math.max(0, finalAmt - initialPaid);
      if (initialPaid > 0) {
        historyList.push({
          date: order.created_at || new Date().toISOString(),
          amount: initialPaid,
          due_after: initialDue,
          type: 'Advance Payment',
        });
      }
    }

    // Append new installment payment entry if paid_now > 0
    if (pNow > 0) {
      historyList.push({
        date: new Date().toISOString(),
        amount: pNow,
        due_after: order.due_amount,
        type: newSoldStatus === 'SOLD' ? 'Full Settlement' : 'Partial Installment',
      });
    }

    const updatedReceiptJSON = {
      ...existingJSON,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      transaction_type: 'ORDER',
      order_id: order.id,
      paymentType: order.due_amount === 0 ? 'FULL' : 'PARTIAL',
      advancePaidAmount: order.paid_amount,
      balanceDueAmount: order.due_amount,
      payment_history: historyList,
    };

    order.receipt_json_data = updatedReceiptJSON;

    let invoicePersisted = false;

    // 1. Always update Supabase orders table with latest paid_amount, due_amount, and receipt_json_data
    try {
      await supabase
        .from('orders')
        .update({
          submitted: newSubmitted,
          sold_status: newSoldStatus,
          status: order.status,
          paid_amount: order.paid_amount,
          due_amount: order.due_amount,
          receipt_json_data: updatedReceiptJSON,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    } catch (e) {
      console.warn('Supabase orders table update notice:', e);
    }

    // 2. When submitted === 'yes' or marked SOLD, also insert into billing_invoices!
    if (newSubmitted === 'yes' || newSoldStatus === 'SOLD') {
      const grossW = order.gross_weight_grams || 0;
      const netW = order.net_weight_grams || grossW;
      const mc = order.making_charges || 0;
      const totalVal = order.final_amount || order.paid_amount || 0;

      try {
        const { data: dbInvoice, error: dbErr } = await supabase
          .from('billing_invoices')
          .insert([{
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address,
            transaction_type: 'ORDER',
            metal_type: order.metal_type,
            product_name: `${order.item_name} (Order ${order.id})`,
            weight_grams: grossW,
            purity_percentage: order.touch_percentage,
            making_charges: mc,
            applied_rate_per_gram: order.applied_rate_per_gram || 0,
            pure_metal_weight: order.pure_metal_weight || order.fine_weight_grams || 0,
            metal_value: order.metal_value || 0,
            gst_amount: order.gst_amount || 0,
            final_amount: totalVal,
            paid_amount: order.paid_amount,
            due_amount: order.due_amount,
            receipt_json_data: updatedReceiptJSON,
            created_at: new Date().toISOString(),
          }])
          .select('*');

        if (!dbErr && dbInvoice) {
          invoicePersisted = true;
        }
      } catch (err) {
        console.warn('billing_invoices Supabase insertion notice:', err);
      }
    }

    res.json({
      success: true,
      message: newSoldStatus === 'SOLD' ? `Order ${order.id} marked as SOLD!` : `Payment recorded for Order ${order.id}`,
      order,
      invoicePersisted,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update sold status' });
  }
});

// ── WORKERS ENDPOINTS ──

// GET /api/workers
router.get('/workers', async (req: Request, res: Response) => {
  let workerList: WorkerItem[] = mockWorkers;

  try {
    const { data: dbWorkers, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    if (!error && dbWorkers && dbWorkers.length > 0) {
      const dbIds = new Set(dbWorkers.map((w: any) => w.id));
      workerList = [...dbWorkers, ...mockWorkers.filter((m) => !dbIds.has(m.id))];
    }
  } catch (e) {
    console.warn('Workers fetch from Supabase fallback:', e);
  }

  const enrichedWorkers = workerList.map((worker) => {
    const assignedOrders = mockOrders.filter((o) => o.assigned_worker_id === worker.id);
    const pendingOrders = assignedOrders.filter((o) => o.status !== 'COMPLETED');
    const completedOrders = assignedOrders.filter((o) => o.status === 'COMPLETED');

    return {
      ...worker,
      assigned_orders_count: assignedOrders.length,
      pending_orders_count: pendingOrders.length,
      completed_orders_count: completedOrders.length,
    };
  });

  res.json({
    success: true,
    workers: enrichedWorkers,
  });
});

// POST /api/workers
router.post('/workers', async (req: Request, res: Response) => {
  try {
    const { name, phone, address, specialization, photo_url, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Worker name is required' });
    }

    // Do NOT send id — Supabase trigger (auto_generate_worker_id) will generate WRKR-1, WRKR-2 etc.
    const insertPayload = {
      name: name.trim(),
      phone: phone || '',
      address: address || '',
      specialization: specialization?.trim() || 'Jewelry Goldsmith & Crafting',
      photo_url: photo_url || '',
      notes: notes || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    const { data: insertedRow, error: dbErr } = await supabase
      .from('workers')
      .insert([insertPayload])
      .select()
      .single();

    if (dbErr) {
      console.error('❌ Supabase Insert Error (workers):', dbErr);
      return res.status(500).json({
        success: false,
        message: `Database error: ${dbErr.message}`,
        code: dbErr.code,
        details: dbErr.details,
        hint: dbErr.hint,
      });
    }

    const newWorker: WorkerItem = insertedRow as WorkerItem;
    mockWorkers.unshift(newWorker);

    res.json({
      success: true,
      message: `Worker "${newWorker.name}" registered successfully with ID: ${newWorker.id}!`,
      worker: newWorker,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create worker' });
  }
});

// ── WORKER TRANSACTIONS ENDPOINTS (WhatsApp Chat Timeline) ──

// GET /api/worker-transactions?workerId=WRK-101
router.get('/worker-transactions', (req: Request, res: Response) => {
  const { workerId } = req.query;
  let txns = mockTransactions;

  if (workerId) {
    txns = txns.filter((t) => t.worker_id === String(workerId));
  }

  res.json({
    success: true,
    transactions: txns,
  });
});

// POST /api/worker-transactions
router.post('/worker-transactions', (req: Request, res: Response) => {
  try {
    const {
      worker_id,
      order_id,
      direction,
      category,
      amount_cash,
      weight_grams,
      touch_percentage,
      item_name,
      photos,
      notes,
    } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, message: 'Worker ID is required' });
    }

    const wt = Number(weight_grams) || 0;
    const touch = Number(touch_percentage) || 91.6;
    const fine = wt > 0 ? Number(((wt * touch) / 100).toFixed(3)) : 0;

    const newTxn: WorkerTransactionItem = {
      id: `TXN-${Date.now()}`,
      worker_id,
      order_id: order_id || null,
      direction: direction === 'INCOMING' ? 'INCOMING' : 'OUTGOING',
      category: category || 'GOLD',
      amount_cash: Number(amount_cash) || 0,
      weight_grams: wt,
      touch_percentage: touch,
      fine_weight_grams: fine,
      item_name: item_name || '',
      photos: Array.isArray(photos) ? photos : [],
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    mockTransactions.push(newTxn);

    res.json({
      success: true,
      message: 'Transaction recorded successfully!',
      transaction: newTxn,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record transaction' });
  }
});

export default router;
