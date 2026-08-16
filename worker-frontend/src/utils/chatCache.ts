import { WorkerTransaction } from '../types/worker';

const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

interface CachePayload {
  timestamp: number;
  data: WorkerTransaction[];
}

export function getCachedTransactions(workerId: string): WorkerTransaction[] | null {
  try {
    const raw = localStorage.getItem(`jbj_chat_cache_${workerId}`);
    if (!raw) return null;

    const payload: CachePayload = JSON.parse(raw);
    const age = Date.now() - payload.timestamp;

    // Check if 8-hour TTL has expired
    if (age > CACHE_TTL_MS) {
      console.log(`ℹ️ [Chat Cache] Expiry 8h reached for worker ${workerId}. Revalidating...`);
      return null;
    }

    return Array.isArray(payload.data) ? payload.data : null;
  } catch (e) {
    console.warn('Failed to read chat cache:', e);
    return null;
  }
}

export function saveCachedTransactions(workerId: string, transactions: WorkerTransaction[]): void {
  try {
    const payload: CachePayload = {
      timestamp: Date.now(),
      data: transactions,
    };
    localStorage.setItem(`jbj_chat_cache_${workerId}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save chat cache:', e);
  }
}

export function mergeTransactions(
  existing: WorkerTransaction[],
  incoming: WorkerTransaction[],
  activeWorkerId?: string
): WorkerTransaction[] {
  const map = new Map<string, WorkerTransaction>();

  // Add existing ONLY if it matches activeWorkerId
  for (const item of existing) {
    if (item.id && (!activeWorkerId || item.worker_id === activeWorkerId)) {
      map.set(item.id, item);
    }
  }

  // Add/Update incoming ONLY if it matches activeWorkerId
  for (const item of incoming) {
    if (item.id && (!activeWorkerId || item.worker_id === activeWorkerId)) {
      map.set(item.id, item);
    }
  }

  // Convert to array and sort chronologically by created_at
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return result;
}
