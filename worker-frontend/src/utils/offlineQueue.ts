import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface JBJOfflineDBSchema extends DBSchema {
  cached_transactions: {
    key: string;
    value: {
      id: string;
      worker_id: string;
      direction: string;
      category: string;
      amount_cash?: number;
      weight_grams?: number;
      touch_percentage?: number;
      item_name?: string;
      cash_metal_link?: string;
      applied_rate_per_gram?: number;
      photos?: string[];
      notes?: string;
      created_at: string;
      status?: string;
      [key: string]: any;
    };
    indexes: { 'by-worker': string };
  };
  pending_queue: {
    key: string;
    value: {
      temp_id: string;
      worker_id: string;
      payload: any;
      created_at: string;
      attempts: number;
    };
    indexes: { 'by-worker': string };
  };
}

const DB_NAME = 'jbj_worker_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JBJOfflineDBSchema>> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB<JBJOfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cached_transactions')) {
          const txStore = db.createObjectStore('cached_transactions', { keyPath: 'id' });
          txStore.createIndex('by-worker', 'worker_id');
        }
        if (!db.objectStoreNames.contains('pending_queue')) {
          const qStore = db.createObjectStore('pending_queue', { keyPath: 'temp_id' });
          qStore.createIndex('by-worker', 'worker_id');
        }
      },
    });
  }
  return dbPromise;
}

function isGhostTempItem(tempItem: any, confirmedItems: any[]): boolean {
  if (!tempItem || !tempItem.id || !tempItem.id.startsWith('temp_')) return false;
  const tempTime = new Date(tempItem.created_at).getTime();
  const tempNotes = (tempItem.notes || '').trim().toLowerCase();

  return confirmedItems.some((conf) => {
    if (!conf || !conf.id || conf.id.startsWith('temp_')) return false;
    if (conf.direction !== tempItem.direction) return false;

    const confNotes = (conf.notes || '').trim().toLowerCase();
    if (confNotes !== tempNotes) return false;

    const confTime = new Date(conf.created_at).getTime();
    const diffMs = Math.abs(tempTime - confTime);
    return isNaN(diffMs) || diffMs <= 120000; // Within 2-minute window
  });
}

export async function saveCachedTransactions(workerId: string, transactions: any[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction('cached_transactions', 'readwrite');

    const confirmedItems = transactions.filter((item) => item && item.id && !item.id.startsWith('temp_'));

    const existing = await tx.store.index('by-worker').getAll(String(workerId));
    for (const oldItem of existing) {
      if (oldItem.id && oldItem.id.startsWith('temp_') && isGhostTempItem(oldItem, confirmedItems)) {
        await tx.store.delete(oldItem.id);
      }
    }

    for (const item of transactions) {
      if (item && item.id) {
        if (item.id.startsWith('temp_') && isGhostTempItem(item, confirmedItems)) continue;
        await tx.store.put({ ...item, worker_id: String(workerId) });
      }
    }
    await tx.done;
  } catch (err) {
    console.warn('[IndexedDB] Error saving worker cached transactions:', err);
  }
}

export async function getCachedTransactions(workerId: string): Promise<any[]> {
  try {
    const db = await getOfflineDb();
    const all = await db.getAllFromIndex('cached_transactions', 'by-worker', String(workerId));

    const confirmedItems = all.filter((item) => item && item.id && !item.id.startsWith('temp_'));

    const filtered = all.filter((item) => {
      if (item.id && item.id.startsWith('temp_') && isGhostTempItem(item, confirmedItems)) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (err) {
    console.warn('[IndexedDB] Error getting worker cached transactions:', err);
    return [];
  }
}

export async function enqueuePendingTransaction(tempId: string, workerId: string, payload: any): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.put('pending_queue', {
      temp_id: tempId,
      worker_id: String(workerId),
      payload,
      created_at: new Date().toISOString(),
      attempts: 0,
    });
    console.log(`[IndexedDB] Worker enqueued pending transaction ${tempId}`);
  } catch (err) {
    console.warn('[IndexedDB] Error enqueuing worker transaction:', err);
  }
}

export async function getPendingQueue(workerId?: string): Promise<any[]> {
  try {
    const db = await getOfflineDb();
    if (workerId) {
      return await db.getAllFromIndex('pending_queue', 'by-worker', String(workerId));
    }
    return await db.getAll('pending_queue');
  } catch (err) {
    console.warn('[IndexedDB] Error getting worker pending queue:', err);
    return [];
  }
}

export async function removePendingItem(tempId: string): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.delete('pending_queue', tempId);
    console.log(`[IndexedDB] Removed worker synced item ${tempId}`);
  } catch (err) {
    console.warn('[IndexedDB] Error removing worker pending item:', err);
  }
}

export async function processPendingQueue(
  sendTxnFn: (payload: any) => Promise<any>
): Promise<{ syncedCount: number; errorsCount: number }> {
  let syncedCount = 0;
  let errorsCount = 0;
  try {
    const pendingItems = await getPendingQueue();
    if (pendingItems.length === 0) return { syncedCount: 0, errorsCount: 0 };

    console.log(`⚡ [Worker Offline Auto-Sync] Processing ${pendingItems.length} queued offline items...`);
    for (const item of pendingItems) {
      try {
        const result = await sendTxnFn(item.payload);
        if (result && (result.success || result.id)) {
          await removePendingItem(item.temp_id);
          syncedCount++;
        } else {
          errorsCount++;
        }
      } catch (postErr) {
        errorsCount++;
        console.warn(`⚠️ [Worker Offline Auto-Sync] Failed to sync ${item.temp_id}:`, postErr);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] Error processing worker pending queue:', err);
  }
  return { syncedCount, errorsCount };
}
