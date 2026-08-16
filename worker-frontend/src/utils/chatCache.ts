import { WorkerTransaction } from '../types/worker';

const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

interface CachePayload {
  timestamp: number;
  data: WorkerTransaction[];
}

export function getCachedTransactions(_workerId: string): WorkerTransaction[] | null {
  // Local storage caching disabled for clean production & database sync
  return null;
}

export function saveCachedTransactions(_workerId: string, _transactions: WorkerTransaction[]): void {
  // Local storage caching disabled for clean production & database sync
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
