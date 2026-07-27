import { z } from 'zod';

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * ISO YYYY-MM-DD date that is also a real calendar date. Rejects malformed
 * strings (e.g. "15/01/2025") and impossible dates (e.g. "2025-13-40").
 */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    );
  }, 'Data inválida');

const mesStatusEnum = z.enum([
  'PENDENTE',
  'EM_CONTATO',
  'ACORDADO',
  'PEDIDO_CRIADO',
  'ENTREGUE',
  'PULADO',
]);

const mesversarioStatusEnum = z.enum(['ATIVO', 'CONCLUIDO', 'CANCELADO']);

/**
 * Reference image on an acordo. Mirrors `pedidoImagemReferenciaSchema` — the
 * client sends url/storagePath (+ optional caption/dimensions); the server
 * stamps id/uploadedAt/uploadedBy.
 */
export const acordoImagemReferenciaSchema = z.object({
  id: z.string().optional(),
  url: z.string().url('URL inválida'),
  storagePath: z.string().min(1, 'Caminho do arquivo é obrigatório'),
  legenda: z.string().max(200, 'Legenda deve ter no máximo 200 caracteres').optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  uploadedAt: z.any().optional(),
  uploadedBy: z.string().optional(),
});

export const acordoSchema = z.object({
  tema: z.string().max(200, 'Tema deve ter no máximo 200 caracteres').optional(),
  sabor: z.string().max(200, 'Sabor deve ter no máximo 200 caracteres').optional(),
  notas: z.string().max(2000, 'Notas muito longas').optional(),
  imagensReferencia: z
    .array(acordoImagemReferenciaSchema)
    .max(30, 'Máximo de 30 imagens de referência')
    .optional(),
});

// ============================================================================
// CREATE / UPDATE SCHEMAS
// ============================================================================

export const createMesversarioSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
  clienteTelefone: z.string().optional(),
  relatedPersonId: z.string().min(1, 'Bebê é obrigatório'),
  bebeNome: z.string().min(1, 'Nome do bebê é obrigatório'),
  dataNascimento: isoDateSchema,
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
});

export const updateMesversarioSchema = z.object({
  bebeNome: z.string().min(1, 'Nome do bebê é obrigatório').max(120, 'Nome muito longo').optional(),
  dataNascimento: isoDateSchema.optional(),
  status: mesversarioStatusEnum.optional(),
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
});

/**
 * Update a single month: status/acordo/observacoes plus an optional pedido
 * link. When pedidoId/pedidoNumero are present the route moves the month to
 * PEDIDO_CRIADO and stamps the back-reference onto the pedido. When
 * `desvincular` is true the route clears the month's link (back to ACORDADO)
 * and strips the back-reference off the previously-linked pedido.
 */
export const updateMesSchema = z.object({
  status: mesStatusEnum.optional(),
  acordo: acordoSchema.optional(),
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
  pedidoId: z.string().optional(),
  pedidoNumero: z.string().optional(),
  desvincular: z.boolean().optional(),
});

export const linkPedidoSchema = z.object({
  pedidoId: z.string().min(1, 'Pedido é obrigatório'),
  pedidoNumero: z.string().min(1, 'Número do pedido é obrigatório'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateMesversarioValidation = z.infer<typeof createMesversarioSchema>;
export type UpdateMesversarioValidation = z.infer<typeof updateMesversarioSchema>;
export type UpdateMesValidation = z.infer<typeof updateMesSchema>;
export type AcordoValidation = z.infer<typeof acordoSchema>;
export type LinkPedidoValidation = z.infer<typeof linkPedidoSchema>;
