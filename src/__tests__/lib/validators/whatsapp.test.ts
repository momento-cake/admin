import { describe, it, expect } from 'vitest';
import {
  sendMessageSchema,
  linkClientSchema,
  quickCreateClientSchema,
} from '@/lib/validators/whatsapp';

describe('sendMessageSchema', () => {
  it('accepts a normal text message', () => {
    const result = sendMessageSchema.safeParse({ text: 'Olá, tudo bem?' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty text', () => {
    const result = sendMessageSchema.safeParse({ text: '' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only text', () => {
    const result = sendMessageSchema.safeParse({ text: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects text over 4096 chars (WhatsApp message limit)', () => {
    const long = 'a'.repeat(4097);
    const result = sendMessageSchema.safeParse({ text: long });
    expect(result.success).toBe(false);
  });

  it('accepts text exactly at 4096 chars', () => {
    const long = 'a'.repeat(4096);
    const result = sendMessageSchema.safeParse({ text: long });
    expect(result.success).toBe(true);
  });

  it('rejects missing text', () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    const result = sendMessageSchema.safeParse({ text: '  hi  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.text).toBe('hi');
  });
});

describe('linkClientSchema', () => {
  it('accepts a valid client id', () => {
    const result = linkClientSchema.safeParse({ clientId: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty client id', () => {
    const result = linkClientSchema.safeParse({ clientId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing client id', () => {
    const result = linkClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('quickCreateClientSchema', () => {
  it('accepts a name with at least 2 characters', () => {
    const result = quickCreateClientSchema.safeParse({ name: 'Maria' });
    expect(result.success).toBe(true);
  });

  it('rejects single-character name', () => {
    const result = quickCreateClientSchema.safeParse({ name: 'M' });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    const result = quickCreateClientSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 120 chars', () => {
    const result = quickCreateClientSchema.safeParse({ name: 'a'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('trims the name', () => {
    const result = quickCreateClientSchema.safeParse({ name: '  Maria  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Maria');
  });
});
