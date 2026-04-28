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

import { PATCH } from '@/app/api/public/pedidos/[token]/billing/route';
import { resetRateLimitForTesting } from '@/lib/rate-limit';

function makeReq(token: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/public/pedidos/${token}/billing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_TOKEN = 'valid-token-1234567890';
const VALID_CPF = '52998224725'; // valid CPF check digits
const VALID_BODY = {
  nome: 'Maria Silva',
  cpfCnpj: VALID_CPF,
  email: 'maria@example.com',
  telefone: '11999999999',
};

describe('PATCH /api/public/pedidos/[token]/billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitForTesting();
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
  });

  it('returns 400 for short tokens', async () => {
    const res = await PATCH(makeReq('short', VALID_BODY), createParams('short'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid CPF', async () => {
    const res = await PATCH(
      makeReq(VALID_TOKEN, { ...VALID_BODY, cpfCnpj: '11111111111' }),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.details).toBeDefined();
  });

  it('returns 404 when pedido is not found', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await PATCH(makeReq(VALID_TOKEN, VALID_BODY), createParams(VALID_TOKEN));
    expect(res.status).toBe(404);
  });

  it('returns 400 when pedido is not in AGUARDANDO_PAGAMENTO', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'p1',
          ref: { update: mockUpdate },
          data: () => ({ status: 'AGUARDANDO_APROVACAO' }),
        },
      ],
    });
    const res = await PATCH(makeReq(VALID_TOKEN, VALID_BODY), createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes billing snapshot and returns 200 on happy path', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'p1',
          ref: { update: mockUpdate },
          data: () => ({ status: 'AGUARDANDO_PAGAMENTO' }),
        },
      ],
    });

    const res = await PATCH(makeReq(VALID_TOKEN, VALID_BODY), createParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // CPF is encrypted at rest (LGPD) — the response echoes the ciphertext,
    // not the plaintext. Other fields stay in cleartext.
    expect(body.data.billing.cpfCnpj).toMatch(/^enc:v1:/);
    expect(body.data.billing.cpfCnpj).not.toBe(VALID_CPF);
    expect(body.data.billing.email).toBe('maria@example.com');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const payload = mockUpdate.mock.calls[0][0];
    expect(payload.billing.cpfCnpj).toMatch(/^enc:v1:/);
    expect(payload.billing.cpfCnpj).not.toBe(VALID_CPF);
    expect(payload.billing.nome).toBe('Maria Silva');
    expect(payload.billing.email).toBe('maria@example.com');
    expect(payload.billing.confirmedAt).toBe('SERVER_TS');
    expect(payload.updatedAt).toBe('SERVER_TS');
  });

  it('rejects invalid JSON', async () => {
    const req = new NextRequest(
      `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/billing`,
      {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'content-type': 'application/json' },
      },
    );
    const res = await PATCH(req, createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
  });

  it('rate-limits to 5 requests per minute per ip+token', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'p1',
          ref: { update: mockUpdate },
          data: () => ({ status: 'AGUARDANDO_PAGAMENTO' }),
        },
      ],
    });

    function makeReqWithIp(ip: string) {
      return new NextRequest(
        `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/billing`,
        {
          method: 'PATCH',
          body: JSON.stringify(VALID_BODY),
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        },
      );
    }

    for (let i = 0; i < 5; i++) {
      const res = await PATCH(makeReqWithIp('1.1.1.1'), createParams(VALID_TOKEN));
      expect(res.status).toBe(200);
    }
    const blocked = await PATCH(makeReqWithIp('1.1.1.1'), createParams(VALID_TOKEN));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/Muitas tentativas/i);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();

    // Reset for testing simulates the window expiring.
    resetRateLimitForTesting();
    const ok = await PATCH(makeReqWithIp('1.1.1.1'), createParams(VALID_TOKEN));
    expect(ok.status).toBe(200);
  });
});
