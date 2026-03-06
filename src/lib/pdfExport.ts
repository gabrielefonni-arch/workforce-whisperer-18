import type { Employee } from '@/types/employee';
import { getDaysInMonth, dateKey, MONTHS_IT, isWeekend } from './dateUtils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

// Brand palettes per azienda
const BRANDS: Record<string, {
  primary: string; primaryDark: string; primaryLight: string;
  accent: string; accentLight: string;
  headerGrad: string; tableHeadGrad: string;
  nameBorder: string; totalBg: string; totalColor: string;
  summaryAccent: string;
}> = {
  'edilristrutturazioni': {
    primary:       '#b45309',
    primaryDark:   '#92400e',
    primaryLight:  '#fef3c7',
    accent:        '#d97706',
    accentLight:   '#fffbeb',
    headerGrad:    'linear-gradient(135deg, #1c0a00 0%, #451a03 50%, #78350f 100%)',
    tableHeadGrad: 'linear-gradient(135deg, #451a03, #78350f)',
    nameBorder:    '#b45309',
    totalBg:       '#fef3c7',
    totalColor:    '#92400e',
    summaryAccent: '#b45309',
  },
  'ditta2': {
    primary:       '#1d4ed8',
    primaryDark:   '#1e3a8a',
    primaryLight:  '#dbeafe',
    accent:        '#0ea5e9',
    accentLight:   '#f0f9ff',
    headerGrad:    'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
    tableHeadGrad: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
    nameBorder:    '#1d4ed8',
    totalBg:       '#dbeafe',
    totalColor:    '#1e3a8a',
    summaryAccent: '#1d4ed8',
  },
};

function getBrand(companyId: string) {
  return BRANDS[companyId] || BRANDS['edilristrutturazioni'];
}

