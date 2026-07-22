import { describe, it, expect } from 'vitest';
import {
  createMesversarioSchema,
  updateMesversarioSchema,
  updateMesSchema,
  linkPedidoSchema,
} from '@/lib/validators/mesversario';

const validCreate = {
  clienteId: 'c1',
  clienteNome: 'Maria Silva',
  clienteTelefone: '11999999999',
  relatedPersonId: 'rp1',
  bebeNome: 'João',
  dataNascimento: '2025-01-15',
};

describe('createMesversarioSchema', () => {
  it('accepts a valid payload', () => {
    const result = createMesversarioSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('accepts a payload without the optional phone/observacoes', () => {
    const { clienteTelefone, ...rest } = validCreate;
    const result = createMesversarioSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects a missing clienteId', () => {
    const result = createMesversarioSchema.safeParse({ ...validCreate, clienteId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing relatedPersonId', () => {
    const result = createMesversarioSchema.safeParse({ ...validCreate, relatedPersonId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing bebeNome', () => {
    const result = createMesversarioSchema.safeParse({ ...validCreate, bebeNome: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a dataNascimento that is not ISO YYYY-MM-DD', () => {
    const result = createMesversarioSchema.safeParse({ ...validCreate, dataNascimento: '15/01/2025' });
    expect(result.success).toBe(false);
  });

  it('rejects an impossible calendar date', () => {
    const result = createMesversarioSchema.safeParse({ ...validCreate, dataNascimento: '2025-13-40' });
    expect(result.success).toBe(false);
  });
});

describe('updateMesversarioSchema', () => {
  it('accepts a status change', () => {
    const result = updateMesversarioSchema.safeParse({ status: 'CONCLUIDO' });
    expect(result.success).toBe(true);
  });

  it('accepts observacoes only', () => {
    const result = updateMesversarioSchema.safeParse({ observacoes: 'nota' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    const result = updateMesversarioSchema.safeParse({ status: 'BANANA' });
    expect(result.success).toBe(false);
  });
});

describe('updateMesSchema', () => {
  it('accepts a status enum change', () => {
    const result = updateMesSchema.safeParse({ status: 'EM_CONTATO' });
    expect(result.success).toBe(true);
  });

  it('accepts an acordo with reference images', () => {
    const result = updateMesSchema.safeParse({
      acordo: {
        tema: 'Ursinhos',
        sabor: 'Chocolate',
        notas: 'Sem lactose',
        imagensReferencia: [
          { url: 'https://x.test/a.jpg', storagePath: 'images/a.jpg', legenda: 'topo' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional pedido link', () => {
    const result = updateMesSchema.safeParse({
      pedidoId: 'p1',
      pedidoNumero: 'PED-0001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid month status', () => {
    const result = updateMesSchema.safeParse({ status: 'NOPE' });
    expect(result.success).toBe(false);
  });

  it('rejects an acordo reference image with an invalid URL', () => {
    const result = updateMesSchema.safeParse({
      acordo: { imagensReferencia: [{ url: 'not-a-url', storagePath: 'images/a.jpg' }] },
    });
    expect(result.success).toBe(false);
  });
});

describe('linkPedidoSchema', () => {
  it('accepts a valid pedido link', () => {
    const result = linkPedidoSchema.safeParse({ pedidoId: 'p1', pedidoNumero: 'PED-0001' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing pedidoId', () => {
    const result = linkPedidoSchema.safeParse({ pedidoNumero: 'PED-0001' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing pedidoNumero', () => {
    const result = linkPedidoSchema.safeParse({ pedidoId: 'p1' });
    expect(result.success).toBe(false);
  });
});
