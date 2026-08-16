import type { EmployeeData } from '@/types/employee';

const PREFIX = 'backup:';
const MAX_SNAPSHOTS = 14;

export interface BackupSnapshot {
  sectionId: string;
  savedAt: string;
  data: EmployeeData;
}

function keyFor(sectionId: string, day: string) {
  return `${PREFIX}${sectionId}:${day}`;
}

/** Saves one local snapshot per section per day and prunes older ones. */
export function saveLocalBackup(sectionId: string, data: EmployeeData) {
  if (!data.employees.length) return;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const snapshot: BackupSnapshot = { sectionId, savedAt: now.toISOString(), data };
  try {
    localStorage.setItem(keyFor(sectionId, day), JSON.stringify(snapshot));
    pruneOld(sectionId);
  } catch {
    // storage full or unavailable — ignore, backup is best-effort
  }
}

function pruneOld(sectionId: string) {
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith(`${PREFIX}${sectionId}:`))
    .sort();
  while (keys.length > MAX_SNAPSHOTS) {
    const oldest = keys.shift();
    if (oldest) localStorage.removeItem(oldest);
  }
}

/** Most recent local snapshot for a section, used as offline fallback. */
export function latestLocalBackup(sectionId: string): BackupSnapshot | null {
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith(`${PREFIX}${sectionId}:`))
    .sort();
  const newest = keys.pop();
  if (!newest) return null;
  try {
    return JSON.parse(localStorage.getItem(newest) || 'null') as BackupSnapshot | null;
  } catch {
    return null;
  }
}

export function listLocalBackups(): BackupSnapshot[] {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .map(k => {
      try {
        return JSON.parse(localStorage.getItem(k) || 'null') as BackupSnapshot | null;
      } catch {
        return null;
      }
    })
    .filter((s): s is BackupSnapshot => !!s && !!s.savedAt)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function downloadLocalBackups() {
  const snapshots = listLocalBackups();
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), snapshots }, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-locale-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
