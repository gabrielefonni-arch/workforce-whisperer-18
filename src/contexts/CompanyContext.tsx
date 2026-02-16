import { createContext, useContext, useState, type ReactNode } from 'react';

export interface AppSection {
  id: string;
  name: string;
  type: 'company' | 'appointments';
  storageKey: string;
  themeClass: string;
}

export const SECTIONS: AppSection[] = [
  {
    id: 'edilristrutturazioni',
    name: 'Edilristrutturazioni',
    type: 'company',
    storageKey: 'edilrestrutturazioni_data',
    themeClass: '',
  },
  {
    id: 'ditta2',
    name: 'Edilristrutturazioni ditta 2',
    type: 'company',
    storageKey: 'edilristrutturazioni_ditta2_data',
    themeClass: 'theme-ditta2',
  },
  {
    id: 'appuntamenti',
    name: 'Appuntamenti',
    type: 'appointments',
    storageKey: 'edilristrutturazioni_appuntamenti',
    themeClass: 'theme-appuntamenti',
  },
];

interface SectionContextValue {
  currentSection: AppSection;
  setSection: (id: string) => void;
  sections: AppSection[];
}

const SectionContext = createContext<SectionContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  const currentSection = SECTIONS.find(s => s.id === sectionId) || SECTIONS[0];

  return (
    <SectionContext.Provider
      value={{
        currentSection,
        setSection: setSectionId,
        sections: SECTIONS,
      }}
    >
      {children}
    </SectionContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useCompany must be inside CompanyProvider');
  return {
    currentCompany: ctx.currentSection,
    setCompany: ctx.setSection,
    companies: ctx.sections,
    currentSection: ctx.currentSection,
    setSection: ctx.setSection,
    sections: ctx.sections,
  };
}
