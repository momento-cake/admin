import { z } from 'zod';

/**
 * WhatsApp text message body. Matches WhatsApp's per-message text limit (4096 chars).
 */
export const sendMessageSchema = z.object({
  text: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, 'Mensagem não pode ser vazia')
        .max(4096, 'Mensagem excede o limite de 4096 caracteres do WhatsApp')
    ),
});

export const linkClientSchema = z.object({
  clientId: z.string().min(1, 'clientId é obrigatório'),
});

export const quickCreateClientSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(2, 'Nome deve ter ao menos 2 caracteres')
        .max(120, 'Nome muito longo')
    ),
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type LinkClientBody = z.infer<typeof linkClientSchema>;
export type QuickCreateClientBody = z.infer<typeof quickCreateClientSchema>;
