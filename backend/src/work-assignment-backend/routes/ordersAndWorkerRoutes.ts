import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { supabase } from '../../config/supabase';
import { uploadToCloudinaryAsWebP, uploadToCloudinaryFile } from '../../utils/cloudinaryHelper';

const upload = multer({ storage: multer.memoryStorage() });

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
  image_url?: string;
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
  edited_at_history?: string[];
  is_deleted?: boolean;
  reply_to?: any;
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
      image_url,
    } = req.body;

    const gross = Number(gross_weight_grams) || 0;
    const net = Number(net_weight_grams) || gross;
    const touch = Number(touch_percentage) || 91.6;
    const fine = Number(((net * touch) / 100).toFixed(3));
    const hmwPct = Number(hmw_percentage) || 0;
    const hmwW = Number(hmw_weight) || Number(((gross * hmwPct) / 100).toFixed(3));
    const retPurity = Number(return_purity_percentage) || 0;
    const retPureG = Number(return_pure_gold) || Number(((net * retPurity) / 100).toFixed(3));

    const finalImageUrl = image_url || receipt_json_data?.image_url || receipt_json_data?.items?.[0]?.image_url || '';

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
      image_url: finalImageUrl,
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
        if (dbErr.code === 'PGRST204' || dbErr.message?.includes('image_url')) {
          // If image_url column doesn't exist yet in Supabase table schema, fallback gracefully
          const { image_url: _, ...fallbackPayload } = dbPayload;
          const { data: retryData, error: retryErr } = await supabase.from('orders').insert([fallbackPayload]).select('*').single();
          if (!retryErr && retryData) {
            return res.json({ success: true, message: 'Order created & stored in database successfully!', order: { ...retryData, image_url: finalImageUrl } });
          }
        }
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

// PUT /api/workers/:id
router.put('/workers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, specialization, photo_url, notes } = req.body;

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (specialization !== undefined) updatePayload.specialization = specialization.trim();
    if (photo_url !== undefined) {
      if (photo_url && photo_url.startsWith('data:image/')) {
        updatePayload.photo_url = await uploadToCloudinaryAsWebP(photo_url, 'jewellery_product_images');
      } else {
        updatePayload.photo_url = photo_url;
      }
    }
    if (notes !== undefined) updatePayload.notes = notes.trim();

    const { data: updatedRow, error: dbErr } = await supabase
      .from('workers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (dbErr) {
      console.error('❌ Supabase Update Error (workers):', dbErr);
      return res.status(500).json({
        success: false,
        message: `Database update error: ${dbErr.message}`,
        details: dbErr,
      });
    }

    const idx = mockWorkers.findIndex((w) => w.id === id);
    if (idx !== -1) {
      mockWorkers[idx] = { ...mockWorkers[idx], ...updatedRow };
    }

    res.json({
      success: true,
      message: 'Worker profile updated successfully!',
      worker: updatedRow || { id, ...updatePayload },
    });
  } catch (err: any) {
    console.error('❌ PUT /workers/:id Exception:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update worker profile' });
  }
});

// ── WORKER TRANSACTIONS ENDPOINTS (WhatsApp Chat Ledger) ──

const txFilePath = path.join(__dirname, '../../../../data/worker_transactions.json');

const ensureTxFileExists = () => {
  try {
    const dir = path.dirname(txFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(txFilePath)) fs.writeFileSync(txFilePath, JSON.stringify([], null, 2));
  } catch (e) {
    console.error('Failed to create tx data directory:', e);
  }
};

