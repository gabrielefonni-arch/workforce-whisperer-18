import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(100, 'Nome troppo lungo').trim(),
});

export const dayEntrySchema = z.object({
  status: z.enum(['present', 'injury', 'sick', 'holiday', '']),
  hours: z.number().min(0, 'Ore non valide').max(24, 'Ore non valide'),
  location: z.string().max(200, 'Località troppo lunga').optional().default(''),
  date_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
});
