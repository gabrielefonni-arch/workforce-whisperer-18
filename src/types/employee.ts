export type DayStatus = 'present' | 'injury' | 'sick' | 'holiday' | '';

export interface DayEntry {
  status: DayStatus;
  hours: number;
  location?: string;
}

export interface Employee {
  id: string;
  name: string;
  days: Record<string, DayEntry>; // key: "YYYY-MM-DD"
}

export interface EmployeeData {
  employees: Employee[];
}
