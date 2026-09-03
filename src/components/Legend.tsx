const items = [
  { label: 'Presente', className: 'bg-success/20 border-success/40' },
  { label: 'Infortunio', className: 'bg-warning/20 border-warning/40' },
  { label: 'Malattia', className: 'bg-absence/20 border-absence/40' },
  { label: 'Festivo', className: 'bg-info/20 border-info/40' },
];

export function Legend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-card border rounded-full pl-1.5 pr-2.5 py-1 shadow-soft">
          <div className={`w-2.5 h-2.5 rounded-full border ${i.className}`} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
