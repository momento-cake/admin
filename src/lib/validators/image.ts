import { z } from 'zod';
import {
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_TAGS_PER_IMAGE,
  TAG_COLORS
} from '@/types/image';

/**
 * Validation schema for creating a new tag.
 */
export const createTagValidation = z.object({
  name: z.string()
    .min(1, 'Nome da tag é obrigatório')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .trim()
    .refine(
      (name) => /^[a-zA-ZÀ-ÿ0-9\s\-_]+$/.test(name),
      'Nome deve conter apenas letras, números, espaços, hífens e underscores'
    ),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
});

/**
 * Validation schema for updating an existing tag.
 */
export const updateTagValidation = createTagValidation.partial().extend({
  id: z.string().min(1, 'ID da tag é obrigatório')
});

/**
 * Validation schema for image upload metadata.
 * Note: File validation is done separately as Zod doesn't support File objects well.
 */
export const uploadImageValidation = z.object({
  tags: z.array(z.string())
    .max(MAX_TAGS_PER_IMAGE, `Máximo de ${MAX_TAGS_PER_IMAGE} tags por imagem`)
    .default([]),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional()
});

/**
 * Validation schema for updating image metadata.
 */
export const updateImageValidation = z.object({
  id: z.string().min(1, 'ID da imagem é obrigatório'),
  tags: z.array(z.string())
    .max(MAX_TAGS_PER_IMAGE, `Máximo de ${MAX_TAGS_PER_IMAGE} tags por imagem`)
    .optional(),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .optional()
});

/**
 * Validation schema for image filters.
 */
export const imageFiltersValidation = z.object({
  searchQuery: z.string().max(100, 'Busca deve ter no máximo 100 caracteres').optional(),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  includeMode: z.enum(['AND', 'OR']).default('OR'),
  excludeMode: z.enum(['AND', 'OR']).default('AND'),
  sortBy: z.enum(['uploadedAt', 'originalName', 'fileSize']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(24)
});

// Type exports for form use
export type CreateTagFormData = z.infer<typeof createTagValidation>;
export type UpdateTagFormData = z.infer<typeof updateTagValidation>;
export type UploadImageFormData = z.infer<typeof uploadImageValidation>;
export type UpdateImageFormData = z.infer<typeof updateImageValidation>;
export type ImageFiltersFormData = z.infer<typeof imageFiltersValidation>;

// File validation helper functions

/**
 * Validates an image file for upload.
 *
 * @param file - The file to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file exists
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo selecionado' };
  }

  // Check file type
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
    return {
      isValid: false,
      error: `Tipo de arquivo não suportado. Tipos aceitos: ${SUPPORTED_IMAGE_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
    return {
      isValid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    };
  }

  return { isValid: true };
}

/**
 * Validates multiple image files for bulk upload.
 *
 * @param files - Array of files to validate
 * @returns Object with valid files, invalid files with errors, and overall status
 */
export function validateImageFiles(files: File[]): {
  validFiles: File[];
  invalidFiles: { file: File; error: string }[];
  hasErrors: boolean;
} {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; error: string }[] = [];

  for (const file of files) {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, error: validation.error! });
    }
  }

  return {
    validFiles,
    invalidFiles,
    hasErrors: invalidFiles.length > 0
  };
}

/**
 * Validates a tag name for uniqueness (client-side check).
 * Server-side validation should also be performed.
 *
 * @param name - The tag name to validate
 * @param existingNames - Array of existing tag names
 * @returns Object with isValid flag and optional error message
 */
export function validateTagNameUnique(
  name: string,
  existingNames: string[]
): { isValid: boolean; error?: string } {
  const normalizedName = name.toLowerCase().trim();
  const isDuplicate = existingNames.some(
    existing => existing.toLowerCase().trim() === normalizedName
  );

  if (isDuplicate) {
    return { isValid: false, error: 'Já existe uma tag com este nome' };
  }

  return { isValid: true };
}

/**
 * Validates a color value.
 *
 * @param color - The color to validate (hex format)
 * @returns Object with isValid flag and optional error message
 */
export function validateColor(color: string): { isValid: boolean; error?: string } {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  if (!hexRegex.test(color)) {
    return { isValid: false, error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' };
  }

  return { isValid: true };
}

/**
 * Formats file size for display.
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets a human-readable MIME type label.
 *
 * @param mimeType - The MIME type (e.g., "image/jpeg")
 * @returns Human-readable label (e.g., "JPEG")
 */
export function getMimeTypeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/webp': 'WebP'
  };

  return labels[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Desconhecido';
}