const getLocalTransactions = (): WorkerTransactionItem[] => {
  try {
    ensureTxFileExists();
    const raw = fs.readFileSync(txFilePath, 'utf8');
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
};

const saveLocalTransaction = (txn: WorkerTransactionItem) => {
  try {
    ensureTxFileExists();
    const local = getLocalTransactions();
    local.push(txn);
    fs.writeFileSync(txFilePath, JSON.stringify(local, null, 2));
  } catch (e) {
    console.error('Failed to save transaction to local JSON disk file:', e);
  }
};

// ── SERVER-SENT EVENTS (SSE) REALTIME STREAM MANAGER ──
const sseClientsMap = new Map<string, Set<Response>>();

const broadcastToWorker = (workerId: string, eventType: string, payload: any) => {
  const clients = sseClientsMap.get(String(workerId));
  if (clients && clients.size > 0) {
    const dataStr = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach((res) => {
      try {
        res.write(dataStr);
      } catch (err) {
        clients.delete(res);
      }
    });
  }
};

/**
 * GET /api/work-assignment/worker-transactions/stream?workerId=WRKR-1
 * Subscribes to real-time chat SSE stream for workerId (< 10ms live push)
 */
router.get('/worker-transactions/stream', (req: Request, res: Response) => {
  const { workerId } = req.query;
  if (!workerId) {
    return res.status(400).json({ success: false, message: 'workerId is required for live stream' });
  }

  const cleanWorkerId = String(workerId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(': ping\n\n');

  if (!sseClientsMap.has(cleanWorkerId)) {
    sseClientsMap.set(cleanWorkerId, new Set());
  }
  sseClientsMap.get(cleanWorkerId)!.add(res);

  req.on('close', () => {
    const clients = sseClientsMap.get(cleanWorkerId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClientsMap.delete(cleanWorkerId);
      }
    }
  });
});

// GET /api/worker-transactions?workerId=WRK-101&days=7&beforeDate=...&search=...
router.get('/worker-transactions', async (req: Request, res: Response) => {
  const { workerId, days, beforeDate, search, fullHistory } = req.query;

  try {
    let query = supabase.from('worker_transactions').select('*').order('created_at', { ascending: true });

    if (workerId) {
      query = query.eq('worker_id', String(workerId));
    }

    const { data: dbTxns, error: dbErr } = await query;

    if (!dbErr && dbTxns) {
      // Merge local disk transactions so newly sent messages never flicker or disappear
      const localTxns = getLocalTransactions();
      const map = new Map<string, any>();
      if (Array.isArray(dbTxns)) {
        dbTxns.forEach((t: any) => map.set(t.id, t));
      }
      localTxns.forEach((t: any) => {
        if (workerId && String(t.worker_id) !== String(workerId)) return;
        if (!map.has(t.id)) {
          map.set(t.id, t);
        }
      });
      let combinedTxns = Array.from(map.values());
      combinedTxns.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      let filtered = combinedTxns;

      // 🔍 SEARCH MODE: Search 100% full database history across all fields
      if (search && String(search).trim() !== '') {
        const q = String(search).toLowerCase().trim();
        filtered = filtered.filter((t: any) => {
          const item = (t.item_name || '').toLowerCase();
          const notes = (t.notes || '').toLowerCase();
          const category = (t.category || '').toLowerCase();
          const amount = String(t.amount_cash || '');
          const weight = String(t.weight_grams || '');
          const touch = String(t.touch_percentage || '');
          return item.includes(q) || notes.includes(q) || category.includes(q) || amount.includes(q) || weight.includes(q) || touch.includes(q);
        });
        return res.json({
          success: true,
          transactions: filtered,
          total_count: filtered.length,
          search_active: true,
          source: 'supabase_database',
        });
      }

      // 📅 DATE & PAGINATION MODE (7 Days Initial Load / Scroll Pagination)
      if (fullHistory === 'true' || fullHistory === '1') {
        // Return full history without date cutoff
      } else {
        const cutoffDate = beforeDate ? new Date(String(beforeDate)) : new Date();
        const daysCount = Number(days) || 7;
        const startDate = new Date(cutoffDate.getTime() - daysCount * 24 * 60 * 60 * 1000);

        if (beforeDate) {
          filtered = filtered.filter((t: any) => new Date(t.created_at) < cutoffDate);
        } else {
          filtered = filtered.filter((t: any) => new Date(t.created_at) >= startDate);
        }
      }

      return res.json({
        success: true,
        transactions: filtered,
        source: 'supabase_database',
      });
    }

    if (dbErr) {
      console.warn('⚠️ Supabase GET worker_transactions error (using persistent fallback):', dbErr.message);
    }
  } catch (err: any) {
    console.warn('⚠️ Supabase worker_transactions fetch exception:', err);
  }

  // 2. Persistent Disk Fallback + Mock
  let combined = [...getLocalTransactions(), ...mockTransactions];
  const seen = new Set();
  combined = combined.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  if (workerId) {
    combined = combined.filter((t) => t.worker_id === String(workerId));
  }

  if (search && String(search).trim() !== '') {
    const q = String(search).toLowerCase().trim();
    combined = combined.filter((t: any) => {
      const item = (t.item_name || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      const category = (t.category || '').toLowerCase();
      const amount = String(t.amount_cash || '');
      const weight = String(t.weight_grams || '');
      const touch = String(t.touch_percentage || '');
      return item.includes(q) || notes.includes(q) || category.includes(q) || amount.includes(q) || weight.includes(q) || touch.includes(q);
    });
  } else if (fullHistory !== 'true' && fullHistory !== '1') {
    const cutoffDate = beforeDate ? new Date(String(beforeDate)) : new Date();
    const daysCount = Number(days) || 7;
    const startDate = new Date(cutoffDate.getTime() - daysCount * 24 * 60 * 60 * 1000);

    if (beforeDate) {
      combined = combined.filter((t: any) => new Date(t.created_at) < cutoffDate);
    } else {
      combined = combined.filter((t: any) => new Date(t.created_at) >= startDate);
    }
  }

  const formattedCombined = combined.map((t: any) => ({
    ...t,
    status_state: t.status_state || (t.read_at ? 'READ' : 'DELIVERED'),
  }));

  res.json({
    success: true,
    transactions: formattedCombined,
    source: 'local_disk_fallback',
  });
});

/**
 * PUT /api/work-assignment/worker-transactions/mark-read
 * Marks messages for worker_id as READ & is_seen = 'YES' (Double Sky-Blue Ticks)
 * Supports direction filter ('INCOMING' for Admin reading, 'OUTGOING' for Worker reading)
 * EXCLUDES 'FAILED' messages.
 */
router.put('/worker-transactions/mark-read', async (req: Request, res: Response) => {
  try {
    const { worker_id, direction } = req.body;
    if (!worker_id) {
      return res.status(400).json({ success: false, message: 'worker_id is required to mark messages as read' });
    }

    const nowIso = new Date().toISOString();
    const targetDirection = direction ? String(direction).toUpperCase() : null;

    // 1. Update Supabase PostgreSQL
    try {
      let query = supabase
        .from('worker_transactions')
        .update({ status_state: 'READ', is_seen: 'YES', read_at: nowIso, seen_at: nowIso })
        .eq('worker_id', String(worker_id))
        .neq('status_state', 'FAILED');

      if (targetDirection) {
        query = query.eq('direction', targetDirection);
      }

      await query;
    } catch (err) {
      console.warn('Supabase mark-read exception:', err);
    }

    // 2. Update Local Disk fallback
    const local = getLocalTransactions();
    let updatedCount = 0;
    const updatedLocal = local.map((tx: any) => {
      const matchWorker = String(tx.worker_id) === String(worker_id);
      const matchDirection = targetDirection ? tx.direction === targetDirection : true;
      const isNotFailed = tx.status_state !== 'FAILED';
      const isNotYetSeen = !tx.read_at || tx.status_state !== 'READ' || tx.is_seen !== 'YES';

      if (matchWorker && matchDirection && isNotFailed && isNotYetSeen) {
        updatedCount++;
        return {
          ...tx,
          status_state: 'READ',
          is_seen: 'YES',
          read_at: nowIso,
          seen_at: nowIso,
        };
      }
      return tx;
    });

    if (updatedCount > 0) {
      ensureTxFileExists();
      fs.writeFileSync(txFilePath, JSON.stringify(updatedLocal, null, 2));
    }

    // 3. Update mockTransactions array in memory ONLY for this specific worker_id
    mockTransactions.forEach((tx: any) => {
      const matchWorker = String(tx.worker_id) === String(worker_id);
      const matchDirection = targetDirection ? tx.direction === targetDirection : true;
      const isNotFailed = tx.status_state !== 'FAILED';
      if (matchWorker && matchDirection && isNotFailed) {
        tx.status_state = 'READ';
        tx.is_seen = 'YES';
        tx.read_at = tx.read_at || nowIso;
        tx.seen_at = tx.seen_at || nowIso;
      }
    });

    // 4. Broadcast SSE live stream event for instant sky-blue ticks (< 10ms)
    broadcastToWorker(String(worker_id), 'MARK_READ', {
      worker_id: String(worker_id),
      direction: targetDirection,
      read_at: nowIso,
      seen_at: nowIso,
    });

    res.json({
      success: true,
      message: `Marked ${updatedCount} transactions as READ / SEEN for worker ${worker_id}`,
      worker_id: String(worker_id),
      read_at: nowIso,
      seen_at: nowIso,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/worker-transactions (Supports both JSON & FormData Binary WebP Uploads)
router.post('/worker-transactions', upload.array('files'), async (req: Request, res: Response) => {
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
      cash_metal_link,
      applied_rate_per_gram,
      photos,
      notes,
    } = req.body;

    if (!worker_id) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: Worker ID is required to record transaction',
      });
    }

    const wt = Number(weight_grams) || 0;
    const touch = Number(touch_percentage) || 91.6;
    const fine = wt > 0 ? Number(((wt * touch) / 100).toFixed(3)) : 0;

    const cashAmt = Number(amount_cash) || 0;
    const ratePerGram = Number(applied_rate_per_gram) || 0;
    const eqGrams = (category === 'CASH' && cashAmt > 0 && ratePerGram > 0)
      ? Number((cashAmt / ratePerGram).toFixed(3))
      : 0;

    const uploadedPhotos: string[] = [];

    // 1. Process binary files uploaded via FormData (Pure Binary WebP)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const f of req.files as Express.Multer.File[]) {
        try {
          const cUrl = await uploadToCloudinaryFile(f.buffer, f.originalname, 'jewellery_product_images');
          uploadedPhotos.push(cUrl);
        } catch (e) {
          console.error('Failed binary WebP upload to Cloudinary:', e);
        }
      }
    }

    // 2. Process any JSON base64 string photos if passed
    if (photos) {
      const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
      if (Array.isArray(parsedPhotos)) {
        for (const p of parsedPhotos) {
          if (typeof p === 'string' && p.startsWith('data:image/')) {
            const cUrl = await uploadToCloudinaryAsWebP(p, 'jewellery_product_images');
            uploadedPhotos.push(cUrl);
          } else if (typeof p === 'string' && p.startsWith('http')) {
            uploadedPhotos.push(p);
          }
        }
      }
    }

    const newTxn: any = {
      id: `TXN-${Date.now()}`,
      worker_id,
      order_id: order_id || null,
      direction: direction === 'INCOMING' ? 'INCOMING' : 'OUTGOING',
      category: category || 'GOLD',
      amount_cash: cashAmt,
      weight_grams: wt,
      touch_percentage: touch,
      fine_weight_grams: fine,
      item_name: item_name || '',
      cash_metal_link: cash_metal_link || (category === 'CASH' ? 'FOR_GOLD' : null),
      applied_rate_per_gram: ratePerGram,
      equivalent_metal_grams: eqGrams,
      photos: uploadedPhotos,
      notes: notes || '',
      status_state: 'DELIVERED',
      is_seen: 'NO',
      read_at: null,
      seen_at: null,
      created_at: new Date().toISOString(),
    };

    // 1. ALWAYS persist to local disk file so chat is NEVER lost regardless of database status
    saveLocalTransaction(newTxn);
    mockTransactions.push(newTxn);

    // 2. Try inserting into Supabase Database
    let finalInserted: any = newTxn;
    let { data: insertedDb, error: dbErr } = await supabase
      .from('worker_transactions')
      .insert([newTxn])
      .select()
      .single();

    if (!dbErr && insertedDb) {
      finalInserted = insertedDb;
    } else if (dbErr) {
      console.warn('⚠️ Primary Supabase insert notice:', dbErr.message);
      // Fallback: Retry with standard schema payload if extra cash columns don't exist in Supabase table yet
      const baseDbPayload = {
        id: newTxn.id,
        worker_id: newTxn.worker_id,
        order_id: newTxn.order_id,
        direction: newTxn.direction,
        category: newTxn.category,
        amount_cash: newTxn.amount_cash,
        weight_grams: newTxn.weight_grams,
        touch_percentage: newTxn.touch_percentage,
        fine_weight_grams: newTxn.fine_weight_grams,
        item_name: newTxn.item_name,
        photos: newTxn.photos,
        notes: newTxn.notes,
        created_at: newTxn.created_at,
      };

      const { data: retryDb, error: retryErr } = await supabase
        .from('worker_transactions')
        .insert([baseDbPayload])
        .select()
        .single();

      if (!retryErr && retryDb) {
        finalInserted = { ...retryDb, ...newTxn };
        dbErr = null; // Suppress warning because fallback insert succeeded!
      }
    }

    // Trigger FCM Event-Driven Push Webhook on transaction submission
    try {
      const { triggerFcmPushNotification } = require('../../routes/workerAuthRoutes');
      if (newTxn.worker_id) {
        const notifTitle = newTxn.direction === 'OUTGOING' ? 'Jaya Bhavani Admin' : `Worker Update (${newTxn.worker_id})`;
        const notifBody = newTxn.notes || (newTxn.item_name ? `Item: ${newTxn.item_name}` : `New transaction recorded (${newTxn.category})`);
        console.log(`📡 [FCM Event Trigger] Dispatching notification to ${newTxn.worker_id}: "${notifTitle} - ${notifBody}"`);
        triggerFcmPushNotification(newTxn.worker_id, notifTitle, notifBody, {
          transaction_id: finalInserted.id,
          direction: newTxn.direction,
          category: newTxn.category,
        });
      }
    } catch (fcmErr: any) {
      console.warn('⚠️ FCM Webhook trigger notice:', fcmErr.message);
    }

    // Broadcast instant Server-Sent Event (SSE) live stream to all connected screens in < 10ms
    if (newTxn.worker_id) {
      broadcastToWorker(newTxn.worker_id, 'NEW_TRANSACTION', finalInserted);
    }

    res.json({
      success: true,
      message: 'Transaction recorded and saved to database successfully!',
      transaction: finalInserted,
    });
  } catch (err: any) {
    console.error('❌ POST /api/worker-transactions Exception:', err);
    res.status(500).json({
      success: false,
      message: `Backend Execution Error: ${err.message || 'Failed to record transaction'}`,
      error_details: err.stack,
    });
  }
});

