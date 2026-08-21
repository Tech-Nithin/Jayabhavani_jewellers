import { WorkerTransaction } from '../types/worker';

function isGhostTempItem(tempItem: WorkerTransaction, confirmedItems: WorkerTransaction[]): boolean {
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

export function mergeTransactions(
  existing: WorkerTransaction[],
  incoming: WorkerTransaction[],
  activeWorkerId?: string
): WorkerTransaction[] {
  const map = new Map<string, WorkerTransaction>();
  const allItems = [...existing, ...incoming];
  const confirmedItems = allItems.filter((item) => item && item.id && !item.id.startsWith('temp_'));

  for (const item of existing) {
    if (item && item.id && !item.is_deleted && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_') && isGhostTempItem(item, confirmedItems)) {
        continue;
      }
      map.set(item.id, item);
    }
  }

  for (const item of incoming) {
    if (item && item.id && !item.is_deleted && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_') && isGhostTempItem(item, confirmedItems)) {
        continue;
      }
      map.set(item.id, item);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return result;
}
