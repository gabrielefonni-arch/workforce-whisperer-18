const items = [
  { label: 'Presente', className: 'bg-success/20 border-success/40' },
  { label: 'Mezza giornata', className: 'bg-warning/20 border-warning/40' },
  { label: 'Assente', className: 'bg-absence/20 border-absence/40' },
  { label: 'Festivo', className: 'bg-info/20 border-info/40' },
];

export function Legend() {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className={`w-3 h-3 rounded-sm border ${i.className}`} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
