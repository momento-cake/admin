import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared constants and enums for validation
// ---------------------------------------------------------------------------

const MARKING_TYPES = ['clock_in', 'lunch_out', 'lunch_in', 'clock_out'] as const;
const MARKING_SOURCES = ['clock', 'manual'] as const;
const TIME_ENTRY_STATUSES = ['incomplete', 'complete', 'absent', 'justified_absence', 'day_off'] as const;
const AUDIT_ACTIONS = ['create', 'update', 'delete', 'manual_create', 'manual_update'] as const;
const LUNCH_COMPENSATIONS = ['late_entry', 'early_exit', 'weekly_off', 'payment_55'] as const;
const HOLIDAY_TYPES = ['national', 'state', 'municipal'] as const;

/** Minimum hourly rate per CCT Panificacao SP */
const MIN_HOURLY_RATE = 9.68;
/** Minimum lunch break in minutes (CCT SP) */
const MIN_LUNCH_BREAK = 30;

// ---------------------------------------------------------------------------
// Geolocation schema
// ---------------------------------------------------------------------------

const geolocationSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude deve ser entre -90 e 90')
    .max(90, 'Latitude deve ser entre -90 e 90'),
  longitude: z.number()
    .min(-180, 'Longitude deve ser entre -180 e 180')
    .max(180, 'Longitude deve ser entre -180 e 180'),
  accuracy: z.number()
    .min(0, 'Precisao deve ser um valor positivo'),
  capturedAt: z.coerce.date({ error: 'Data de captura e obrigatoria' }),
});

// ---------------------------------------------------------------------------
// Clock Operation Schema
// ---------------------------------------------------------------------------

/**
 * Validates clock in/out requests from the employee clock widget.
 */
export const clockOperationSchema = z.object({
  type: z.enum(MARKING_TYPES, {
    error: 'Tipo de marcacao invalido',
  }),
  geolocation: geolocationSchema.optional(),
});

// ---------------------------------------------------------------------------
// Time Entry Update Schema
// ---------------------------------------------------------------------------

/**
 * Validates manual edits to time entries (admin operations).
 * Reason field is mandatory for audit trail compliance (Portaria 671).
 */
export const timeEntryUpdateSchema = z.object({
  markings: z.array(
    z.object({
      id: z.string().min(1, 'ID da marcacao e obrigatorio'),
      type: z.enum(MARKING_TYPES, {
        error: 'Tipo de marcacao invalido',
      }),
      timestamp: z.coerce.date({ error: 'Horario da marcacao e obrigatorio' }),
      source: z.enum(MARKING_SOURCES).default('manual'),
      geolocation: geolocationSchema.optional(),
      originalTimestamp: z.coerce.date().optional(),
      createdAt: z.coerce.date().optional(),
      createdBy: z.string().optional(),
    })
  ).optional(),
  summary: z.object({
    status: z.enum(TIME_ENTRY_STATUSES, {
      error: 'Status invalido',
    }),
  }).optional(),
  reason: z.string()
    .min(1, 'Motivo da alteracao e obrigatorio')
    .max(500, 'Motivo deve ter no maximo 500 caracteres'),
});

// ---------------------------------------------------------------------------
// Work Schedule Schema
// ---------------------------------------------------------------------------

const dayScheduleSchema = z.object({
  isWorkDay: z.boolean(),
  expectedStart: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario deve estar no formato HH:mm')
    .optional(),
  expectedEnd: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horario deve estar no formato HH:mm')
    .optional(),
  expectedBreakMinutes: z.number()
    .min(MIN_LUNCH_BREAK, `Intervalo minimo de almoco e ${MIN_LUNCH_BREAK} minutos`)
    .optional(),
}).refine(
  (data) => {
    if (data.isWorkDay) {
      return !!data.expectedStart && !!data.expectedEnd;
    }
    return true;
  },
  { message: 'Dias uteis devem ter horario de inicio e fim definidos' }
);

/**
 * Validates work schedule CRUD operations.
 */
