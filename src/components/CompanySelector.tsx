import { useCompany } from '@/contexts/CompanyContext';

export function CompanySelector() {
  const { currentCompany, setCompany, companies } = useCompany();

  return (
    <div className="flex gap-1">
      {companies.map(c => (
        <button
          key={c.id}
          onClick={() => setCompany(c.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            c.id === currentCompany.id
              ? 'bg-primary-foreground text-primary shadow-sm'
              : 'bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
