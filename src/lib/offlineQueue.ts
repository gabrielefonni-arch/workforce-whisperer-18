import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'pendingWrites:v1';

export interface PendingWrite {
  employee_id: string;
  user_id: string;
  date_key: string;
  status: string;
  hours: number;
  location: string;
  queuedAt: string;
}

function readQueue(): PendingWrite[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as PendingWrite[];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingWrite[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // storage full — best effort
  }
}

export function pendingCount() {
  return readQueue().length;
}

/** Queues a write locally so nothing is ever lost when the backend is unreachable. */
export function enqueueWrite(item: Omit<PendingWrite, 'queuedAt'>) {
  const queue = readQueue().filter(
    q => !(q.employee_id === item.employee_id && q.date_key === item.date_key)
  );
  queue.push({ ...item, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

let flushing = false;

/** Tries to push all queued writes. Keeps anything that still fails. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  const queue = readQueue();
  if (!queue.length) return 0;
  flushing = true;
  const remaining: PendingWrite[] = [];
  let sent = 0;
  try {
    for (const item of queue) {
      const { queuedAt: _queuedAt, ...row } = item;
      const { error } = await supabase
        .from('day_entries')
        .upsert(row, { onConflict: 'employee_id,date_key' });
      if (error) remaining.push(item);
      else sent++;
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
  return sent;
}
