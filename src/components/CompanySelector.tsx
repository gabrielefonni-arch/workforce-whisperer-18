import { useCompany } from '@/contexts/CompanyContext';
import { Calendar } from 'lucide-react';

export function CompanySelector() {
  const { currentSection, setSection, sections } = useCompany();

  return (
    <div className="flex gap-1 flex-wrap">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => setSection(s.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
            s.id === currentSection.id
              ? 'bg-primary-foreground text-primary shadow-sm'
              : 'bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20'
          }`}
        >
          {s.type === 'appointments' && <Calendar className="h-3 w-3" />}
          {s.name}
        </button>
      ))}
    </div>
  );
}