// PUT /api/worker-transactions/:id (Edit message notes & track edit timestamps array)
router.put('/worker-transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ success: false, message: 'Notes field is required for editing' });
    }

    const editTimestamp = new Date().toISOString();

    // 1. Update local disk file backup
    try {
      const local = getLocalTransactions();
      const idx = local.findIndex((t: any) => t.id === id);
      if (idx !== -1) {
        const history = Array.isArray(local[idx].edited_at_history) ? local[idx].edited_at_history : [];
        history.push(editTimestamp);
        local[idx].notes = notes;
        local[idx].edited_at_history = history;
        fs.writeFileSync(txFilePath, JSON.stringify(local, null, 2));
      }
    } catch (e) {
      console.warn('Failed to update local JSON file for edit:', e);
    }

    // 2. Update in-memory mock
    const mockIdx = mockTransactions.findIndex((t: any) => t.id === id);
    let currentHistory: string[] = [];
    if (mockIdx !== -1) {
      currentHistory = Array.isArray(mockTransactions[mockIdx].edited_at_history) ? mockTransactions[mockIdx].edited_at_history : [];
      currentHistory.push(editTimestamp);
      mockTransactions[mockIdx].notes = notes;
      mockTransactions[mockIdx].edited_at_history = currentHistory;
    } else {
      currentHistory = [editTimestamp];
    }

    // 3. Update in Supabase
    try {
      await supabase
        .from('worker_transactions')
        .update({ notes, edited_at_history: currentHistory })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase update worker_transactions warning:', dbErr);
    }

    res.json({
      success: true,
      message: 'Message edited successfully',
      transaction_id: id,
      notes,
      edited_at_history: currentHistory,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to edit transaction' });
  }
});

