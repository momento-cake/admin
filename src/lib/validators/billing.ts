import { z } from 'zod';

export function stripDocumentDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function allSameDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(value: string): boolean {
  const cpf = stripDocumentDigits(value);
  if (cpf.length !== 11) return false;
  if (allSameDigits(cpf)) return false;

  const digits = cpf.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === digits[10];
}

export function isValidCnpj(value: string): boolean {
  const cnpj = stripDocumentDigits(value);
  if (cnpj.length !== 14) return false;
  if (allSameDigits(cnpj)) return false;

  const digits = cnpj.split('').map(Number);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += digits[i] * w1[i];
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (d1 !== digits[12]) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += digits[i] * w2[i];
  rem = sum % 11;
  const d2 = rem < 2 ? 0 : 11 - rem;
  return d2 === digits[13];
}

export function isValidCpfCnpj(value: string): boolean {
  const digits = stripDocumentDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

export const billingSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'Nome é obrigatório')
    .max(120, 'Nome muito longo'),
  cpfCnpj: z
    .string()
    .transform((v) => stripDocumentDigits(v))
    .refine((v) => v.length === 11 || v.length === 14, {
      message: 'CPF ou CNPJ deve ter 11 ou 14 dígitos',
    })
    .refine((v) => isValidCpfCnpj(v), { message: 'CPF/CNPJ inválido' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido')
    .max(150, 'E-mail muito longo'),
  telefone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || (v.length >= 10 && v.length <= 13), {
      message: 'Telefone inválido',
    })
    .optional()
    .or(z.literal('')),
});

export type BillingInput = z.infer<typeof billingSchema>;
