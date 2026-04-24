import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAGAMENTO_METODO_VALUES = [
  'PIX',
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'BOLETO',
  'TRANSFERENCIA',
  'OUTRO',
] as const;

export const STATUS_PAGAMENTO_VALUES = [
  'PENDENTE',
  'PARCIAL',
  'PAGO',
  'VENCIDO',
] as const;

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Validates a single "Registrar pagamento" submission.
 * The `data` field is accepted as an ISO string or Date and coerced to a Date.
 * Future dates are rejected (matches Conta Azul's baixa-parcial behavior:
 * the informed date of receipt must be ≤ today).
 */
export const createPagamentoSchema = z.object({
  data: z
    .union([z.string(), z.date()])
    .transform((value, ctx) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Data inválida' });
        return z.NEVER;
      }
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (d.getTime() > endOfToday.getTime()) {
        ctx.addIssue({ code: 'custom', message: 'Data não pode ser futura' });
        return z.NEVER;
      }
      return d;
    }),
  valor: z
    .number()
    .positive('Valor deve ser maior que zero')
    .max(9_999_999.99, 'Valor muito alto'),
  metodo: z.enum(PAGAMENTO_METODO_VALUES),
  observacao: z
    .string()
    .max(500, 'Observação deve ter no máximo 500 caracteres')
    .optional(),
});

export type CreatePagamentoValidation = z.infer<typeof createPagamentoSchema>;

/**
 * Validates an update to the pedido's due date (data de vencimento).
 */
export const updateVencimentoSchema = z.object({
  dataVencimento: z
    .union([z.string(), z.date()])
    .transform((value, ctx) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'Data inválida' });
        return z.NEVER;
      }
      return d;
    }),
});

export type UpdateVencimentoValidation = z.infer<typeof updateVencimentoSchema>;
