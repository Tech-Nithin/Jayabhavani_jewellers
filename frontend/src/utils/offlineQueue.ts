import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface JBJOfflineDBSchema extends DBSchema {
  cached_transactions: {
    key: string; // transaction id or temp_id
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
    key: string; // temp_id
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

const DB_NAME = 'jbj_work_assignment_db';
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

export function mergeTransactions(
  existing: any[],
  incoming: any[],
  activeWorkerId?: string
): any[] {
  const map = new Map<string, any>();

  const confirmedNotesSet = new Set<string>();
  for (const item of [...existing, ...incoming]) {
    if (item && item.id && !item.id.startsWith('temp_')) {
      const key = `${(item.notes || '').trim().toLowerCase()}_${item.direction}`;
      confirmedNotesSet.add(key);
    }
  }

  for (const item of existing) {
    if (item && item.id && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_')) {
        const key = `${(item.notes || '').trim().toLowerCase()}_${item.direction}`;
        if (confirmedNotesSet.has(key)) continue;
      }
      map.set(item.id, item);
    }
  }

  for (const item of incoming) {
    if (item && item.id && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_')) {
        const key = `${(item.notes || '').trim().toLowerCase()}_${item.direction}`;
        if (confirmedNotesSet.has(key)) continue;
      }
      map.set(item.id, item);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return result;
}

/**
 * Cache transaction list in IndexedDB for instant offline loading
 */
export async function saveCachedTransactions(workerId: string, transactions: any[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction('cached_transactions', 'readwrite');

    const confirmedNotes = new Set(
      transactions
        .filter((item) => item && item.id && !item.id.startsWith('temp_'))
        .map((item) => `${(item.notes || '').trim().toLowerCase()}_${item.direction}`)
    );

    const existing = await tx.store.index('by-worker').getAll(String(workerId));
    for (const oldItem of existing) {
      if (oldItem.id && oldItem.id.startsWith('temp_')) {
        const sig = `${(oldItem.notes || '').trim().toLowerCase()}_${oldItem.direction}`;
        if (confirmedNotes.has(sig)) {
          await tx.store.delete(oldItem.id);
        }
      }
    }

    for (const item of transactions) {
      if (item && item.id) {
        if (item.id.startsWith('temp_')) {
          const sig = `${(item.notes || '').trim().toLowerCase()}_${item.direction}`;
          if (confirmedNotes.has(sig)) continue;
        }
        await tx.store.put({ ...item, worker_id: String(workerId) });
      }
    }
    await tx.done;
  } catch (err) {
    console.warn('[IndexedDB] Error saving cached transactions:', err);
  }
}

/**
 * Fetch cached transactions from IndexedDB for a given worker
 */
export async function getCachedTransactions(workerId: string): Promise<any[]> {
  try {
    const db = await getOfflineDb();
    const all = await db.getAllFromIndex('cached_transactions', 'by-worker', String(workerId));

    const confirmedNotes = new Set(
      all
        .filter((item) => item && item.id && !item.id.startsWith('temp_'))
        .map((item) => `${(item.notes || '').trim().toLowerCase()}_${item.direction}`)
    );

    const filtered = all.filter((item) => {
      if (item.id && item.id.startsWith('temp_')) {
        const sig = `${(item.notes || '').trim().toLowerCase()}_${item.direction}`;
        if (confirmedNotes.has(sig)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (err) {
    console.warn('[IndexedDB] Error getting cached transactions:', err);
    return [];
  }
}

/**
 * Enqueue an unsent offline transaction
 */
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
    console.log(`[IndexedDB] Enqueued pending transaction ${tempId} for worker ${workerId}`);
  } catch (err) {
    console.warn('[IndexedDB] Error enqueuing pending transaction:', err);
  }
}

/**
 * Get all pending queue items
 */
export async function getPendingQueue(workerId?: string): Promise<any[]> {
  try {
    const db = await getOfflineDb();
    if (workerId) {
      return await db.getAllFromIndex('pending_queue', 'by-worker', String(workerId));
    }
    return await db.getAll('pending_queue');
  } catch (err) {
    console.warn('[IndexedDB] Error getting pending queue:', err);
    return [];
  }
}

/**
 * Remove an item from pending queue once synced successfully
 */
export async function removePendingItem(tempId: string): Promise<void> {
  try {
    const db = await getOfflineDb();
    await db.delete('pending_queue', tempId);
    console.log(`[IndexedDB] Removed synced item ${tempId} from queue`);
  } catch (err) {
    console.warn('[IndexedDB] Error removing pending item:', err);
  }
}

/**
 * Auto-sync pending queue when internet connection is restored
 */
export async function processPendingQueue(
  sendTxnFn: (payload: any) => Promise<any>
): Promise<{ syncedCount: number; errorsCount: number }> {
  let syncedCount = 0;
  let errorsCount = 0;
  try {
    const pendingItems = await getPendingQueue();
    if (pendingItems.length === 0) return { syncedCount: 0, errorsCount: 0 };

    console.log(`⚡ [Offline Auto-Sync] Processing ${pendingItems.length} queued offline items...`);
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
        console.warn(`⚠️ [Offline Auto-Sync] Failed to sync ${item.temp_id}:`, postErr);
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] Error processing pending queue:', err);
  }
  return { syncedCount, errorsCount };
}
