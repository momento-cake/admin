/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- In-memory Firestore + Storage mocks ----------------------------------
type DocData = Record<string, any>;
const store = new Map<string, DocData>();

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop()!,
    get: vi.fn(async () => {
      const data = store.get(path);
      return { exists: data !== undefined, data: () => data, id: path.split('/').pop()! };
    }),
    update: vi.fn(async (payload: DocData) => {
      store.set(path, { ...(store.get(path) ?? {}), ...payload });
    }),
  };
}

const savedFiles: Array<{ path: string; buffer: Buffer }> = [];
let saveShouldThrow = false;
function makeBucket() {
  return {
    file: (path: string) => ({
      save: vi.fn(async (buffer: Buffer) => {
        if (saveShouldThrow) throw new Error('gcs write failed');
        savedFiles.push({ path, buffer });
      }),
    }),
  };
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (name: string) => ({ doc: (id: string) => makeDocRef(`${name}/${id}`) }) },
  adminAuth: {},
  getFiscalBucket: () => makeBucket(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}));

let currentAuth: { uid: string; role: 'admin' | 'atendente' | 'producao' } | null = null;
vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

vi.mock('@/lib/pedidos-server', () => ({ withPaymentDefaults: (raw: any) => raw }));

const loadFiscalConfig = vi.fn();
vi.mock('@/lib/fiscal/config', () => ({ loadFiscalConfig: () => loadFiscalConfig() }));

const cancelNf = vi.fn();
vi.mock('@/lib/fiscal/registry', () => ({
  getFiscalProvider: async () => ({ name: 'nfewizard', cancelNf }),
}));

import { POST } from '@/app/api/pedidos/[id]/nf/cancel/route';

// ---- Fixtures -------------------------------------------------------------
const JUST = 'Cliente desistiu do pedido antes da entrega'; // >= 15 chars

function config(overrides: DocData = {}): DocData {
  return { ambiente: 'homologacao', ...overrides };
}

function seedEmitted(id: string, overrides: DocData = {}) {
  store.set(`pedidos/${id}`, {
    numeroPedido: 'PED-0001',
    nfStatus: 'EMITIDA',
    nfModelo: 65,
    nfAccessKey: '3'.repeat(44),
    nfProtocolo: '135240000000001',
    ...overrides,
  });
}

