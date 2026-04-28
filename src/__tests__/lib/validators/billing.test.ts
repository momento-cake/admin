import { describe, it, expect } from 'vitest';
import {
  billingSchema,
  isValidCpf,
  isValidCnpj,
  isValidCpfCnpj,
  stripDocumentDigits,
} from '@/lib/validators/billing';

describe('stripDocumentDigits', () => {
  it('strips all non-digits', () => {
    expect(stripDocumentDigits('123.456.789-09')).toBe('12345678909');
    expect(stripDocumentDigits('11.222.333/0001-81')).toBe('11222333000181');
    expect(stripDocumentDigits('  1 2-3 ')).toBe('123');
    expect(stripDocumentDigits('')).toBe('');
  });
});

describe('isValidCpf', () => {
  it('accepts known valid CPFs', () => {
    expect(isValidCpf('12345678909')).toBe(true);
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidCpf('1234567890')).toBe(false);
    expect(isValidCpf('123456789012')).toBe(false);
  });

  it('rejects all-same-digit sequences', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('99999999999')).toBe(false);
  });

  it('rejects bad first check digit', () => {
    expect(isValidCpf('12345678919')).toBe(false);
  });

  it('rejects bad second check digit', () => {
    expect(isValidCpf('12345678900')).toBe(false);
  });

  it('handles a CPF whose check digit calculation lands on 10 (must wrap to 0)', () => {
    expect(isValidCpf('00000000191')).toBe(true);
  });
});

describe('isValidCnpj', () => {
  it('accepts known valid CNPJs', () => {
    expect(isValidCnpj('11222333000181')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('112223330001811')).toBe(false);
  });

  it('rejects all-same-digit sequences', () => {
    expect(isValidCnpj('00000000000000')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('rejects bad first check digit', () => {
    expect(isValidCnpj('11222333000191')).toBe(false);
  });

  it('rejects bad second check digit', () => {
    expect(isValidCnpj('11222333000180')).toBe(false);
  });
});

describe('isValidCpfCnpj', () => {
  it('routes 11-digit input to CPF validation', () => {
    expect(isValidCpfCnpj('12345678909')).toBe(true);
    expect(isValidCpfCnpj('00000000000')).toBe(false);
  });

  it('routes 14-digit input to CNPJ validation', () => {
    expect(isValidCpfCnpj('11222333000181')).toBe(true);
    expect(isValidCpfCnpj('00000000000000')).toBe(false);
  });

  it('rejects any other length', () => {
    expect(isValidCpfCnpj('1234567890')).toBe(false);
    expect(isValidCpfCnpj('123')).toBe(false);
    expect(isValidCpfCnpj('')).toBe(false);
  });
});

describe('billingSchema', () => {
  const valid = {
    nome: 'João da Silva',
    cpfCnpj: '123.456.789-09',
    email: 'JOAO@example.com  ',
    telefone: '(11) 99999-9999',
  };

  it('accepts a fully valid payload and normalizes inputs', () => {
    const parsed = billingSchema.parse(valid);
    expect(parsed.nome).toBe('João da Silva');
    expect(parsed.cpfCnpj).toBe('12345678909');
    expect(parsed.email).toBe('joao@example.com');
    expect(parsed.telefone).toBe('11999999999');
  });

  it('accepts CNPJ', () => {
    const parsed = billingSchema.parse({ ...valid, cpfCnpj: '11.222.333/0001-81' });
    expect(parsed.cpfCnpj).toBe('11222333000181');
  });

  it('rejects invalid CPF', () => {
    const result = billingSchema.safeParse({ ...valid, cpfCnpj: '111.111.111-11' });
    expect(result.success).toBe(false);
  });

  it('rejects when document length is wrong', () => {
    const result = billingSchema.safeParse({ ...valid, cpfCnpj: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects empty nome', () => {
    const result = billingSchema.safeParse({ ...valid, nome: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = billingSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('allows missing telefone', () => {
    const { telefone: _telefone, ...withoutPhone } = valid;
    void _telefone;
    expect(billingSchema.safeParse(withoutPhone).success).toBe(true);
  });

  it('rejects telefone shorter than 10 digits', () => {
    const result = billingSchema.safeParse({ ...valid, telefone: '11999' });
    expect(result.success).toBe(false);
  });
});
