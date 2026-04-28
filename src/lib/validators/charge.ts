import { z } from 'zod';

export const createPixChargeSchema = z.object({});

export const createCardChargeSchema = z.object({
  card: z.object({
    number: z
      .string()
      .transform((v) => v.replace(/\s+/g, ''))
      .refine((v) => /^\d{13,19}$/.test(v), { message: 'Número de cartão inválido' }),
    holderName: z.string().trim().min(2, 'Nome no cartão é obrigatório').max(100),
    expiryMonth: z
      .string()
      .regex(/^(0[1-9]|1[0-2])$/, 'Mês de validade inválido'),
    expiryYear: z
      .string()
      .regex(/^\d{4}$/, 'Ano de validade inválido (use AAAA)'),
    cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
  }),
});

export type CreateCardChargeInput = z.infer<typeof createCardChargeSchema>;
