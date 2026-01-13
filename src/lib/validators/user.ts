import { z } from 'zod';
import { InvitationStatus } from '@/types';

// Define valid UserRole values as a constant for Zod
const USER_ROLES = ['admin', 'atendente'] as const;
const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'cancelled'] as const;

/**
 * User creation validation schema
 */
export const userCreationValidation = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  displayName: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .optional(),
  photoURL: z.string().url('URL de foto inválida').optional(),
  role: z.enum(USER_ROLES),
});

/**
 * User update validation schema
 */
export const userUpdateValidation = userCreationValidation.partial().extend({
  uid: z.string().min(1, 'UID é obrigatório')
});

/**
 * User profile metadata validation
 */
const userMetadataSchema = z.object({
  firstName: z.string()
    .min(1, 'Primeiro nome é obrigatório')
    .max(50, 'Primeiro nome deve ter menos de 50 caracteres')
    .optional(),
  lastName: z.string()
    .min(1, 'Sobrenome é obrigatório')
    .max(50, 'Sobrenome deve ter menos de 50 caracteres')
    .optional(),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido (00) 00000-0000')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .max(50, 'Departamento deve ter menos de 50 caracteres')
    .optional(),
  bio: z.string()
    .max(500, 'Bio deve ter no máximo 500 caracteres')
    .optional(),
});

/**
 * User registration data validation
 */
export const userRegistrationValidation = z.object({
  invitationToken: z.string().min(1, 'Token de convite é obrigatório'),
  firstName: z.string()
    .min(1, 'Primeiro nome é obrigatório')
    .max(50, 'Primeiro nome deve ter menos de 50 caracteres')
    .trim(),
  lastName: z.string()
    .min(1, 'Sobrenome é obrigatório')
    .max(50, 'Sobrenome deve ter menos de 50 caracteres')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido (00) 00000-0000')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .max(50, 'Departamento deve ter menos de 50 caracteres')
    .optional(),
  acceptsTerms: z.boolean()
    .refine(val => val === true, { message: 'Você deve aceitar os termos' }),
});

/**
 * User invitation creation validation
 */
export const invitationCreationValidation = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  role: z.enum(USER_ROLES),
  expiresIn: z.number()
    .min(1, 'Convite deve expirar em pelo menos 1 hora')
    .max(30 * 24, 'Convite não pode expirar em mais de 30 dias (horas)')
    .optional()
    .default(24), // Default 24 hours
});

/**
 * Invitation acceptance validation
 */
export const invitationAcceptanceValidation = z.object({
  invitationId: z.string().min(1, 'ID de convite é obrigatório'),
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  token: z.string().min(1, 'Token é obrigatório'),
});

/**
 * Invitation status update validation
 */
export const invitationStatusUpdateValidation = z.object({
  invitationId: z.string().min(1, 'ID de convite é obrigatório'),
  status: z.enum(['cancelled', 'expired'] as const),
  reason: z.string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
});

/**
 * User profile update validation
 */
export const userProfileUpdateValidation = userMetadataSchema.extend({
  displayName: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .optional(),
  photoURL: z.string().url('URL de foto inválida').optional(),
});

/**
 * User password change validation
 */
export const passwordChangeValidation = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .max(128, 'Nova senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

/**
 * User role change validation
 */
export const roleChangeValidation = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  newRole: z.enum(USER_ROLES),
  reason: z.string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
});

/**
 * User filters validation
 */
export const userFiltersValidation = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(['active', 'inactive'] as const).optional(),
  searchQuery: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

/**
 * Invitation filters validation
 */
export const invitationFiltersValidation = z.object({
  status: z.enum(INVITATION_STATUSES).optional(),
  role: z.enum(USER_ROLES).optional(),
  searchQuery: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

/**
 * Batch user operations validation
 */
export const batchUserOperationValidation = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos um usuário'),
  operation: z.enum(['activate', 'deactivate', 'changeRole', 'delete'] as const),
  newRole: z.enum(USER_ROLES).optional(),
  reason: z.string()
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
}).refine((data) => {
  // Ensure role is provided if changing role
  if (data.operation === 'changeRole' && !data.newRole) {
    return false;
  }
  return true;
}, {
  message: 'Nova função é obrigatória para operação de mudança de função',
  path: ['newRole'],
});

// Type exports for form use
export type UserCreationData = z.infer<typeof userCreationValidation>;
export type UserUpdateData = z.infer<typeof userUpdateValidation>;
export type UserMetadataData = z.infer<typeof userMetadataSchema>;
export type UserRegistrationData = z.infer<typeof userRegistrationValidation>;
export type InvitationCreationData = z.infer<typeof invitationCreationValidation>;
export type InvitationAcceptanceData = z.infer<typeof invitationAcceptanceValidation>;
export type InvitationStatusUpdateData = z.infer<typeof invitationStatusUpdateValidation>;
export type UserProfileUpdateData = z.infer<typeof userProfileUpdateValidation>;
export type PasswordChangeData = z.infer<typeof passwordChangeValidation>;
export type RoleChangeData = z.infer<typeof roleChangeValidation>;
export type UserFiltersData = z.infer<typeof userFiltersValidation>;
export type InvitationFiltersData = z.infer<typeof invitationFiltersValidation>;
export type BatchUserOperationData = z.infer<typeof batchUserOperationValidation>;

// Validation helper functions
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  try {
    const emailSchema = z.string()
      .email('Email inválido')
      .toLowerCase()
      .trim();

    emailSchema.parse(email);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: 'Email inválido' };
  }
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  try {
    const passwordSchema = z.string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
      .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
      .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

    passwordSchema.parse(password);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: 'Senha inválida' };
  }
}

export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  try {
    const phoneSchema = z.string()
      .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido (00) 00000-0000')
      .optional()
      .or(z.literal(''));

    phoneSchema.parse(phone);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: 'Telefone inválido' };
  }
}
