import { supabase } from '@/integrations/supabase/client';
import { MONTHS_IT } from '@/lib/dateUtils';

const PAGE = 1000;

async function fetchAll<T = Record<string, unknown>>(
  table: 'employees' | 'day_entries',
  userId: string,
): Promise<T[]> {
  let all: T[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

const STATUS_LABEL: Record<string, string> = {
  P: 'Presente',
  A: 'Assente',
  M: 'Malattia',
  F: 'Ferie',
  PR: 'Permesso',
  FES: 'Festivo',
  IMF: 'Infortunio',
};

const statusLabel = (s?: string | null) => (s ? STATUS_LABEL[s] ?? s : '—');

function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

const itDate = (key: string) => {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

interface Employee { id: string; name?: string | null; full_name?: string | null }
interface DayEntry {
  employee_id: string;
  date_key: string;
  status?: string | null;
  hours?: number | null;
  location?: string | null;
}

/** Genera un archivio PDF completo: copertina, riepilogo, mese per mese e dipendente per dipendente. */
export async function exportFullArchivePdf(userId: string): Promise<{ entries: number; employees: number }> {
  const [employees, entries] = await Promise.all([
    fetchAll<Employee>('employees', userId),
    fetchAll<DayEntry>('day_entries', userId),
  ]);

  const empName = new Map(
    employees.map(e => [e.id, (e.name ?? e.full_name ?? 'Senza nome') as string]),
  );

  // raggruppa: mese → dipendente → giorni
  const months = new Map<string, Map<string, DayEntry[]>>();
  for (const e of entries) {
    if (!e.date_key) continue;
    const mKey = e.date_key.slice(0, 7);
    if (!months.has(mKey)) months.set(mKey, new Map());
    const byEmp = months.get(mKey)!;
    if (!byEmp.has(e.employee_id)) byEmp.set(e.employee_id, []);
    byEmp.get(e.employee_id)!.push(e);
  }

  const monthKeys = [...months.keys()].sort().reverse();
  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const now = new Date();
  const generated = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const monthTitle = (key: string) => {
    const [y, m] = key.split('-');
    return `${MONTHS_IT[Number(m) - 1]} ${y}`;
  };

  let html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>Archivio completo giornaliere</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color:#101418; font-size:10.5px; }
  .cover { height: 250mm; display:flex; flex-direction:column; justify-content:center; }
  .kicker { font-size:9px; letter-spacing:.22em; text-transform:uppercase; color:#8a93a0; }
  h1 { font-size:30px; font-weight:650; margin:8px 0 4px; letter-spacing:-.02em; }
  .sub { color:#6b7480; font-size:11px; }
  .rule { height:1px; background:#e4e7eb; margin:22px 0; }
  .kpis { display:flex; gap:0; border:1px solid #e4e7eb; border-radius:6px; overflow:hidden; }
  .kpi { flex:1; padding:14px 16px; border-right:1px solid #e4e7eb; }
  .kpi:last-child { border-right:0; }
  .kpi .v { display:block; font-size:22px; font-weight:650; letter-spacing:-.02em; }
  .kpi .l { display:block; font-size:8.5px; letter-spacing:.14em; text-transform:uppercase; color:#8a93a0; margin-top:4px; }
  .month { page-break-before: always; }
  .month-h { display:flex; align-items:baseline; justify-content:space-between; border-bottom:1.5px solid #101418; padding-bottom:6px; margin-bottom:14px; }
  .month-h h2 { font-size:16px; font-weight:650; margin:0; text-transform:capitalize; letter-spacing:-.01em; }
  .month-h span { font-size:9px; color:#8a93a0; letter-spacing:.1em; text-transform:uppercase; }
  .emp { margin-bottom:16px; page-break-inside: avoid; }
  .emp-h { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:5px; }
  .emp-h strong { font-size:11.5px; font-weight:620; }
  .emp-h em { font-style:normal; font-size:9px; color:#8a93a0; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:8px; letter-spacing:.14em; text-transform:uppercase; color:#8a93a0; font-weight:600; padding:4px 6px; border-bottom:1px solid #e4e7eb; }
  td { padding:4px 6px; border-bottom:1px solid #f1f3f5; font-size:10px; vertical-align:top; }
  td.n { text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
  td.d { white-space:nowrap; color:#48505a; }
  .footer { position:fixed; bottom:4mm; left:0; right:0; text-align:center; font-size:8px; color:#a2a9b2; }
</style></head><body>`;

  html += `<div class="cover">
    <div class="kicker">Archivio giornaliere</div>
    <h1>Archivio completo dati</h1>
    <div class="sub">Documento generato automaticamente il ${generated}</div>
    <div class="rule"></div>
    <div class="kpis">
      <div class="kpi"><span class="v">${employees.length}</span><span class="l">Dipendenti</span></div>
      <div class="kpi"><span class="v">${entries.length}</span><span class="l">Giornaliere</span></div>
      <div class="kpi"><span class="v">${monthKeys.length}</span><span class="l">Mesi</span></div>
      <div class="kpi"><span class="v">${totalHours.toLocaleString('it-IT')}</span><span class="l">Ore totali</span></div>
    </div>
  </div>`;

  for (const mKey of monthKeys) {
    const byEmp = months.get(mKey)!;
    const monthEntries = [...byEmp.values()].flat();
    const monthHours = monthEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);

    html += `<div class="month"><div class="month-h">
      <h2>${escapeHtml(monthTitle(mKey))}</h2>
      <span>${byEmp.size} dipendenti · ${monthEntries.length} giornate · ${monthHours.toLocaleString('it-IT')} ore</span>
    </div>`;

    const sortedEmps = [...byEmp.entries()].sort((a, b) =>
      (empName.get(a[0]) ?? '').localeCompare(empName.get(b[0]) ?? '', 'it'),
    );

    for (const [empId, rows] of sortedEmps) {
      const sorted = rows.slice().sort((a, b) => a.date_key.localeCompare(b.date_key));
      const hours = sorted.reduce((s, e) => s + (Number(e.hours) || 0), 0);
      html += `<div class="emp"><div class="emp-h">
        <strong>${escapeHtml(empName.get(empId) ?? 'Senza nome')}</strong>
        <em>${sorted.length} giornate · ${hours.toLocaleString('it-IT')} ore</em>
      </div>
      <table><thead><tr>
        <th style="width:22%">Data</th><th style="width:24%">Stato</th><th style="width:14%">Ore</th><th>Cantiere</th>
      </tr></thead><tbody>`;
      for (const r of sorted) {
        html += `<tr>
          <td class="d">${escapeHtml(itDate(r.date_key))}</td>
          <td>${escapeHtml(statusLabel(r.status))}</td>
          <td class="n">${r.hours ? escapeHtml(r.hours) : '—'}</td>
          <td>${escapeHtml(r.location || '—')}</td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }
    html += `</div>`;
  }

  html += `<div class="footer">Archivio giornaliere · Documento riservato · generato il ${generated}</div></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  return { entries: entries.length, employees: employees.length };
}
