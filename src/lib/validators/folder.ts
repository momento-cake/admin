import { z } from 'zod'

/**
 * Regex pattern for valid slugs.
 * Only lowercase letters, numbers, and hyphens allowed.
 */
const SLUG_REGEX = /^[a-z0-9-]+$/

/**
 * Validation schema for creating a new folder.
 */
export const createFolderSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .trim(),
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .max(50, 'Slug não pode exceder 50 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'Descrição não pode exceder 500 caracteres')
    .trim()
    .optional(),
  imageIds: z
    .array(z.string().min(1))
    .min(1, 'Selecione pelo menos uma imagem'),
  clientId: z.string().min(1).optional(),
  coverImageId: z.string().min(1).optional(),
  isPublic: z.boolean().default(true)
})

/**
 * Validation schema for updating an existing folder.
 */
export const updateFolderSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres')
    .trim()
    .optional(),
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .max(50, 'Slug não pode exceder 50 caracteres')
    .optional(),
  description: z
    .string()
    .max(500, 'Descrição não pode exceder 500 caracteres')
    .trim()
    .optional()
    .nullable(),
  imageIds: z.array(z.string().min(1)).optional(),
  clientId: z.string().min(1).optional().nullable(),
  coverImageId: z.string().min(1).optional().nullable(),
  isPublic: z.boolean().optional()
})

/**
 * Validation schema for folder query parameters.
 */
export const folderQuerySchema = z.object({
  searchQuery: z
    .string()
    .max(100, 'Busca deve ter no máximo 100 caracteres')
    .optional(),
  clientId: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1)
})

/**
 * Validation schema for adding/removing images from a folder.
 */
export const folderImagesSchema = z.object({
  imageIds: z
    .array(z.string().min(1))
    .min(1, 'Selecione pelo menos uma imagem')
})

/**
 * Validation schema for binding a client to a folder.
 */
export const folderClientBindSchema = z.object({
  clientId: z.string().min(1, 'ID do cliente é obrigatório')
})

// Type exports for form use
export type CreateFolderFormData = z.infer<typeof createFolderSchema>
export type UpdateFolderFormData = z.infer<typeof updateFolderSchema>
export type FolderQueryParams = z.infer<typeof folderQuerySchema>
export type FolderImagesFormData = z.infer<typeof folderImagesSchema>
export type FolderClientBindFormData = z.infer<typeof folderClientBindSchema>

/**
 * Generates a URL-friendly slug from a name.
 *
 * @param name - The name to convert to a slug
 * @returns URL-friendly slug
 *
 * @example
 * ```typescript
 * generateSlug('Casamento Maria & João 2024')
 * // Returns: 'casamento-maria-joao-2024'
 * ```
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50) // Max length
}

/**
 * Validates a slug format.
 *
 * @param slug - The slug to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug) {
    return { isValid: false, error: 'Slug é obrigatório' }
  }

  if (slug.length < 3) {
    return { isValid: false, error: 'Slug deve ter pelo menos 3 caracteres' }
  }

  if (slug.length > 50) {
    return { isValid: false, error: 'Slug não pode exceder 50 caracteres' }
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      isValid: false,
      error: 'Slug deve conter apenas letras minúsculas, números e hífens'
    }
  }

  return { isValid: true }
}

/**
 * Validates a slug for uniqueness (client-side check).
 * Server-side validation should also be performed.
 *
 * @param slug - The slug to validate
 * @param existingSlugs - Array of existing slugs
 * @param excludeId - Optional ID to exclude from duplicate check (for updates)
 * @returns Object with isValid flag and optional error message
 */
export function validateSlugUnique(
  slug: string,
  existingSlugs: string[],
  excludeId?: string
): { isValid: boolean; error?: string } {
  const isDuplicate = existingSlugs.some(
    existing => existing.toLowerCase() === slug.toLowerCase()
  )

  if (isDuplicate) {
    return { isValid: false, error: 'Já existe uma pasta com este slug' }
  }

  return { isValid: true }
}