export const workScheduleSchema = z.object({
  name: z.string()
    .min(1, 'Nome da escala e obrigatorio')
    .max(100, 'Nome da escala deve ter no maximo 100 caracteres')
    .trim(),
  userId: z.string()
    .min(1, 'ID do funcionario e obrigatorio'),
  hourlyRate: z.number()
    .min(MIN_HOURLY_RATE, `Valor hora minimo e R$ ${MIN_HOURLY_RATE.toFixed(2)} conforme CCT`),
  weeklySchedule: z.record(
    z.string().regex(/^[0-6]$/, 'Dia da semana deve ser de 0 a 6'),
    dayScheduleSchema
  ).refine(
    (schedule) => {
      const days = Object.keys(schedule).map(Number);
      return days.length === 7 && [0, 1, 2, 3, 4, 5, 6].every(d => days.includes(d));
    },
    { message: 'A escala deve definir todos os 7 dias da semana (0=Domingo a 6=Sabado)' }
  ),
  lunchBreakMinimum: z.number()
    .min(MIN_LUNCH_BREAK, `Intervalo minimo de almoco e ${MIN_LUNCH_BREAK} minutos`),
  lunchCompensation: z.enum(LUNCH_COMPENSATIONS, {
    error: 'Tipo de compensacao de almoco invalido',
  }),
  effectiveFrom: z.coerce.date({ error: 'Data de inicio e obrigatoria' }),
  effectiveTo: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.effectiveTo) {
      return data.effectiveTo > data.effectiveFrom;
    }
    return true;
  },
  {
    message: 'Data de termino deve ser posterior a data de inicio',
    path: ['effectiveTo'],
  }
);

// ---------------------------------------------------------------------------
// Workplace Location Schema
// ---------------------------------------------------------------------------

/**
 * Validates workplace location CRUD operations.
 */
export const workplaceLocationSchema = z.object({
  name: z.string()
    .min(1, 'Nome do local e obrigatorio')
    .max(100, 'Nome do local deve ter no maximo 100 caracteres')
    .trim(),
  address: z.string()
    .min(1, 'Endereço é obrigatório')
    .max(300, 'Endereço deve ter no máximo 300 caracteres')
    .trim(),
  latitude: z.number()
    .min(-90, 'Latitude deve ser entre -90 e 90')
    .max(90, 'Latitude deve ser entre -90 e 90'),
  longitude: z.number()
    .min(-180, 'Longitude deve ser entre -180 e 180')
    .max(180, 'Longitude deve ser entre -180 e 180'),
  radiusMeters: z.number()
    .min(10, 'Raio minimo e 10 metros')
    .max(10000, 'Raio maximo e 10.000 metros'),
  isActive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Holiday Schema
// ---------------------------------------------------------------------------

/**
 * Validates holiday CRUD operations.
 */
export const holidaySchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD'),
  name: z.string()
    .min(1, 'Nome do feriado e obrigatorio')
    .max(100, 'Nome do feriado deve ter no maximo 100 caracteres')
    .trim(),
  type: z.enum(HOLIDAY_TYPES, {
    error: 'Tipo de feriado invalido',
  }),
  year: z.number()
    .int('Ano deve ser um numero inteiro')
    .min(2020, 'Ano deve ser 2020 ou posterior')
    .max(2100, 'Ano deve ser anterior a 2100'),
});

// ---------------------------------------------------------------------------
// Audit Log Schema
// ---------------------------------------------------------------------------

const auditChangeSchema = z.object({
  field: z.string().min(1, 'Campo alterado e obrigatorio'),
  oldValue: z.unknown(),
  newValue: z.unknown(),
});

/**
 * Validates audit log entries (created by the system, immutable).
 */
export const auditLogSchema = z.object({
  timeEntryId: z.string().min(1, 'ID do registro de ponto e obrigatorio'),
  userId: z.string().min(1, 'ID do funcionario e obrigatorio'),
  performedBy: z.string().min(1, 'ID do executor e obrigatorio'),
  performedByName: z.string().min(1, 'Nome do executor e obrigatorio'),
  action: z.enum(AUDIT_ACTIONS, {
    error: 'Tipo de acao invalido',
  }),
  changes: z.array(auditChangeSchema)
    .min(1, 'Pelo menos uma alteracao deve ser registrada'),
  reason: z.string()
    .max(500, 'Motivo deve ter no maximo 500 caracteres')
    .optional(),
});

// ---------------------------------------------------------------------------
// Type exports inferred from schemas
// ---------------------------------------------------------------------------

export type ClockOperationData = z.infer<typeof clockOperationSchema>;
export type TimeEntryUpdateData = z.infer<typeof timeEntryUpdateSchema>;
export type WorkScheduleData = z.infer<typeof workScheduleSchema>;
export type WorkplaceLocationData = z.infer<typeof workplaceLocationSchema>;
export type HolidayData = z.infer<typeof holidaySchema>;
export type AuditLogData = z.infer<typeof auditLogSchema>;
