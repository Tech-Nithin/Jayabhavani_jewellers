import { WorkerTransaction } from '../types/worker';

export function mergeTransactions(
  existing: WorkerTransaction[],
  incoming: WorkerTransaction[],
  activeWorkerId?: string
): WorkerTransaction[] {
  const map = new Map<string, WorkerTransaction>();

  // Collect notes/category/direction signature of all confirmed non-temp transactions
  const confirmedNotesSet = new Set<string>();
  for (const item of [...existing, ...incoming]) {
    if (item.id && !item.id.startsWith('temp_')) {
      const key = `${item.notes || ''}_${item.category}_${item.direction}`;
      confirmedNotesSet.add(key);
    }
  }

  // Add existing ONLY if it matches activeWorkerId and is not a duplicate temp item
  for (const item of existing) {
    if (item.id && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_')) {
        const key = `${item.notes || ''}_${item.category}_${item.direction}`;
        if (confirmedNotesSet.has(key)) continue; // skip ghost temp item!
      }
      map.set(item.id, item);
    }
  }

  // Add/Update incoming ONLY if it matches activeWorkerId
  for (const item of incoming) {
    if (item.id && (!activeWorkerId || String(item.worker_id) === String(activeWorkerId))) {
      if (item.id.startsWith('temp_')) {
        const key = `${item.notes || ''}_${item.category}_${item.direction}`;
        if (confirmedNotesSet.has(key)) continue; // skip ghost temp item!
      }
      map.set(item.id, item);
    }
  }

  // Convert to array and sort chronologically by created_at
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return result;
}
