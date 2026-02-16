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
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
    
    .header { 
      display: flex; justify-content: space-between; align-items: flex-end;
      border-bottom: 3px solid #d97706; padding-bottom: 8px; margin-bottom: 14px;
    }
    .header h1 { font-size: 18px; font-weight: 800; color: #92400e; letter-spacing: -0.3px; }
    .header .subtitle { font-size: 12px; color: #666; font-weight: 500; }
    .header .date-info { font-size: 11px; color: #92400e; font-weight: 700; text-align: right; }

    table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
    th { 
      background: #92400e; color: #fff; font-weight: 700; font-size: 9px;
      padding: 5px 3px; text-align: center; text-transform: uppercase; letter-spacing: 0.3px;
    }
    th.name-col { text-align: left; padding-left: 8px; min-width: 120px; }
    th.total-col { background: #78350f; }
    
    td { 
      border: 1px solid #e5e0d8; padding: 4px 2px; text-align: center; 
      font-size: 9px; vertical-align: middle;
    }
    td.name-cell { 
      text-align: left; padding-left: 8px; font-weight: 700; font-size: 10px;
      background: #fef7ed; border-left: 3px solid #d97706;
    }
    td.total-cell { font-weight: 800; font-size: 11px; background: #fef3c7; }
    
    .weekend { background: #f5f0e8; }
    .present { background: #d1fae5; }
    .injury { background: #fef3c7; }
    .sick { background: #fee2e2; }
    .holiday { background: #dbeafe; }
    
    .hours { font-weight: 700; font-size: 10px; display: block; }
    .location { font-size: 7px; color: #888; display: block; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-badge { font-size: 7px; font-weight: 600; opacity: 0.7; }

    .day-header { font-size: 8px; display: block; font-weight: 400; opacity: 0.7; }
    .day-num { font-size: 10px; display: block; font-weight: 700; }

    /* Summary section */
    .summary { page-break-before: auto; margin-top: 10px; }
    .summary h2 { font-size: 13px; font-weight: 800; color: #92400e; margin-bottom: 8px; border-bottom: 2px solid #d97706; padding-bottom: 4px; }
    .summary-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .summary-card {
      border: 1px solid #e5e0d8; border-radius: 6px; padding: 8px 12px; min-width: 200px; flex: 1;
      background: #fefcf8;
    }
    .summary-card h3 { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
    .summary-card .stat { display: inline-block; margin-right: 12px; font-size: 10px; }
    .summary-card .stat strong { font-size: 13px; }
    .summary-card .locations { margin-top: 4px; font-size: 9px; color: #666; }

    tr:nth-child(even) td:not(.name-cell):not(.total-cell) { background-color: rgba(0,0,0,0.015); }
    tr:hover td { background-color: rgba(217,119,6,0.05) !important; }
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
