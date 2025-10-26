import { z } from 'zod'

/**
 * Contact Method validation schema
 */
export const contactMethodSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    'phone',
    'email',
    'whatsapp',
    'instagram',
    'facebook',
    'linkedin',
    'other'
  ]),
  value: z.string().min(1, 'Valor do contato é obrigatório'),
  isPrimary: z.boolean(),
  notes: z.string().optional()
})

/**
 * Related Person validation schema
 */
export const relatedPersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  relationship: z.enum([
    'child',
    'parent',
    'sibling',
    'friend',
    'spouse',
    'other'
  ]),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional()
})

/**
 * Special Date validation schema
 */
export const specialDateSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em formato YYYY-MM-DD'),
  type: z.enum(['birthday', 'anniversary', 'custom']),
  description: z
    .string()
    .min(2, 'Descrição deve ter pelo menos 2 caracteres')
    .max(100, 'Descrição não pode exceder 100 caracteres'),
  relatedPersonId: z.string().optional(),
  notes: z.string().optional()
})

/**
 * Address validation schema
 */
export const addressSchema = z
  .object({
    cep: z.string().optional(),
    estado: z.string().optional(),
    cidade: z.string().optional(),
    bairro: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional()
  })
  .optional()

/**
 * Preferences validation schema
 */
export const preferencesSchema = z
  .object({
    preferredContact: z.enum(['phone', 'email', 'whatsapp', 'other']).optional(),
    marketingConsent: z.boolean().optional(),
    communicationPreference: z.string().optional()
  })
  .optional()

/**
 * Company Info validation schema (Business clients)
 */
export const companyInfoSchema = z.object({
  cnpj: z
    .string()
    .min(14, 'CNPJ deve ter 14 dígitos')
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ inválido'),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório').max(150),
  businessType: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional()
})

/**
 * Representative validation schema (Business clients)
 */
export const representativeSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(100),
  email: z.string().email('E-mail válido é obrigatório'),
  phone: z.string().min(10, 'Telefone deve ser válido'),
  role: z.string().optional(),
  cpf: z.string().optional()
})

/**
 * Base client schema with common fields
 */
export const baseClientSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome é obrigatório')
    .max(100, 'Nome não pode exceder 100 caracteres'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema,
  contactMethods: z.array(contactMethodSchema).min(1, 'Pelo menos um método de contato é obrigatório'),
  relatedPersons: z.array(relatedPersonSchema).optional(),
  specialDates: z.array(specialDateSchema).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  preferences: preferencesSchema
})

/**
 * Personal Client validation schema
 */
export const personalClientSchema = baseClientSchema.extend({
  type: z.literal('person')
})

/**
 * Business Client validation schema
 */
export const businessClientSchema = baseClientSchema.extend({
  type: z.literal('business'),
  companyInfo: companyInfoSchema,
  representative: representativeSchema
})

/**
 * Create Client schema (union of personal and business)
 */
export const createClientSchema = z.union([personalClientSchema, businessClientSchema])

/**
 * Update Client schema (all fields optional except id)
 */
export const updateClientSchema = z.object({
  id: z.string(),
  type: z.enum(['person', 'business']).optional(),
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  contactMethods: z.array(contactMethodSchema).optional(),
  address: addressSchema.optional(),
  tags: z.array(z.string()).optional(),
  relatedPersons: z.array(relatedPersonSchema).optional(),
  specialDates: z.array(specialDateSchema).optional(),
  notes: z.string().optional(),
  companyInfo: companyInfoSchema.optional(),
  representative: representativeSchema.optional()
})

/**
 * Client query parameters schema
 */
export const clientQuerySchema = z.object({
  searchQuery: z.string().optional(),
  type: z.enum(['person', 'business']).optional(),
  sortBy: z.enum(['name', 'created', 'updated']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional()
})

// Export TypeScript types inferred from Zod schemas
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientQueryParams = z.infer<typeof clientQuerySchema>
export type PersonalClientInput = z.infer<typeof personalClientSchema>
export type BusinessClientInput = z.infer<typeof businessClientSchema>
export type ContactMethodInput = z.infer<typeof contactMethodSchema>
export type RelatedPersonInput = z.infer<typeof relatedPersonSchema>
export type SpecialDateInput = z.infer<typeof specialDateSchema>