// DELETE /api/worker-transactions/:id (Soft-delete transaction)
router.delete('/worker-transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Update local disk file backup
    try {
      const local = getLocalTransactions();
      const idx = local.findIndex((t: any) => t.id === id);
      if (idx !== -1) {
        local[idx].is_deleted = true;
        fs.writeFileSync(txFilePath, JSON.stringify(local, null, 2));
      }
    } catch (e) {
      console.warn('Failed to update local JSON file for delete:', e);
    }

    // 2. Update mock array
    const mockIdx = mockTransactions.findIndex((t: any) => t.id === id);
    if (mockIdx !== -1) {
      mockTransactions[mockIdx].is_deleted = true;
    }

    // 3. Update Supabase
    try {
      await supabase
        .from('worker_transactions')
        .update({ is_deleted: true })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase delete worker_transactions warning:', dbErr);
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
      transaction_id: id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete transaction' });
  }
});

// ── USER SETTINGS ENDPOINTS (Message Preview Toggle Preference) ──

const settingsFilePath = path.join(__dirname, '../../../../data/user_settings.json');

const getLocalSettings = () => {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(settingsFilePath)) {
      const defaultSettings = { message_preview_enabled: true, image_preview_enabled: true };
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    const raw = fs.readFileSync(settingsFilePath, 'utf8');
    return JSON.parse(raw) || { message_preview_enabled: true, image_preview_enabled: true };
  } catch (e) {
    return { message_preview_enabled: true, image_preview_enabled: true };
  }
};