export function exportToPDF(
  employees: Employee[],
  year: number,
  month: number,
  companyName: string = 'Edilristrutturazioni',
  companyId: string = 'edilristrutturazioni'
) {
  const days = getDaysInMonth(year, month);
  const b = getBrand(companyId);
  const totalWorkDays = days.filter(d => !isWeekend(d)).length;

  // ── Pre-compute stats ──────────────────────────────────────────────
  type EmpStats = {
    totalHours: number; presentDays: number; injuryDays: number;
    sickDays: number; holidayDays: number; absenceDays: number;
    locations: [string, number][];
  };
  const stats: Record<string, EmpStats> = {};
  employees.forEach(emp => {
    let totalHours = 0, presentDays = 0, injuryDays = 0, sickDays = 0, holidayDays = 0;
    const locationCount: Record<string, number> = {};
    days.forEach(d => {
      const entry = emp.days[dateKey(d)];
      if (!entry) return;
      totalHours += entry.hours;
      if (entry.status === 'present')  presentDays++;
      if (entry.status === 'injury')   injuryDays++;
      if (entry.status === 'sick')     sickDays++;
      if (entry.status === 'holiday')  holidayDays++;
      if (entry.location?.trim()) {
        const loc = entry.location.trim();
        locationCount[loc] = (locationCount[loc] || 0) + 1;
      }
    });
    const absenceDays = totalWorkDays - presentDays - injuryDays - sickDays - holidayDays;
    stats[emp.id] = {
      totalHours, presentDays, injuryDays, sickDays, holidayDays,
      absenceDays: Math.max(0, absenceDays),
      locations: Object.entries(locationCount).sort((a, b) => b[1] - a[1]),
    };
  });

  // ── Build location abbreviation map ────────────────────────────────
  const allLocations = new Set<string>();
  employees.forEach(emp => {
    days.forEach(d => {
      const entry = emp.days[dateKey(d)];
      if (entry?.location?.trim()) allLocations.add(entry.location.trim());
    });
  });
  const locAbbrevMap: Record<string, string> = {};
  let locIndex = 1;
  Array.from(allLocations).sort().forEach(loc => {
    locAbbrevMap[loc] = `L${locIndex}`;
    locIndex++;
  });

  // ── Totals row ─────────────────────────────────────────────────────
  const grandTotalHours = employees.reduce((s, e) => s + stats[e.id].totalHours, 0);

  // ── HTML ───────────────────────────────────────────────────────────
  let html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
  <meta name="viewport" content="width=1024">
  <title>Presenze ${escapeHtml(companyName)} – ${MONTHS_IT[month]} ${year}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    *  { box-sizing: border-box; margin:0; padding:0;
         -webkit-print-color-adjust:exact!important;
         print-color-adjust:exact!important; color-adjust:exact!important; }
    html { width:100%; }
    body { font-family:'Segoe UI',Arial,sans-serif; font-size:9px;
           color:#1a1a1a; background:#fff; width:100%;
           min-width:1000px; max-width:1200px; margin:0 auto; padding:8px; }
    @media print {
      * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
      html, body { width:100%; min-width:0; max-width:none; padding:0; margin:0; }
      .no-print { display:none!important; }
      .summary-grid { page-break-inside:avoid; }
      .summary-card { page-break-inside:avoid; }
    }

    /* ── HEADER ── */
    .header {
      display:flex; justify-content:space-between; align-items:center;
      padding:0 20px; margin-bottom:16px;
      background:${b.headerGrad}; border-radius:10px; color:#fff;
      height:68px; min-height:68px; max-height:68px; overflow:hidden;
    }
    .header-left { display:flex; align-items:center; gap:14px; flex:1; min-width:0; overflow:hidden; }
    .header-logo {
      width:44px; height:44px; min-width:44px; max-width:44px; border-radius:8px;
      background:rgba(255,255,255,0.15); display:flex; align-items:center;
      justify-content:center; font-size:20px; font-weight:900; color:#fff;
      letter-spacing:-1px; border:2px solid rgba(255,255,255,0.25); flex-shrink:0;
    }
    .header-text { min-width:0; overflow:hidden; }
    .header h1  { font-size:15px; font-weight:900; letter-spacing:0.3px; line-height:1.2;
                  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0; }
    .header .sub { font-size:9px; opacity:0.7; font-weight:400; margin-top:2px;
                   white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .header-right { text-align:right; font-size:10px; line-height:1.6; opacity:0.85;
                    flex-shrink:0; white-space:nowrap; }
    .header-right strong { font-size:15px; font-weight:800; display:block; white-space:nowrap; }
    .header-right small { font-size:9px; opacity:0.7; white-space:nowrap; }

    /* ── SECTION LABEL ── */
    .section-label {
      font-size:10px; font-weight:700; text-transform:uppercase;
      letter-spacing:0.8px; color:${b.primary}; margin-bottom:6px;
      padding-left:2px; border-left:3px solid ${b.accent}; padding-left:8px;
    }

    /* ── MAIN TABLE ── */
    table { border-collapse:collapse; width:100%; margin-bottom:18px;
            border-radius:8px; overflow:hidden;
            box-shadow:0 2px 10px rgba(0,0,0,0.08);
            table-layout:fixed; }
    thead tr { background:${b.tableHeadGrad}; }
    th {
      color:#fff; font-weight:700; font-size:7px; padding:5px 1px;
      text-align:center; text-transform:uppercase; letter-spacing:0;
      overflow:hidden;
    }
    th.col-name   { text-align:left; padding-left:8px; width:100px; font-size:7.5px; }
    th.col-total  { background:rgba(255,255,255,0.18); width:36px; }
    th.col-we     { background:rgba(0,0,0,0.15); }

    td {
      border-bottom:1px solid #f0eeea; border-right:1px solid #f5f3f0;
      padding:3px 1px; text-align:center; font-size:8px; vertical-align:middle;
      overflow:hidden;
    }
    td.col-name {
      text-align:left; padding-left:8px; font-weight:700; font-size:8px;
      background:#fafafa; border-left:3px solid ${b.nameBorder}; color:#111;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    td.col-total {
      font-weight:900; font-size:11px; background:${b.totalBg}; color:${b.totalColor};
      border-left:1px solid rgba(0,0,0,0.08);
    }
    td.col-we     { background:#f7f7f7; color:#bbb; }

    /* status colours */
    td.s-present  { background:#ecfdf5; }
    td.s-injury   { background:#fffbeb; }
    td.s-sick     { background:#fff1f2; }
    td.s-holiday  { background:#eff6ff; }

    .cell-hrs  { font-weight:800; font-size:9px; display:block; line-height:1.2; }
    .cell-hrs.present { color:#15803d; }
    .cell-hrs.injury  { color:#b45309; }
    .cell-hrs.sick    { color:#be123c; }
    .cell-hrs.holiday { color:#1d4ed8; }
    .cell-badge { font-size:6px; font-weight:800; text-transform:uppercase;
                  letter-spacing:0.3px; padding:1px 2px; border-radius:2px; display:inline-block; }
    .badge-injury  { background:#fef3c7; color:#92400e; }
    .badge-sick    { background:#ffe4e6; color:#9f1239; }
    .badge-holiday { background:#dbeafe; color:#1e40af; }

    /* grand-total row */
    tr.grand-total td {
      background:${b.totalBg}; color:${b.totalColor}; font-weight:800;
      font-size:9px; border-top:2px solid ${b.primary};
    }
    tr.grand-total td.col-name { font-size:9.5px; color:${b.primaryDark}; }
    tr.grand-total td.col-total { font-size:13px; }

    /* zebra */
    tbody tr:nth-child(even) td:not(.col-name):not(.col-total) { background-color:rgba(0,0,0,0.009); }

    /* ── SUMMARY ── */
    .summary-title {
      font-size:13px; font-weight:900; color:${b.primaryDark}; margin-bottom:10px;
      padding-bottom:5px; border-bottom:3px solid ${b.primary}; display:inline-block;
    }
    .summary-grid {
      display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;
    }
    @media print {
      .summary-grid { grid-template-columns:repeat(3, 1fr); }
    }
    .summary-card {
      border:1px solid #e8e8ee; border-radius:8px; padding:8px 10px;
      background:linear-gradient(135deg, #fafafa 0%, #fff 100%);
      box-shadow:0 1px 4px rgba(0,0,0,0.04);
      border-top:3px solid ${b.summaryAccent};
      page-break-inside:avoid;
      overflow:hidden;
    }
    .s-card-name { font-size:9px; font-weight:800; margin-bottom:5px; color:#111; }
    .s-card-stats { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px; }
    .s-stat { text-align:center; }
    .s-stat-val {
      font-size:13px; font-weight:900; color:${b.primary}; display:block; line-height:1;
    }
    .s-stat-val.v-present  { color:#15803d; }
    .s-stat-val.v-injury   { color:#b45309; }
    .s-stat-val.v-sick     { color:#be123c; }
    .s-stat-val.v-holiday  { color:#1d4ed8; }
    .s-stat-val.v-absence  { color:#6b7280; }
    .s-stat-lbl { font-size:6.5px; color:#888; text-transform:uppercase; letter-spacing:0.3px; }
    .s-divider  { height:1px; background:#f0f0f0; margin:4px 0; }
    .s-locs     { font-size:7px; color:#666; line-height:1.5; word-break:break-word; }
    .s-locs strong { color:${b.primary}; font-weight:700; }

    /* ── FOOTER ── */
    .footer {
      margin-top:16px; text-align:center; font-size:8px; color:#bbb;
      border-top:1px solid #f0f0f0; padding-top:8px;
    }
  </style></head><body>`;

  // ── HEADER ──────────────────────────────────────────────────────────
  const initials = companyName.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  html += `<div class="header">
    <div class="header-left">
      <div class="header-logo">${initials}</div>
      <div class="header-text">
        <h1>${escapeHtml(companyName)}</h1>
        <div class="sub">Registro Presenze Dipendenti</div>
      </div>
    </div>
    <div class="header-right">
      <strong>${MONTHS_IT[month]} ${year}</strong>
      Giorni lavorativi: ${totalWorkDays} &nbsp;|&nbsp; Dipendenti: ${employees.length}<br/>
      <small>Generato il ${format(new Date(), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}</small>
    </div>
  </div>`;

  // ── MAIN TABLE ───────────────────────────────────────────────────────
  html += `<div class="section-label">Dettaglio Presenze Giornaliere</div>`;
  html += `<table><thead><tr>`;
  html += `<th class="col-name">Dipendente</th>`;

  days.forEach(d => {
    const we = isWeekend(d);
    const dayName = format(d, 'EEE', { locale: it }).slice(0, 2);
    const dayNum  = format(d, 'd');
    html += `<th${we ? ' class="col-we"' : ''}><span style="display:block;font-size:6.5px;opacity:0.7;text-transform:uppercase">${dayName}</span><span style="font-size:11px;font-weight:800">${dayNum}</span></th>`;
  });
  html += `<th class="col-total">TOT.<br/>ORE</th></tr></thead><tbody>`;

  employees.forEach(emp => {
    const s = stats[emp.id];
    html += `<tr><td class="col-name">${escapeHtml(emp.name)}</td>`;
    days.forEach(d => {
      const key = dateKey(d);
      const entry = emp.days[key];
      const we = isWeekend(d);

      if (!entry && we) { html += `<td class="col-we s-holiday"><span class="cell-badge badge-holiday">FES</span></td>`; return; }
      if (!entry)       { html += `<td></td>`; return; }

      const st = entry.status;
      let tdClass = '';
      if (st === 'present') tdClass = 's-present';
      else if (st === 'injury') tdClass = 's-injury';
      else if (st === 'sick') tdClass = 's-sick';
      else if (st === 'holiday') tdClass = 's-holiday';
      else if (we) tdClass = 'col-we';

      let inner = '';
      if (entry.hours) {
        inner += `<span class="cell-hrs ${st}">${entry.hours}</span>`;
      }
      if (st === 'injury' && !entry.hours)  inner += `<span class="cell-badge badge-injury">INF</span>`;
      if (st === 'sick' && !entry.hours)    inner += `<span class="cell-badge badge-sick">MAL</span>`;
      if (st === 'holiday' && !entry.hours) inner += `<span class="cell-badge badge-holiday">FES</span>`;
      // Location removed from cells - shown only in summary cards below

      html += `<td class="${tdClass}">${inner}</td>`;
    });
    html += `<td class="col-total">${s.totalHours}</td></tr>`;
  });

  // Grand total row
  const dayTotals = days.map(d => {
    return employees.reduce((sum, emp) => sum + (emp.days[dateKey(d)]?.hours || 0), 0);
  });
  html += `<tr class="grand-total"><td class="col-name">↳ TOTALE COMPLESSIVO</td>`;
  dayTotals.forEach((t, i) => {
    const we = isWeekend(days[i]);
    html += `<td${we ? ' class="col-we"' : ''}>${t > 0 ? t : ''}</td>`;
  });
  html += `<td class="col-total">${grandTotalHours}</td></tr>`;

  html += `</tbody></table>`;

  // ── SUMMARY ──────────────────────────────────────────────────────────
  html += `<div><span class="summary-title">Riepilogo Mensile per Dipendente</span></div>`;
  html += `<div class="summary-grid">`;

  employees.forEach(emp => {
    const s = stats[emp.id];
    const avgHoursPerDay = s.presentDays > 0 ? (s.totalHours / s.presentDays).toFixed(1) : '–';

    html += `<div class="summary-card">
      <div class="s-card-name">${escapeHtml(emp.name)}</div>
      <div class="s-card-stats">
        <div class="s-stat">
          <span class="s-stat-val">${s.totalHours}</span>
          <span class="s-stat-lbl">Ore Tot.</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val v-present">${s.presentDays}</span>
          <span class="s-stat-lbl">Presenze</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val v-injury">${s.injuryDays}</span>
          <span class="s-stat-lbl">Infortuni</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val v-sick">${s.sickDays}</span>
          <span class="s-stat-lbl">Malattia</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val v-holiday">${s.holidayDays}</span>
          <span class="s-stat-lbl">Festività</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val v-absence">${s.absenceDays}</span>
          <span class="s-stat-lbl">Assenze</span>
        </div>
        <div class="s-stat">
          <span class="s-stat-val" style="font-size:13px">${avgHoursPerDay}</span>
          <span class="s-stat-lbl">Ore/Giorno</span>
        </div>
      </div>
      ${s.locations.length > 0 ? `<div class="s-divider"></div>
      <div class="s-locs">📍 ${s.locations.map(([loc, cnt]) => `<strong>${escapeHtml(loc)}</strong> (${cnt}g)`).join(' &nbsp;·&nbsp; ')}</div>` : ''}
    </div>`;
  });

  // Grand summary card
  const totalPresent  = employees.reduce((s, e) => s + stats[e.id].presentDays, 0);
  const totalInjury   = employees.reduce((s, e) => s + stats[e.id].injuryDays, 0);
  const totalSick     = employees.reduce((s, e) => s + stats[e.id].sickDays, 0);
  const totalHoliday  = employees.reduce((s, e) => s + stats[e.id].holidayDays, 0);
  const totalAbsence  = employees.reduce((s, e) => s + stats[e.id].absenceDays, 0);

  html += `<div class="summary-card" style="grid-column:1/-1;border-top-color:${b.primaryDark};background:linear-gradient(135deg,${b.primaryLight},#fff);">
    <div class="s-card-name" style="color:${b.primaryDark};font-size:10px">📊 RIEPILOGO GENERALE – ${employees.length} DIPENDENTI</div>
    <div class="s-card-stats">
      <div class="s-stat"><span class="s-stat-val" style="font-size:16px">${grandTotalHours}</span><span class="s-stat-lbl">Ore Totali</span></div>
      <div class="s-stat"><span class="s-stat-val v-present">${totalPresent}</span><span class="s-stat-lbl">Presenze</span></div>
      <div class="s-stat"><span class="s-stat-val v-injury">${totalInjury}</span><span class="s-stat-lbl">Infortuni</span></div>
      <div class="s-stat"><span class="s-stat-val v-sick">${totalSick}</span><span class="s-stat-lbl">Malattia</span></div>
      <div class="s-stat"><span class="s-stat-val v-holiday">${totalHoliday}</span><span class="s-stat-lbl">Festività</span></div>
      <div class="s-stat"><span class="s-stat-val v-absence">${totalAbsence}</span><span class="s-stat-lbl">Assenze</span></div>
    </div>
  </div>`;

  html += `</div>`; // summary-grid

  // ── FOOTER ───────────────────────────────────────────────────────────
  html += `<div class="footer">${escapeHtml(companyName)} &nbsp;·&nbsp; ${MONTHS_IT[month]} ${year} &nbsp;·&nbsp; Documento riservato – generato automaticamente il ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>`;

  // ── PRINT BUTTON (mobile-friendly, hidden on print) ─────────────────
  html += `<div class="no-print" style="text-align:center;padding:20px 0;">
    <button onclick="window.print()" style="
      padding:14px 40px; font-size:16px; font-weight:700; border:none; border-radius:8px;
      background:${b.primary}; color:#fff; cursor:pointer; touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    ">📄 Stampa / Salva PDF</button>
  </div>`;

  html += `</body></html>`;

  // iOS Safari doesn't handle window.open + print well.
  // Use a more robust approach: write to a new window, then let user trigger print.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    // On iOS, don't auto-print (it often fails or cuts pages). Show button instead.
    if (!isIOS) {
      setTimeout(() => win.print(), 600);
    }
  }
}
