import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey, MONTHS_IT, isWeekend } from './dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export function exportToPDF(employees: Employee[], year: number, month: number, companyName: string = 'Edilrestrutturazioni') {
  const days = getDaysInMonth(year, month);

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  days.forEach((d, i) => {
    currentWeek.push(d);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || i === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  let html = `<html><head><style>
    @page { size: A4 landscape; margin: 14mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 10px; color: #2d2d2d; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }

    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; margin-bottom: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 10px; color: #fff;
    }
    .header h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 2px; }
    .header .subtitle { font-size: 11px; opacity: 0.7; font-weight: 400; letter-spacing: 0.3px; }
    .header .date-info { 
      font-size: 11px; text-align: right; opacity: 0.85; line-height: 1.6;
    }
    .header .date-info strong { font-size: 14px; font-weight: 700; display: block; }

    table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 22px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,0.06); }
    thead tr { background: linear-gradient(135deg, #1a1a2e, #0f3460); }
    th {
      color: #fff; font-weight: 600; font-size: 8.5px; padding: 8px 4px;
      text-align: center; text-transform: uppercase; letter-spacing: 0.5px; border: none;
    }
    th.name-col { text-align: left; padding-left: 14px; min-width: 130px; font-size: 9px; }
    th.total-col { background: rgba(255,255,255,0.1); }

    td {
      border: 1px solid #f0eeeb; padding: 5px 3px; text-align: center;
      font-size: 9px; vertical-align: middle; transition: background 0.2s;
    }
    td.name-cell {
      text-align: left; padding-left: 14px; font-weight: 700; font-size: 10.5px;
      background: #f8f9fc; border-left: 4px solid #0f3460; color: #1a1a2e;
    }
    td.total-cell { font-weight: 800; font-size: 12px; background: #eef2ff; color: #0f3460; }

    .weekend { background: #f5f5f7; color: #aaa; }
    .present { background: #e8f8ef; color: #1b7a43; }
    .injury { background: #fff8e1; color: #b8860b; }
    .sick { background: #fef0f0; color: #c0392b; }
    .holiday { background: #e8f0fe; color: #2563eb; }

    .hours { font-weight: 700; font-size: 11px; display: block; color: inherit; }
    .location { font-size: 7px; color: #999; display: block; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-badge { font-size: 7.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }

    .day-header { font-size: 7.5px; display: block; font-weight: 400; opacity: 0.65; text-transform: uppercase; }
    .day-num { font-size: 11px; display: block; font-weight: 700; }

    tbody tr:nth-child(even) td:not(.name-cell):not(.total-cell) { background-color: rgba(0,0,0,0.012); }
    tbody tr:hover td { background-color: rgba(15,52,96,0.04) !important; }

    .summary { margin-top: 16px; }
    .summary h2 {
      font-size: 14px; font-weight: 800; color: #1a1a2e; margin-bottom: 12px;
      padding-bottom: 6px; border-bottom: 3px solid #0f3460; display: inline-block;
    }
    .summary-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .summary-card {
      border: 1px solid #e8e8ee; border-radius: 10px; padding: 12px 16px;
      min-width: 210px; flex: 1; background: linear-gradient(135deg, #f8f9fc 0%, #fff 100%);
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .summary-card h3 { font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #1a1a2e; }
    .summary-card .stat { display: inline-block; margin-right: 14px; font-size: 10px; color: #555; }
    .summary-card .stat strong { font-size: 15px; color: #0f3460; display: block; line-height: 1.2; }
    .summary-card .locations { margin-top: 6px; font-size: 9px; color: #888; }
  </style></head><body>`;

  // Header
  html += `<div class="header">
    <div>
      <h1>${companyName}</h1>
      <div class="subtitle">Registro Presenze Dipendenti</div>
    </div>
    <div class="date-info">${MONTHS_IT[month]} ${year}<br/>Generato il ${format(new Date(), 'dd/MM/yyyy')}</div>
  </div>`;

  // Main attendance table
  html += `<table><thead><tr><th class="name-col">Dipendente</th>`;
  days.forEach(d => {
    const we = isWeekend(d) ? ' class="weekend"' : '';
    html += `<th${we}><span class="day-header">${format(d, 'EEE', { locale: it }).slice(0, 2)}</span><span class="day-num">${format(d, 'd')}</span></th>`;
  });
  html += `<th class="total-col">Tot. Ore</th></tr></thead><tbody>`;

  employees.forEach(emp => {
    html += `<tr><td class="name-cell">${emp.name}</td>`;
    let total = 0;
    days.forEach(d => {
      const key = dateKey(d);
      const entry = emp.days[key];
      const we = isWeekend(d);
      let cls = '';
      let statusLabel = '';
      if (entry?.status === 'present') { cls = 'present'; }
      else if (entry?.status === 'injury') { cls = 'injury'; statusLabel = 'INF'; }
      else if (entry?.status === 'sick') { cls = 'sick'; statusLabel = 'MAL'; }
      else if (entry?.status === 'holiday') { cls = 'holiday'; statusLabel = 'FES'; }
      else if (we) { cls = 'weekend'; }

      const hoursStr = entry?.hours ? `<span class="hours">${entry.hours}</span>` : '';
      const locStr = entry?.location ? `<span class="location" title="${entry.location}">${entry.location}</span>` : '';
      const badgeStr = statusLabel && !entry?.hours ? `<span class="status-badge">${statusLabel}</span>` : '';
      
      html += `<td class="${cls}">${hoursStr}${badgeStr}${locStr}</td>`;
      total += entry?.hours || 0;
    });
    html += `<td class="total-cell">${total}</td></tr>`;
  });
  html += `</tbody></table>`;

  // Summary section
  html += `<div class="summary"><h2>Riepilogo</h2><div class="summary-grid">`;
  employees.forEach(emp => {
    let totalHours = 0, presentDays = 0, injuryDays = 0, sickDays = 0;
    const locationCount: Record<string, number> = {};
    days.forEach(d => {
      const entry = emp.days[dateKey(d)];
      if (entry) {
        totalHours += entry.hours;
        if (entry.status === 'present') presentDays++;
        if (entry.status === 'injury') injuryDays++;
        if (entry.status === 'sick') sickDays++;
        if (entry.location?.trim()) {
          const loc = entry.location.trim();
          locationCount[loc] = (locationCount[loc] || 0) + 1;
        }
      }
    });
    const locs = Object.entries(locationCount).sort((a, b) => b[1] - a[1]);
    html += `<div class="summary-card">
      <h3>${emp.name}</h3>
      <div>
        <span class="stat"><strong>${totalHours}</strong> ore</span>
        <span class="stat"><strong>${presentDays}</strong> pres.</span>
        <span class="stat"><strong>${injuryDays}</strong> infor.</span>
        <span class="stat"><strong>${sickDays}</strong> mal.</span>
      </div>
      ${locs.length > 0 ? `<div class="locations">📍 ${locs.map(([l, c]) => `${l} (${c}g)`).join(' · ')}</div>` : ''}
    </div>`;
  });
  html += `</div></div>`;

  html += `</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}
