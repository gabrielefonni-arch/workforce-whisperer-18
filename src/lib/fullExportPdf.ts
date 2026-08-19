import { supabase } from '@/integrations/supabase/client';
import { MONTHS_IT } from './dateUtils';
import { format } from 'date-fns';

const PAGE = 1000;

interface EntryRow {
  employee_id: string;
  date_key: string;
  status: string | null;
  hours: number | null;
  location: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  P: 'Presente', A: 'Assente', M: 'Malattia', F: 'Ferie',
  PR: 'Permesso', FES: 'Festivo', IMF: 'Infortunio',
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, c => map[c]);
}

async function fetchAll<T>(table: 'employees' | 'day_entries', userId: string, columns: string): Promise<T[]> {
  let all: T[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('user_id', userId)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data as unknown as T[]);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

/** Builds a complete printable PDF archive (all months, all employees) and opens the print dialog. */
export async function exportFullArchivePdf(userId: string): Promise<{ entries: number; employees: number }> {
  const [employees, entries] = await Promise.all([
    fetchAll<{ id: string; name: string }>('employees', userId, 'id, name'),
    fetchAll<EntryRow>('day_entries', userId, 'employee_id, date_key, status, hours, location'),
  ]);

  const names: Record<string, string> = {};
  employees.forEach(e => { names[e.id] = e.name; });

  // month -> employee -> rows
  const byMonth: Record<string, Record<string, EntryRow[]>> = {};
  for (const r of entries) {
    if (!r.date_key) continue;
    const mk = r.date_key.slice(0, 7);
    byMonth[mk] ??= {};
    byMonth[mk][r.employee_id] ??= [];
    byMonth[mk][r.employee_id].push(r);
  }
  const monthKeys = Object.keys(byMonth).sort().reverse();

  let html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>Archivio completo giornaliere</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:#1c1917; margin:0; }
  .cover { text-align:center; padding:24px 0 18px; border-bottom:3px solid #b45309; margin-bottom:18px; }
  .cover h1 { font-size:22px; margin:0 0 6px; color:#78350f; letter-spacing:.5px; }
  .cover p { margin:2px 0; font-size:11px; color:#57534e; }
  .kpis { display:flex; justify-content:center; gap:22px; margin-top:12px; }
  .kpi { background:#fef3c7; border-radius:8px; padding:8px 14px; min-width:90px; }
  .kpi b { display:block; font-size:18px; color:#92400e; }
  .kpi span { font-size:9px; text-transform:uppercase; letter-spacing:.6px; color:#78350f; }
  h2 { font-size:14px; margin:16px 0 8px; padding:6px 10px; background:linear-gradient(135deg,#451a03,#78350f); color:#fff; border-radius:6px; }
  h3 { font-size:11px; margin:10px 0 4px; color:#78350f; border-left:3px solid #b45309; padding-left:6px; }
  table { width:100%; border-collapse:collapse; font-size:9px; }
  th { background:#fef3c7; color:#78350f; text-align:left; padding:3px 5px; border:1px solid #e7e5e4; font-size:8px; text-transform:uppercase; letter-spacing:.4px; }
  td { padding:3px 5px; border:1px solid #e7e5e4; }
  tr:nth-child(even) td { background:#fafaf9; }
  .num { text-align:right; }
  .emp { break-inside:avoid; page-break-inside:avoid; }
  .month { break-before:page; page-break-before:always; }
  .month:first-of-type { break-before:auto; page-break-before:auto; }
  .tot { font-weight:700; color:#92400e; }
  .footer { margin-top:14px; text-align:center; font-size:8px; color:#78716c; border-top:1px solid #e7e5e4; padding-top:6px; }
</style></head><body>`;

  const totalHours = entries.reduce((s, r) => s + (r.hours || 0), 0);

  html += `<div class="cover">
    <h1>ARCHIVIO COMPLETO GIORNALIERE</h1>
    <p>Documento riservato · generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
    <div class="kpis">
      <div class="kpi"><b>${entries.length}</b><span>Registrazioni</span></div>
      <div class="kpi"><b>${employees.length}</b><span>Dipendenti</span></div>
      <div class="kpi"><b>${monthKeys.length}</b><span>Mesi</span></div>
      <div class="kpi"><b>${totalHours}</b><span>Ore totali</span></div>
    </div>
  </div>`;

  for (const mk of monthKeys) {
    const [y, m] = mk.split('-');
    const monthLabel = `${MONTHS_IT[Number(m) - 1]} ${y}`;
    const emps = byMonth[mk];
    const monthHours = Object.values(emps).flat().reduce((s, r) => s + (r.hours || 0), 0);

    html += `<section class="month"><h2>${escapeHtml(monthLabel)} — ${monthHours} ore totali</h2>`;

    const sortedEmpIds = Object.keys(emps).sort((a, b) =>
      (names[a] || '').localeCompare(names[b] || ''));

    for (const empId of sortedEmpIds) {
      const rows = emps[empId].slice().sort((a, b) => a.date_key.localeCompare(b.date_key));
      const empHours = rows.reduce((s, r) => s + (r.hours || 0), 0);
      html += `<div class="emp"><h3>${escapeHtml(names[empId] || 'Dipendente eliminato')} · ${rows.length} giorni · ${empHours} ore</h3>
        <table><thead><tr><th style="width:70px">Data</th><th style="width:90px">Stato</th><th style="width:50px">Ore</th><th>Cantiere / Località</th></tr></thead><tbody>`;
      for (const r of rows) {
        const st = r.status ? (STATUS_LABEL[r.status] || r.status) : '—';
        html += `<tr><td>${escapeHtml(r.date_key.split('-').reverse().join('/'))}</td><td>${escapeHtml(st)}</td><td class="num">${r.hours ?? ''}</td><td>${escapeHtml(r.location || '')}</td></tr>`;
      }
      html += `<tr><td colspan="2" class="tot">Totale</td><td class="num tot">${empHours}</td><td></td></tr>`;
      html += `</tbody></table></div>`;
    }
    html += `</section>`;
  }

  if (monthKeys.length === 0) {
    html += `<p style="text-align:center;font-size:11px;color:#78716c">Nessuna registrazione presente.</p>`;
  }

  html += `<div class="footer">Archivio completo · ${entries.length} registrazioni · documento generato automaticamente</div></body></html>`;

  const win = window.open('', '_blank');
  if (!win) throw new Error('popup-blocked');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);

  return { entries: entries.length, employees: employees.length };
}