const saveLocalSettings = (settings: Record<string, any>) => {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = getLocalSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(settingsFilePath, JSON.stringify(updated, null, 2));
    return updated;
  } catch (e) {
    console.error('Failed to save user settings to disk:', e);
    return settings;
  }
};

// GET /api/user-settings
router.get('/user-settings', async (_req: Request, res: Response) => {
  try {
    const { data: dbSettings, error } = await supabase.from('user_settings').select('*').limit(1);
    if (!error && dbSettings && dbSettings.length > 0) {
      return res.json({
        success: true,
        settings: dbSettings[0],
        source: 'supabase_database',
      });
    }
  } catch (err) {
    console.warn('⚠️ Supabase user_settings fetch warning:', err);
  }

  const local = getLocalSettings();
  res.json({
    success: true,
    settings: local,
    source: 'local_disk_fallback',
  });
});

// POST /api/user-settings
router.post('/user-settings', async (req: Request, res: Response) => {
  try {
    const updatedSettings = saveLocalSettings(req.body);

    // Try persisting to Supabase if table exists
    try {
      await supabase.from('user_settings').upsert({ id: 'DEFAULT_USER', ...updatedSettings });
    } catch (e) {
      console.warn('Supabase user_settings upsert fallback:', e);
    }

    res.json({
      success: true,
      message: 'User settings updated successfully!',
      settings: updatedSettings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update user settings' });
  }
});

export default router;
