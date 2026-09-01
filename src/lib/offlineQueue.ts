import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'pendingWrites:v1';
const EMP_QUEUE_KEY = 'pendingEmployeeOps:v1';

export interface PendingWrite {
  employee_id: string;
  user_id: string;
  date_key: string;
  status: string;
  hours: number;
  location: string;
  queuedAt: string;
}

export interface PendingEmployeeOp {
  op: 'insert' | 'delete';
  id: string;
  name?: string;
  section_id?: string;
  user_id: string;
  queuedAt: string;
}

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // storage full — best effort
  }
}

function readQueue() {
  return read<PendingWrite>(QUEUE_KEY);
}

function writeQueue(items: PendingWrite[]) {
  write(QUEUE_KEY, items);
}

function readEmpQueue() {
  return read<PendingEmployeeOp>(EMP_QUEUE_KEY);
}

function writeEmpQueue(items: PendingEmployeeOp[]) {
  write(EMP_QUEUE_KEY, items);
}

export function pendingCount() {
  return readQueue().length + readEmpQueue().length;
}

/** Queues a day-entry write locally so nothing is ever lost when the backend is unreachable. */
export function enqueueWrite(item: Omit<PendingWrite, 'queuedAt'>) {
  const queue = readQueue().filter(
    q => !(q.employee_id === item.employee_id && q.date_key === item.date_key)
  );
  queue.push({ ...item, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

/** Queues an employee insert/delete performed while offline. */
export function enqueueEmployeeOp(item: Omit<PendingEmployeeOp, 'queuedAt'>) {
  let queue = readEmpQueue();
  if (item.op === 'delete') {
    // A locally-created employee deleted before syncing: drop both operations.
    const hadPendingInsert = queue.some(q => q.op === 'insert' && q.id === item.id);
    queue = queue.filter(q => q.id !== item.id);
    if (hadPendingInsert) {
      writeEmpQueue(queue);
      // Also drop its queued day entries
      writeQueue(readQueue().filter(w => w.employee_id !== item.id));
      return;
    }
  }
  queue.push({ ...item, queuedAt: new Date().toISOString() });
  writeEmpQueue(queue);
}

let flushing = false;

/** Tries to push all queued writes (employees first, then day entries). Keeps anything that still fails. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  const empQueue = readEmpQueue();
  const queue = readQueue();
  if (!empQueue.length && !queue.length) return 0;
  flushing = true;
  let sent = 0;
  try {
    const remainingEmp: PendingEmployeeOp[] = [];
    for (const item of empQueue) {
      if (item.op === 'insert') {
        const { error } = await supabase
          .from('employees')
          .upsert({ id: item.id, name: item.name!, section_id: item.section_id!, user_id: item.user_id });
        if (error) remainingEmp.push(item);
        else sent++;
      } else {
        const { error } = await supabase.from('employees').delete().eq('id', item.id);
        if (error) remainingEmp.push(item);
        else sent++;
      }
    }
    writeEmpQueue(remainingEmp);

    const blocked = new Set(remainingEmp.filter(e => e.op === 'insert').map(e => e.id));
    const remaining: PendingWrite[] = [];
    for (const item of queue) {
      if (blocked.has(item.employee_id)) {
        remaining.push(item);
        continue;
      }
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
