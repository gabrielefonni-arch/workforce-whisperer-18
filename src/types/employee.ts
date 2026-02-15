export type DayStatus = 'present' | 'absent' | 'half' | 'holiday' | '';

export interface DayEntry {
  status: DayStatus;
  hours: number;
  note?: string;
}

export interface Employee {
  id: string;
  name: string;
  days: Record<string, DayEntry>; // key: "YYYY-MM-DD"
}

export interface EmployeeData {
  employees: Employee[];
}
