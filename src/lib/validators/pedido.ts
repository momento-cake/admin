import { z } from 'zod';

// ============================================================================
// EMBEDDED SCHEMAS
// ============================================================================

/**
 * Pedido item validation — a single line item within an orcamento.
 */
export const pedidoItemSchema = z.object({
  id: z.string().optional(),
  produtoId: z.string().nullable().optional(),
  nome: z.string()
    .min(1, 'Nome do item é obrigatório')
    .max(200, 'Nome do item deve ter no máximo 200 caracteres')
    .trim(),
  descricao: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  precoUnitario: z.number()
    .min(0, 'Preço unitário não pode ser negativo')
    .max(999999.99, 'Preço unitário muito alto'),
  quantidade: z.number()
    .min(0.01, 'Quantidade deve ser maior que 0')
    .max(9999, 'Quantidade muito alta'),
  total: z.number()
    .min(0, 'Total não pode ser negativo'),
});

/**
 * Orcamento (quote) validation — a quote version with items and pricing.
 */
export const orcamentoSchema = z.object({
  id: z.string().optional(),
  versao: z.number().int().min(1).optional(),
  isAtivo: z.boolean().optional(),
  status: z.enum(['RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO']).optional(),
  itens: z.array(pedidoItemSchema)
    .min(1, 'Orçamento deve ter pelo menos um item'),
  subtotal: z.number().min(0).optional(),
  desconto: z.number().min(0, 'Desconto não pode ser negativo').default(0),
  descontoTipo: z.enum(['valor', 'percentual']).default('valor'),
  acrescimo: z.number().min(0, 'Acréscimo não pode ser negativo').default(0),
  total: z.number().min(0).optional(),
});

/**
 * Pedido pacote (internal packaging) validation.
 */
export const pedidoPacoteSchema = z.object({
  id: z.string().optional(),
  nome: z.string()
    .min(1, 'Nome do pacote é obrigatório')
    .max(200, 'Nome do pacote deve ter no máximo 200 caracteres')
    .trim(),
  custo: z.number()
    .min(0, 'Custo não pode ser negativo')
    .max(999999.99, 'Custo muito alto'),
  itemIds: z.array(z.string()),
});

/**
 * Pedido entrega (delivery/pickup) validation.
 */
export const pedidoEntregaSchema = z.object({
  tipo: z.enum(['ENTREGA', 'RETIRADA']),
  enderecoEntrega: z.object({
    id: z.string(),
    label: z.string().optional(),
    cep: z.string().optional(),
    estado: z.string().optional(),
    cidade: z.string().optional(),
    bairro: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
  }).optional(),
  enderecoEntregaClienteId: z.string().optional(),
  distanciaKm: z.number().min(0).optional(),
  custoPorKm: z.number().min(0).default(4.50),
  taxaExtra: z.number().min(0).default(0),
  taxaExtraNota: z.string().max(200).optional(),
  freteTotal: z.number().min(0).default(0),
  enderecoRetiradaId: z.string().optional(),
  enderecoRetiradaNome: z.string().optional(),
});

// ============================================================================
// PEDIDO CREATE / UPDATE SCHEMAS
// ============================================================================

/**
 * Create pedido validation.
 */
export const createPedidoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  clienteNome: z.string().min(1, 'Nome do cliente é obrigatório'),
  clienteTelefone: z.string().optional(),
  status: z.enum([
    'RASCUNHO',
    'AGUARDANDO_APROVACAO',
    'CONFIRMADO',
    'EM_PRODUCAO',
    'PRONTO',
    'ENTREGUE',
    'CANCELADO',
  ]).default('RASCUNHO'),
  orcamentos: z.array(orcamentoSchema).optional(),
  pacotes: z.array(pedidoPacoteSchema).optional(),
  entrega: pedidoEntregaSchema,
  dataEntrega: z.any().optional(), // Timestamp validated at runtime
  observacoes: z.string().max(2000, 'Observações muito longas').optional(),
  observacoesCliente: z.string().max(2000, 'Observações do cliente muito longas').optional(),
});

/**
 * Update pedido validation — all fields optional for partial updates.
 */
export const updatePedidoSchema = z.object({
  clienteId: z.string().min(1).optional(),
  clienteNome: z.string().min(1).optional(),
  clienteTelefone: z.string().optional(),
  status: z.enum([
    'RASCUNHO',
    'AGUARDANDO_APROVACAO',
    'CONFIRMADO',
    'EM_PRODUCAO',
    'PRONTO',
    'ENTREGUE',
    'CANCELADO',
  ]).optional(),
  pacotes: z.array(pedidoPacoteSchema).optional(),
  entrega: pedidoEntregaSchema.optional(),
  dataEntrega: z.any().optional(),
  observacoes: z.string().max(2000).optional(),
  observacoesCliente: z.string().max(2000).optional(),
  nfStatus: z.enum(['PENDENTE', 'EMITIDA', 'CANCELADA']).nullable().optional(),
  nfProvider: z.string().nullable().optional(),
  nfExternalId: z.string().nullable().optional(),
  nfEmittedAt: z.any().nullable().optional(),
});

// ============================================================================
// STORE SETTINGS SCHEMAS
// ============================================================================

export const storeAddressSchema = z.object({
  nome: z.string()
    .min(1, 'Nome do endereço é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  cep: z.string().optional(),
  estado: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const storeSettingsSchema = z.object({
  custoPorKm: z.number()
    .min(0, 'Custo por km nao pode ser negativo')
    .max(999.99, 'Custo por km muito alto'),
});

export const storeHoursSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  diaSemanaLabel: z.string(),
  abreAs: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:MM'),
  fechaAs: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:MM'),
  fechado: z.boolean(),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const pedidoQuerySchema = z.object({
  searchQuery: z.string().optional(),
  status: z.enum([
    'RASCUNHO',
    'AGUARDANDO_APROVACAO',
    'CONFIRMADO',
    'EM_PRODUCAO',
    'PRONTO',
    'ENTREGUE',
    'CANCELADO',
  ]).optional(),
  clienteId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
  sortBy: z.enum(['createdAt', 'numeroPedido', 'dataEntrega']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PedidoItemValidation = z.infer<typeof pedidoItemSchema>;
export type OrcamentoValidation = z.infer<typeof orcamentoSchema>;
export type PedidoPacoteValidation = z.infer<typeof pedidoPacoteSchema>;
export type PedidoEntregaValidation = z.infer<typeof pedidoEntregaSchema>;
export type CreatePedidoValidation = z.infer<typeof createPedidoSchema>;
export type UpdatePedidoValidation = z.infer<typeof updatePedidoSchema>;
export type StoreAddressValidation = z.infer<typeof storeAddressSchema>;
export type StoreSettingsValidation = z.infer<typeof storeSettingsSchema>;
export type StoreHoursValidation = z.infer<typeof storeHoursSchema>;
export type PedidoQueryValidation = z.infer<typeof pedidoQuerySchema>;
