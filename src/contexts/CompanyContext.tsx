import { createContext, useContext, useState, type ReactNode } from 'react';

export interface Company {
  id: string;
  name: string;
  storageKey: string;
  themeClass: string; // CSS class to apply on body
}

export const COMPANIES: Company[] = [
  {
    id: 'edilristrutturazioni',
    name: 'Edilristrutturazioni',
    storageKey: 'edilrestrutturazioni_data',
    themeClass: '',
  },
  {
    id: 'ditta2',
    name: 'Edilristrutturazioni ditta 2',
    storageKey: 'edilristrutturazioni_ditta2_data',
    themeClass: 'theme-ditta2',
  },
];

interface CompanyContextValue {
  currentCompany: Company;
  setCompany: (id: string) => void;
  companies: Company[];
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const currentCompany = COMPANIES.find(c => c.id === companyId) || COMPANIES[0];

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        setCompany: setCompanyId,
        companies: COMPANIES,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be inside CompanyProvider');
  return ctx;
}
