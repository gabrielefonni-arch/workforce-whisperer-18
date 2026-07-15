import { useCompany } from '@/contexts/CompanyContext';
import { Building2 } from 'lucide-react';

export function CompanySelector() {
  const { currentSection, setSection, sections } = useCompany();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10">
      {sections.map(s => {
        const active = s.id === currentSection.id;
        return (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              active
                ? 'bg-primary-foreground text-primary shadow-md'
                : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
            }`}
          >
            <Building2 className="h-3 w-3" />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