function makeRequest(id: string, body: DocData = {}) {
  return new NextRequest(`http://localhost/api/pedidos/${id}/nf/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const cancelled = {
  status: 'CANCELADA' as const,
  protocolo: '999888777',
  xml: '<procEventoNFe/>',
  cancelledAt: new Date('2026-07-27T10:00:00Z'),
};

beforeEach(() => {
  store.clear();
  savedFiles.length = 0;
  vi.clearAllMocks();
  currentAuth = { uid: 'u1', role: 'admin' };
  loadFiscalConfig.mockResolvedValue(config());
  cancelNf.mockResolvedValue({ ...cancelled });
  saveShouldThrow = false;
});

describe('POST /api/pedidos/[id]/nf/cancel — auth + guards', () => {
  it('401 when unauthenticated', async () => {
    currentAuth = null;
    seedEmitted('p1');
    expect((await POST(makeRequest('p1', { justificativa: JUST }), params('p1'))).status).toBe(401);
  });

  it('403 without orders/update permission', async () => {
    currentAuth = { uid: 'u1', role: 'producao' };
    seedEmitted('p1');
    expect((await POST(makeRequest('p1', { justificativa: JUST }), params('p1'))).status).toBe(403);
  });

  it('404 when the pedido does not exist', async () => {
    expect((await POST(makeRequest('missing', { justificativa: JUST }), params('missing'))).status).toBe(404);
  });

  it('409 when there is no emitted note', async () => {
    seedEmitted('p1', { nfStatus: 'PENDENTE' });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(409);
    expect(cancelNf).not.toHaveBeenCalled();
  });

  it('409 when the note is already cancelled', async () => {
    seedEmitted('p1', { nfStatus: 'CANCELADA' });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(409);
    expect(cancelNf).not.toHaveBeenCalled();
  });

  it('422 when the justificativa is too short', async () => {
    seedEmitted('p1');
    const res = await POST(makeRequest('p1', { justificativa: 'curto' }), params('p1'));
    expect(res.status).toBe(422);
    expect(cancelNf).not.toHaveBeenCalled();
  });

  it('422 when the justificativa exceeds 255 chars', async () => {
    seedEmitted('p1');
    const res = await POST(makeRequest('p1', { justificativa: 'x'.repeat(256) }), params('p1'));
    expect(res.status).toBe(422);
  });

  it('422 when the accessKey/protocolo are missing', async () => {
    seedEmitted('p1', { nfAccessKey: null, nfProtocolo: null });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(422);
    expect(cancelNf).not.toHaveBeenCalled();
  });

  it('422 (fiscal-config-missing) when the config cannot be loaded', async () => {
    seedEmitted('p1');
    loadFiscalConfig.mockRejectedValue(new Error('Certificado digital A1 não configurado.'));
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.code).toBe('fiscal-config-missing');
  });
});

describe('POST /api/pedidos/[id]/nf/cancel — outcomes', () => {
  it('cancels, archives the XML and stamps the order on CANCELADA', async () => {
    seedEmitted('p1');
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(200);

    expect(cancelNf).toHaveBeenCalledWith({
      modelo: 65,
      accessKey: '3'.repeat(44),
      protocolo: '135240000000001',
      justificativa: JUST,
    });
    expect(savedFiles.map((f) => f.path)).toEqual([
      `fiscal/homologacao/p1/${'3'.repeat(44)}-cancel.xml`,
    ]);
    const stored = store.get('pedidos/p1')!;
    expect(stored.nfStatus).toBe('CANCELADA');
    expect(stored.nfCancelJustificativa).toBe(JUST);
    expect(stored.nfCancelProtocolo).toBe('999888777');
    expect(stored.nfCancelXmlPath).toBe(`fiscal/homologacao/p1/${'3'.repeat(44)}-cancel.xml`);
    expect(json.data.cancel.protocolo).toBe('999888777');
  });

  it('trims the justificativa before sending it', async () => {
    seedEmitted('p1');
    await POST(makeRequest('p1', { justificativa: `   ${JUST}   ` }), params('p1'));
    expect(cancelNf.mock.calls[0][0].justificativa).toBe(JUST);
  });

  it('defaults modelo to 55 when nfModelo is absent', async () => {
    seedEmitted('p1', { nfModelo: null });
    cancelNf.mockResolvedValue({ ...cancelled, xml: undefined });
    await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(cancelNf.mock.calls[0][0].modelo).toBe(55);
  });

  it('does not archive when the provider returns no cancellation XML', async () => {
    seedEmitted('p1');
    cancelNf.mockResolvedValue({ ...cancelled, xml: undefined });
    await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(savedFiles).toHaveLength(0);
    expect(store.get('pedidos/p1')!.nfCancelXmlPath).toBeNull();
  });

  it('returns 422 (nf-cancel-rejected) and leaves the order untouched on REJEITADA', async () => {
    seedEmitted('p1', { nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    cancelNf.mockResolvedValue({
      status: 'REJEITADA',
      rejection: { code: '573', message: 'Duplicidade de evento' },
    });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.code).toBe('nf-cancel-rejected');
    expect(json.rejection).toEqual({ code: '573', message: 'Duplicidade de evento' });
    expect(store.get('pedidos/p1')).toEqual(before);
    expect(savedFiles).toHaveLength(0);
  });

  it('returns 504 on an ERRO result, order untouched', async () => {
    seedEmitted('p1', { nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    cancelNf.mockResolvedValue({ status: 'ERRO', rejection: { code: 'exception', message: 'timeout' } });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(504);
    expect(store.get('pedidos/p1')).toEqual(before);
  });

  it('returns 504 when the provider throws, order untouched', async () => {
    seedEmitted('p1', { nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    cancelNf.mockRejectedValue(new Error('SEFAZ indisponível'));
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(504);
    expect(store.get('pedidos/p1')).toEqual(before);
  });

  it('falls back to a default message for an ERRO without rejection detail', async () => {
    seedEmitted('p1');
    cancelNf.mockResolvedValue({ status: 'ERRO' });
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(504);
    expect(json.error).toBe('Falha na comunicação com a SEFAZ');
  });

  it('returns 500 when archiving the cancellation XML fails unexpectedly', async () => {
    seedEmitted('p1');
    saveShouldThrow = true;
    const res = await POST(makeRequest('p1', { justificativa: JUST }), params('p1'));
    expect(res.status).toBe(500);
    // Order not stamped because the archival step failed before the update.
    expect(store.get('pedidos/p1')!.nfStatus).toBe('EMITIDA');
  });
});
