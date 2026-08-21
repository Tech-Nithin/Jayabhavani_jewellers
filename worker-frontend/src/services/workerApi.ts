import { API_BASE } from '../config/apiConfig';
import { WorkerTransaction, ReplyMessageData, TransactionCategory } from '../types/worker';
import { convertFileToWebP } from '../utils/imageUtils';

export async function loginWorker(identifier: string, passcode: string) {
  const res = await fetch(`${API_BASE}/worker-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, passcode }),
  });
  return res.json();
}

export async function fetchWorkerTransactions(
  workerId: string,
  days = 7,
  search = '',
  beforeDate = ''
): Promise<WorkerTransaction[]> {
  let url = `${API_BASE}/work-assignment/worker-transactions?workerId=${encodeURIComponent(workerId)}`;

  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  } else {
    if (days) url += `&days=${days}`;
    if (beforeDate) url += `&beforeDate=${encodeURIComponent(beforeDate)}`;
  }

  const res = await fetch(url);
  const data = await res.json();
  if (data.success && Array.isArray(data.transactions)) {
    return data.transactions;
  }
  return [];
}

export async function sendWorkerTransaction(
  workerId: string,
  notes: string,
  photoFiles: File[],
  replyTo?: ReplyMessageData | null,
  specDetails?: {
    category?: TransactionCategory;
    itemName?: string;
    orderId?: string | null;
    weightGrams?: number;
    touchPercentage?: number;
    amountCash?: number;
    cashMetalLink?: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
    appliedRatePerGram?: number;
  }
) {
  const formData = new FormData();
  formData.append('worker_id', workerId);
  formData.append('direction', 'INCOMING'); // Worker -> Admin
  
  if (specDetails?.category) {
    formData.append('category', specDetails.category);
  }
  if (specDetails?.orderId) {
    formData.append('order_id', specDetails.orderId);
  }
  if (specDetails?.itemName) {
    formData.append('item_name', specDetails.itemName);
  }
  if (specDetails?.weightGrams !== undefined) {
    formData.append('weight_grams', String(specDetails.weightGrams));
  }
  if (specDetails?.touchPercentage !== undefined) {
    formData.append('touch_percentage', String(specDetails.touchPercentage));
  }
  if (specDetails?.amountCash !== undefined) {
    formData.append('amount_cash', String(specDetails.amountCash));
  }
  if (specDetails?.cashMetalLink) {
    formData.append('cash_metal_link', specDetails.cashMetalLink);
  }
  if (specDetails?.appliedRatePerGram !== undefined) {
    formData.append('applied_rate_per_gram', String(specDetails.appliedRatePerGram));
  }

  formData.append('notes', notes.trim());

  if (replyTo) {
    formData.append('reply_to', JSON.stringify(replyTo));
  }

  // Convert files to WebP before uploading
  for (const file of photoFiles) {
    const webpFile = await convertFileToWebP(file);
    formData.append('files', webpFile);
  }

  const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
    method: 'POST',
    body: formData,
  });

  return res.json();
}

export async function updateWorkerTransactionNotes(transactionId: string, notes: string) {
  const res = await fetch(`${API_BASE}/work-assignment/worker-transactions/${transactionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function deleteWorkerTransaction(transactionId: string) {
  const res = await fetch(`${API_BASE}/work-assignment/worker-transactions/${transactionId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchWorkerAssignedOrders(workerId: string): Promise<any[]> {
  try {
    // 1. Try direct dedicated endpoint
    const res = await fetch(`${API_BASE}/work-assignment/workers/${encodeURIComponent(workerId)}/all-orders`);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.orders)) {
        return data.orders;
      }
    }
  } catch {
    // fallback below
  }

  try {
    // 2. Resilient fallback to universal orders list endpoint
    const res = await fetch(`${API_BASE}/work-assignment/orders?limit=250`);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.orders)) {
        return data.orders.filter((o: any) => o.assigned_worker_id === workerId);
      }
    }
  } catch (err) {
    console.warn('Fallback orders fetch error:', err);
  }

  return [];
}
