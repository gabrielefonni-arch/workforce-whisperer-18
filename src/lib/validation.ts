import { z } from 'zod';

export const appointmentSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(100, 'Nome troppo lungo').trim(),
  address: z.string().max(200, 'Indirizzo troppo lungo').trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato ora non valido'),
  status: z.enum(['pending', 'done', 'cancelled', 'forgotten']),
  notes: z.string().max(1000, 'Note troppo lunghe').optional().default(''),
});

export const appointmentUpdateSchema = appointmentSchema.partial();

export const employeeSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(100, 'Nome troppo lungo').trim(),
});

export const dayEntrySchema = z.object({
  status: z.enum(['present', 'injury', 'sick', 'holiday', '']),
  hours: z.number().min(0, 'Ore non valide').max(24, 'Ore non valide'),
  location: z.string().max(200, 'Località troppo lunga').optional().default(''),
  date_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
});
