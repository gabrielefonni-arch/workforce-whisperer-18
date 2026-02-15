import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey, MONTHS_IT, isWeekend } from './dateUtils';
import { format } from 'date-fns';

export function exportToPDF(employees: Employee[], year: number, month: number) {
  const days = getDaysInMonth(year, month);

  let html = `<html><head><style>
    body { font-family: Arial, sans-serif; font-size: 9px; margin: 15px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    h2 { font-size: 12px; color: #666; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th, td { border: 1px solid #ccc; padding: 2px 4px; text-align: center; }
    th { background: #f0f0f0; font-weight: 600; }
    .weekend { background: #f5f0e8; }
    .present { background: #d1fae5; }
    .injury { background: #fef3c7; }
    .sick { background: #fee2e2; }
    .holiday { background: #dbeafe; }
    .loc { font-size: 7px; color: #888; }
  </style></head><body>`;

  html += `<h1>Edilrestrutturazioni – Presenze</h1>`;
  html += `<h2>${MONTHS_IT[month]} ${year}</h2>`;
  html += `<table><thead><tr><th>Dipendente</th>`;

  days.forEach(d => {
    html += `<th class="${isWeekend(d) ? 'weekend' : ''}">${format(d, 'd')}</th>`;
  });
  html += `<th>Tot</th></tr></thead><tbody>`;

  employees.forEach(emp => {
    html += `<tr><td style="text-align:left;font-weight:600">${emp.name}</td>`;
    let total = 0;
    days.forEach(d => {
      const key = dateKey(d);
      const entry = emp.days[key];
      const cls = entry?.status || (isWeekend(d) ? 'weekend' : '');
      const loc = entry?.location ? `<br/><span class="loc">${entry.location}</span>` : '';
      html += `<td class="${cls}">${entry?.hours || ''}${loc}</td>`;
      total += entry?.hours || 0;
    });
    html += `<td style="font-weight:700">${total}</td></tr>`;
  });

  html += `</tbody></table></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
}
