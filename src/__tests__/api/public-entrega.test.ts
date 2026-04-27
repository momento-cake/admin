/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}));

import { PATCH } from '@/app/api/public/pedidos/[token]/entrega/route';

const VALID_TOKEN = 'valid-token-1234567890';
const VALID_ENTREGA_BODY = {
  tipo: 'RETIRADA' as const,
  custoPorKm: 0,
  taxaExtra: 0,
  freteTotal: 0,
};

function makeReq(token: string, body: unknown) {
  return new NextRequest(
    `http://localhost:4000/api/public/pedidos/${token}/entrega`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    },
  );
}

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

function seedDoc(data: Record<string, unknown>) {
  mockGet.mockResolvedValue({
    empty: false,
    docs: [
      {
        id: 'p1',
        ref: { update: mockUpdate, id: 'p1' },
        data: () => data,
      },
    ],
  });
}

describe('PATCH /api/public/pedidos/[token]/entrega', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
  });

  it('updates entrega when status is AGUARDANDO_APROVACAO', async () => {
    seedDoc({ status: 'AGUARDANDO_APROVACAO' });
    const res = await PATCH(
      makeReq(VALID_TOKEN, VALID_ENTREGA_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects with 409 when status is AGUARDANDO_PAGAMENTO', async () => {
    seedDoc({ status: 'AGUARDANDO_PAGAMENTO' });
    const res = await PATCH(
      makeReq(VALID_TOKEN, VALID_ENTREGA_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/endereço não pode mais ser alterado/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects with 409 when status is CONFIRMADO', async () => {
    seedDoc({ status: 'CONFIRMADO' });
    const res = await PATCH(
      makeReq(VALID_TOKEN, VALID_ENTREGA_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when pedido is not found', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await PATCH(
      makeReq(VALID_TOKEN, VALID_ENTREGA_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for short tokens', async () => {
    const res = await PATCH(makeReq('x', VALID_ENTREGA_BODY), createParams('x'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid body', async () => {
    seedDoc({ status: 'AGUARDANDO_APROVACAO' });
    const res = await PATCH(
      makeReq(VALID_TOKEN, { tipo: 'INVALID' }),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
  });
});
