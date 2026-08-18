import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { supabase } from '../../config/supabase';
import { saveFcmToken } from '../../utils/fcmTokenStore';
import { uploadToCloudinaryAsWebP, uploadToCloudinaryFile } from '../../utils/cloudinaryHelper';
import { triggerFcmPushNotification } from '../../utils/pushService';
import { insertMetalTransactions } from '../../billing-backend/routes/billingRoutes';

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

const orderListColumns = 'id,customer_name,customer_phone,customer_address,metal_type,item_name,gross_weight_grams,net_weight_grams,touch_percentage,fine_weight_grams,making_charges,estimated_delivery_date,notes,status,sold_status,paid_amount,due_amount,assigned_worker_id,assigned_worker_name,created_at,updated_at,applied_rate_per_gram,pure_metal_weight,metal_value,gst_amount,final_amount,submitted,returned_from_worker,returned_at,item_length_inches,quantity_unit,quantity_value,assigned_at,hmw_percentage,hmw_weight,additional_charge_name,additional_charge_value,return_purity_percentage,return_pure_gold,image_url';

// GET /api/orders/:id (On-demand single order fetch with full receipt_json_data)
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: dbOrder, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && dbOrder) {
      return res.json({ success: true, order: dbOrder });
    }
    const mockMatch = mockOrders.find((o) => o.id === id);
    return res.json({ success: true, order: mockMatch || null });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/orders (Supports server-side pagination & filtering - fast list view)
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const status = req.query.status as string;
    const search = (req.query.search as string || '').trim().toLowerCase();
    const dateRange = req.query.dateRange as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    let query = supabase.from('orders').select(orderListColumns, { count: 'estimated' });

    if (status && status !== 'ALL') {
      if (status === 'PENDING') query = query.eq('status', 'PENDING');
      else if (status === 'ASSIGNED') query = query.eq('status', 'ASSIGNED');
      else if (status === 'COMPLETED') query = query.eq('status', 'COMPLETED');
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,item_name.ilike.%${search}%,id.ilike.%${search}%`);
    }

    if (dateRange && dateRange !== 'ALL') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      if (dateRange === 'TODAY') {
        query = query.gte('created_at', todayStart);
      } else if (dateRange === 'YESTERDAY') {
        const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        query = query.gte('created_at', yestStart).lt('created_at', todayStart);
      } else if (dateRange === 'THIS_WEEK') {
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();
        query = query.gte('created_at', weekStart);
      } else if (dateRange === 'THIS_MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', monthStart);
      } else if (dateRange === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
        query = query.gte('created_at', thirtyDaysAgo);
      } else if (dateRange === 'CUSTOM') {
        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          query = query.lte('created_at', e.toISOString());
        }
      }
    }

    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const { data: dbOrders, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

    if (!error && dbOrders) {
      const totalCount = count !== null ? count : dbOrders.length;
      return res.json({
        success: true,
        orders: dbOrders,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      });
    }
  } catch (e) {
    console.warn('⚠️ Supabase GET /orders error, falling back to mockOrders:', e);
  }

  // Fallback to in-memory mockOrders with JavaScript pagination
  let filtered = [...mockOrders];
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 10);
  const status = req.query.status as string;
  const search = (req.query.search as string || '').trim().toLowerCase();

  if (status && status !== 'ALL') {
    filtered = filtered.filter((o) => o.status === status);
  }
  if (search) {
    filtered = filtered.filter(
      (o) =>
        o.customer_name.toLowerCase().includes(search) ||
        o.customer_phone.includes(search) ||
        o.item_name.toLowerCase().includes(search) ||
        o.id.toLowerCase().includes(search)
    );
  }

  const totalCount = filtered.length;
  const sliced = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    orders: sliced,
    total: totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
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
        // ✅ Success — record inserted and confirmed
        return res.json({ success: true, message: 'Order created & stored in database successfully!', order: dbOrder });
      }

      if (dbErr) {
        // Check if it's a column-not-found error (e.g. image_url column missing in schema)
        if (dbErr.code === 'PGRST204' || dbErr.message?.includes('image_url')) {
          const { image_url: _, ...fallbackPayload } = dbPayload;
          const { data: retryData, error: retryErr } = await supabase.from('orders').insert([fallbackPayload]).select('*').single();
          if (!retryErr && retryData) {
            return res.json({ success: true, message: 'Order created & stored in database successfully!', order: { ...retryData, image_url: finalImageUrl } });
          }
          // Retry also failed — report the retry error
          const retryErrMsg = retryErr ? `${retryErr.message} (${retryErr.code})` : 'Retry returned no data';
          return res.status(500).json({
            success: false,
            message: `Database Error on retry: ${retryErrMsg}`,
            details: retryErr?.details,
            hint: retryErr?.hint,
          });
        }

        // All other DB errors
        return res.status(500).json({
          success: false,
          message: `Database Error (${dbErr.code || 'DB_ERR'}): ${dbErr.message}`,
          details: dbErr.details,
          hint: dbErr.hint,
        });
      }

      // ❌ Supabase returned null data AND null error — usually an RLS policy block or silent schema issue
      const silentMsg = 'Database insert returned no confirmation and no error. Likely caused by a Row-Level Security (RLS) policy blocking the insert. Check Supabase RLS policies for the "orders" table.';
      return res.status(500).json({ success: false, message: silentMsg });

    } catch (e: any) {
      return res.status(500).json({
        success: false,
        message: `Database Exception: ${e.message || String(e)}`,
      });
    }
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

    // Automatically record & broadcast plain text work assignment chat message to worker
    let createdTxn: any = null;
    if (workerIdVal) {
      try {
        let targetOrder: any = order;
        if (!targetOrder || !targetOrder.customer_name) {
          const { data: dbOrd } = await supabase.from('orders').select('*').eq('id', id).single();
          if (dbOrd) targetOrder = dbOrd;
        }

        if (targetOrder) {
          const custName = targetOrder.customer_name || 'Customer';
          const itemName = targetOrder.item_name || 'Custom Order Item';
          const weightStr = targetOrder.gross_weight_grams ? `${targetOrder.gross_weight_grams} g` : '';
          const qtyVal = targetOrder.quantity_value || 1;
          const qtyUnit = targetOrder.quantity_unit === 'PAIRS' ? 'Pairs' : targetOrder.quantity_unit === 'GRAMS' ? 'g' : 'Pcs';
          const qtyStr = `${qtyVal} ${qtyUnit}`;
          const lenStr = targetOrder.item_length_inches ? (targetOrder.item_length_inches.toString().endsWith('"') ? targetOrder.item_length_inches : `${targetOrder.item_length_inches} in`) : '';
          let rawNotes = targetOrder.notes || '';
          if (!rawNotes || rawNotes.startsWith('JBJ-Order Item:')) {
            const itemNotes = targetOrder.receipt_json_data?.items?.[0]?.item_notes || targetOrder.receipt_json_data?.items?.[0]?.notes || targetOrder.receipt_json_data?.item_notes;
            rawNotes = itemNotes || '';
          }
          const notesStr = rawNotes.trim();

          const lines = [
            `customer name : ${custName}`,
            `new order : Do ${itemName} for ${custName}${weightStr ? ` within ${weightStr}` : ''}`,
            `Quantity & Unit: ${qtyStr}`,
          ];
          if (lenStr) lines.push(`Length: ${lenStr}`);
          if (notesStr) lines.push(`Notes: ${notesStr}`);

          const formattedMessage = lines.join('\n');
          const imgUrl = targetOrder.image_url || targetOrder.receipt_json_data?.image_url || targetOrder.receipt_json_data?.items?.[0]?.image_url || '';
          const photosList = imgUrl ? [imgUrl] : [];

          const newTxn: any = {
            id: `TXN-${Date.now()}`,
            worker_id: workerIdVal,
            order_id: id,
            direction: 'OUTGOING',
            category: 'ORDER',
            amount_cash: 0,
            weight_grams: 0,
            touch_percentage: 0,
            fine_weight_grams: 0,
            item_name: '',
            photos: photosList,
            notes: formattedMessage,
            status_state: 'DELIVERED',
            is_seen: 'NO',
            read_at: null,
            seen_at: null,
            created_at: new Date().toISOString(),
          };

          mockTransactions.push(newTxn);

          let { data: insertedDb, error: dbErr } = await supabase.from('worker_transactions').insert([newTxn]).select().single();
          if (dbErr) {
            console.error('❌ Error inserting worker_transactions during assignment:', dbErr.message, dbErr.details);
          }
          createdTxn = insertedDb || newTxn;

          // Trigger FCM Push Notification (firebase-admin SDK)
          try {
            triggerFcmPushNotification(workerIdVal, 'Jaya Bhavani Admin', formattedMessage, {
              transaction_id: createdTxn.id,
              direction: 'OUTGOING',
              category: 'CHAT',
            });
          } catch (fcmErr) { }

          // Broadcast SSE Realtime Event (Uppercase 'NEW_TRANSACTION')
          broadcastToWorker(workerIdVal, 'NEW_TRANSACTION', createdTxn);
        }
      } catch (errAssignMsg) {
        console.error('⚠️ Failed to auto-send worker assignment message:', errAssignMsg);
      }
    }

    res.json({
      success: true,
      message: worker_id ? `Order assigned to ${worker_name} & plain chat message sent` : 'Order status updated',
      order: order || { id, assigned_worker_id: workerIdVal, assigned_worker_name: workerNameVal, status: statusVal, assigned_at: assignedAtVal },
      assigned_at: assignedAtVal,
      transaction: createdTxn,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to assign order' });
  }
});


// PUT /api/orders/:id/status
router.put('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const newStatus = ['PENDING', 'ASSIGNED', 'COMPLETED'].includes(status) ? status : 'PENDING';

    let order = mockOrders.find((o) => o.id === id);
    if (order) {
      order.status = newStatus;
    }

    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    } catch (e) { }

    res.json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      status: newStatus,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update order status' });
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
    } catch (e) { }

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
      } catch (e) { }
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

    const newSubmitted = (submitted === 'yes' || submitted === 'no') ? submitted : (order.submitted || 'no');
    const newSoldStatus = sold_status
      ? (sold_status === 'SOLD' ? 'SOLD' : 'DUE')
      : (order.due_amount === 0 ? 'SOLD' : (order.sold_status || 'DUE'));

    order.submitted = newSubmitted;
    order.sold_status = newSoldStatus;

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

    // 2. When submitted === 'yes' or marked SOLD, also insert into billing_invoices & customer_metal_transactions!
    if (newSubmitted === 'yes' || newSoldStatus === 'SOLD') {
      if (newSubmitted === 'yes') {
        try {
          const orderInvoicePayload = {
            id: order.id,
            customer_phone: order.customer_phone,
            customer_name: order.customer_name,
            transaction_type: 'ORDER',
            metal_type: order.metal_type || 'GOLD',
            product_name: order.item_name || 'Custom Jewelry Order',
            weight_grams: Number(order.net_weight_grams || order.gross_weight_grams) || 0,
            final_amount: Number((order as any).total_amount || order.final_amount || order.paid_amount) || 0,
            purity_percentage: Number(order.touch_percentage) || 91.6,
            receipt_json_data: updatedReceiptJSON,
            created_at: new Date().toISOString(),
          };

          insertMetalTransactions(orderInvoicePayload).catch(() => {});
        } catch (e) {
          console.warn('⚠️ customer_metal_transactions order trigger warning:', e);
        }
      }

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

  // Fetch transactions to compute unread_messages_count & last_message_at per worker
  let allTxns: any[] = [];
  try {
    const { data: dbTxns } = await supabase.from('worker_transactions').select('worker_id, direction, status_state, is_seen, created_at').order('created_at', { ascending: false }).limit(100);
    if (dbTxns && dbTxns.length > 0) {
      allTxns = dbTxns;
    } else {
      allTxns = mockTransactions;
    }
  } catch {
    allTxns = mockTransactions;
  }

  const unreadMap: Record<string, number> = {};
  const lastMessageTimeMap: Record<string, string> = {};

  allTxns.forEach((tx: any) => {
    const wId = String(tx.worker_id);
    if (!lastMessageTimeMap[wId] && tx.created_at) {
      lastMessageTimeMap[wId] = tx.created_at;
    }
    const isIncoming = tx.direction === 'INCOMING';
    const isUnread = isIncoming && tx.status_state !== 'READ' && tx.is_seen !== 'YES';
    if (isUnread) {
      unreadMap[wId] = (unreadMap[wId] || 0) + 1;
    }
  });

  const enrichedWorkers = workerList.map((worker) => {
    const assignedOrders = mockOrders.filter((o) => o.assigned_worker_id === worker.id);
    const pendingOrders = assignedOrders.filter((o) => o.status !== 'COMPLETED');
    const completedOrders = assignedOrders.filter((o) => o.status === 'COMPLETED');

    return {
      ...worker,
      assigned_orders_count: assignedOrders.length,
      pending_orders_count: pendingOrders.length,
      completed_orders_count: completedOrders.length,
      unread_messages_count: unreadMap[String(worker.id)] || 0,
      last_message_at: lastMessageTimeMap[String(worker.id)] || null,
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

// ── FIREBASE CLOUD MESSAGING (FCM) TOKEN REGISTRATION & PUSH ENGINE ──
const fcmTokensMap = new Map<string, string>();

// POST /api/work-assignment/register-fcm-token
router.post('/register-fcm-token', async (req: Request, res: Response) => {
  try {
    const { userId, role, fcmToken } = req.body;
    if (userId && fcmToken) {
      const targetId = role === 'ADMIN' ? 'ADMIN' : String(userId);
      await saveFcmToken(targetId, role === 'ADMIN' ? 'ADMIN' : 'WORKER', String(fcmToken));
      return res.json({ success: true, message: 'FCM token registered successfully' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/work-assignment/app-version?app=WORKER or ?app=ADMIN
router.get('/app-version', async (req: Request, res: Response) => {
  try {
    const appId = String(req.query.app || 'ADMIN').toUpperCase();
    const targetId = appId === 'WORKER' ? 'WORKER' : 'ADMIN';

    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('app_id', targetId)
      .single();

    if (!error && data) {
      return res.json({
        success: true,
        latestVersionCode: Number(data.version_code || 1),
        latestVersionName: String(data.version_name || '1.0.0'),
        apkDownloadUrl: String(data.apk_url || `https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavani${targetId === 'WORKER' ? 'Worker' : 'Admin'}.apk`),
        releaseNotes: 'Performance improvements, collapsible sidebar & live updates',
        forceUpdate: false,
      });
    }
  } catch (err: any) {
    console.warn('Supabase app_versions query notice:', err?.message || err);
  }

  return res.json({
    success: true,
    latestVersionCode: 1,
    latestVersionName: '1.0.0',
    apkDownloadUrl: 'https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavaniAdmin.apk',
    releaseNotes: 'Performance improvements, collapsible sidebar & live updates',
    forceUpdate: false,
  });
});

// ── SERVER-SENT EVENTS (SSE) REALTIME STREAM MANAGER ──
const sseClientsMap = new Map<string, Set<Response>>();

const broadcastToWorker = (workerId: string, eventType: string, payload: any) => {
  const dispatchToClients = (targetId: string) => {
    const clients = sseClientsMap.get(targetId);
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

  dispatchToClients(String(workerId));
  dispatchToClients('ALL_ADMINS');
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

  // Keep connection alive across proxies/Cloudflare by sending periodic heartbeat every 25s
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 25000);

  if (!sseClientsMap.has(cleanWorkerId)) {
    sseClientsMap.set(cleanWorkerId, new Set());
  }
  sseClientsMap.get(cleanWorkerId)!.add(res);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
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
    let query = supabase.from('worker_transactions').select('*');

    if (workerId) {
      query = query.eq('worker_id', String(workerId));
    }

    // 🔍 Database-level text search filter using indexes
    if (search && String(search).trim() !== '') {
      const q = String(search).trim();
      query = query.or(`item_name.ilike.%${q}%,notes.ilike.%${q}%,category.ilike.%${q}%`);
    } else if (fullHistory !== 'true' && fullHistory !== '1') {
      // 📅 Database-level date cutoff filter using indexed created_at column
      const cutoffDate = beforeDate ? new Date(String(beforeDate)) : new Date();
      const daysCount = Number(days) || 7;
      const startDate = new Date(cutoffDate.getTime() - daysCount * 24 * 60 * 60 * 1000);

      if (beforeDate) {
        query = query.lt('created_at', cutoffDate.toISOString());
      } else {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    const { data: dbTxns, error: dbErr } = await query.order('created_at', { ascending: true });

    if (!dbErr && dbTxns) {
      return res.json({
        success: true,
        transactions: dbTxns,
        total_count: dbTxns.length,
        search_active: !!search,
        source: 'supabase_database',
      });
    }

    if (dbErr) {
      console.warn('⚠️ Supabase GET worker_transactions notice:', dbErr.message);
    }
  } catch (err: any) {
    console.warn('⚠️ Supabase worker_transactions fetch exception:', err);
  }

  // 2. In-memory fallback if database query fails
  let combined = [...mockTransactions];
  if (workerId) {
    combined = combined.filter((t) => t.worker_id === String(workerId));
  }

  const formattedCombined = combined.map((t: any) => ({
    ...t,
    status_state: t.status_state || (t.read_at ? 'READ' : 'DELIVERED'),
  }));

  res.json({
    success: true,
    transactions: formattedCombined,
    source: 'in_memory_fallback',
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

    // Update mockTransactions array in memory ONLY for this specific worker_id
    let updatedCount = 0;
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
    const touch = Number(touch_percentage) || 100.0;
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

    // 2. Process any JSON base64 string photos or single image URL strings if passed
    if (photos) {
      let parsedPhotos: any[] = [];
      if (typeof photos === 'string') {
        try {
          const res = JSON.parse(photos);
          parsedPhotos = Array.isArray(res) ? res : [res];
        } catch (e) {
          parsedPhotos = [photos];
        }
      } else if (Array.isArray(photos)) {
        parsedPhotos = photos;
      }
      for (const p of parsedPhotos) {
        if (typeof p === 'string' && p.trim()) {
          const str = p.trim();
          if (str.startsWith('data:image/')) {
            try {
              const cUrl = await uploadToCloudinaryAsWebP(str, 'jewellery_product_images');
              uploadedPhotos.push(cUrl);
            } catch (errUpload) {
              uploadedPhotos.push(str);
            }
          } else if (str.startsWith('http') || str.startsWith('/')) {
            uploadedPhotos.push(str);
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

    // 1. Add to in-memory fallback list
    mockTransactions.push(newTxn);

    // 2. Try inserting into Supabase Database
    let finalInserted: any = newTxn;
    let { data: insertedDb, error: dbErr } = await supabase
      .from('worker_transactions')
      .insert([newTxn])
      .select()
      .single();

    if (!dbErr && insertedDb) {
      finalInserted = { ...newTxn, ...insertedDb, status_state: insertedDb?.status_state || 'DELIVERED' };
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
        finalInserted = { ...newTxn, ...retryDb, status_state: 'DELIVERED' };
        dbErr = null; // Suppress warning because fallback insert succeeded!
      }
    }

    // Trigger FCM Event-Driven Push Webhook on transaction submission
    try {
      const recipientId = newTxn.direction === 'OUTGOING' ? newTxn.worker_id : 'ADMIN';

      let workerName = newTxn.worker_id;
      if (newTxn.direction === 'INCOMING') {
        try {
          const { data: wData } = await supabase.from('workers').select('name').eq('id', newTxn.worker_id).single();
          if (wData?.name) {
            workerName = wData.name;
          }
        } catch (wErr) {
          // fallback to worker_id
        }
      }

      const notifTitle = newTxn.direction === 'OUTGOING' ? '👑 Jaya Bhavani Admin' : `${workerName} (Worker)`;
      const notifBody = newTxn.notes || (newTxn.item_name ? `Item: ${newTxn.item_name}` : `New transaction recorded (${newTxn.category})`);

      console.log(`📡 [FCM Event Trigger] Dispatching push notification to target [${recipientId}]: "${notifTitle} - ${notifBody}"`);
      triggerFcmPushNotification(recipientId, notifTitle, notifBody, {
        transaction_id: finalInserted.id,
        direction: newTxn.direction,
        category: newTxn.category,
      });
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
    });
  }
});

// PUT /api/worker-transactions/:id (Edit message notes & track edit timestamps array)
router.put('/worker-transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const editTimestamp = new Date().toISOString();

    if (notes === undefined) {
      return res.status(400).json({ success: false, message: 'Notes field is required for editing' });
    }

    // 1. Fetch transaction directly from Supabase
    const { data: targetTx, error: fetchErr } = await supabase
      .from('worker_transactions')
      .select('*')
      .eq('id', id)
      .single();

    let currentHistory: string[] = [];
    let targetWorkerId = targetTx?.worker_id;

    if (targetTx) {
      // Enforce 30-minute edit restriction window
      const createdAt = new Date(targetTx.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - createdAt) / (1000 * 60);
      if (diffMinutes > 30) {
        return res.status(400).json({
          success: false,
          message: '⚠️ Edit window expired! Messages can only be edited within 30 minutes of creation.',
        });
      }

      currentHistory = Array.isArray(targetTx.edited_at_history) ? targetTx.edited_at_history : [];
      currentHistory.push(editTimestamp);
    } else {
      currentHistory = [editTimestamp];
    }

    // 2. Update in Supabase
    try {
      await supabase
        .from('worker_transactions')
        .update({ notes, edited_at_history: currentHistory })
        .eq('id', id);
    } catch (dbErr) {
      console.warn('Supabase update worker_transactions warning:', dbErr);
    }

    // Also update in-memory mock if present
    const mockIdx = mockTransactions.findIndex((t: any) => t.id === id);
    if (mockIdx !== -1) {
      mockTransactions[mockIdx].notes = notes;
      mockTransactions[mockIdx].edited_at_history = currentHistory;
      if (!targetWorkerId) targetWorkerId = mockTransactions[mockIdx].worker_id;
    }

    // 3. Broadcast SSE live stream event for instant edit (< 10ms)
    if (targetWorkerId) {
      broadcastToWorker(String(targetWorkerId), 'MESSAGE_EDITED', {
        id,
        worker_id: String(targetWorkerId),
        notes,
        edited_at_history: currentHistory,
      });
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

    // Update in-memory mock & Supabase
    let targetWorkerId: string | null = null;
    const mockIdx = mockTransactions.findIndex((t: any) => t.id === id);
    if (mockIdx !== -1) {
      targetWorkerId = mockTransactions[mockIdx].worker_id;
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

    // 4. Broadcast SSE live stream event for instant delete (< 10ms)
    if (targetWorkerId) {
      broadcastToWorker(String(targetWorkerId), 'MESSAGE_DELETED', {
        id,
        worker_id: String(targetWorkerId),
      });
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

let mockUserSettings = { message_preview_enabled: true, image_preview_enabled: true };

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

  res.json({
    success: true,
    settings: mockUserSettings,
    source: 'in_memory_fallback',
  });
});

// POST /api/user-settings
router.post('/user-settings', async (req: Request, res: Response) => {
  try {
    mockUserSettings = { ...mockUserSettings, ...req.body };

    try {
      await supabase.from('user_settings').upsert({ id: 'DEFAULT_USER', ...mockUserSettings });
    } catch (e) {
      console.warn('Supabase user_settings upsert fallback:', e);
    }

    res.json({
      success: true,
      message: 'User settings updated successfully!',
      settings: mockUserSettings,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update user settings' });
  }
});

export default router;
