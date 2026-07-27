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

const savedFiles: Array<{ path: string; buffer: Buffer; contentType?: string }> = [];
let downloadImpl: (path: string) => Buffer = () => Buffer.from('bytes');

function makeBucket() {
  return {
    file: (path: string) => ({
      save: vi.fn(async (buffer: Buffer, opts?: { contentType?: string }) => {
        savedFiles.push({ path, buffer, contentType: opts?.contentType });
      }),
      download: vi.fn(async () => [downloadImpl(path)]),
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

// ---- Collaborator mocks ---------------------------------------------------
let currentAuth: { uid: string; role: 'admin' | 'atendente' | 'producao' } | null = null;
vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

vi.mock('@/lib/pedidos-server', () => ({
  withPaymentDefaults: (raw: any) => raw,
}));

vi.mock('@/lib/billing-encryption', () => ({
  decryptPii: (v: string) => v, // fixtures store plaintext
}));

const loadFiscalConfig = vi.fn();
vi.mock('@/lib/fiscal/config', () => ({ loadFiscalConfig: () => loadFiscalConfig() }));

const emit = vi.fn();
vi.mock('@/lib/fiscal/registry', () => ({
  getFiscalProvider: async () => ({ name: 'nfewizard', emit }),
}));

const reserveNfNumero = vi.fn();
vi.mock('@/lib/fiscal/nf-counter', () => ({
  reserveNfNumero: (...a: unknown[]) => reserveNfNumero(...a),
}));

// ---- Imports after mocks --------------------------------------------------
import { POST } from '@/app/api/pedidos/[id]/nf/route';
import { GET as getDanfe } from '@/app/api/pedidos/[id]/nf/danfe/route';
import { GET as getXml } from '@/app/api/pedidos/[id]/nf/xml/route';

// ---- Fixtures -------------------------------------------------------------
function baseConfig(overrides: DocData = {}): DocData {
  return {
    ambiente: 'homologacao',
    issuer: { cnpj: '12345678000199', uf: 'SP', crt: 1, codigoMunicipioIbge: '3550308' },
    taxProfile: { cfop: '5102', ncm: '19059090', unidade: 'UN', origem: '0', csosn: '102', naturezaOperacao: 'Venda' },
    serieNfe: 1,
    serieNfce: 2,
    csc: { token: 'CSC', id: '1' },
    cert: { pfx: Buffer.from('pfx'), password: 'p' },
    ...overrides,
  };
}

function seedPedido(id: string, overrides: DocData = {}) {
  store.set(`pedidos/${id}`, {
    numeroPedido: 'PED-0001',
    clienteId: 'c1',
    clienteNome: 'Maria',
    origem: 'LOJA',
    statusPagamento: 'PENDENTE',
    nfStatus: null,
    entrega: { freteTotal: 0 },
    pagamentos: [],
    orcamentos: [
      {
        id: 'o1',
        isAtivo: true,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        itens: [
          { id: 'i1', produtoId: 'prod-1', nome: 'Bolo', precoUnitario: 50, quantidade: 2, total: 100 },
        ],
      },
    ],
    ...overrides,
  });
}

function makeRequest(id: string, body: DocData = {}) {
  return new NextRequest(`http://localhost/api/pedidos/${id}/nf`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const authorized = {
  status: 'AUTORIZADA' as const,
  modelo: 65 as const,
  serie: 2,
  numero: 5,
  accessKey: '3'.repeat(44),
  protocolo: '135',
  xml: '<nfeProc/>',
  danfePdf: Buffer.from('%PDF danfe'),
  emittedAt: new Date(),
};

beforeEach(() => {
  store.clear();
  savedFiles.length = 0;
  vi.clearAllMocks();
  currentAuth = { uid: 'u1', role: 'admin' };
  loadFiscalConfig.mockResolvedValue(baseConfig());
  reserveNfNumero.mockResolvedValue(5);
  emit.mockResolvedValue({ ...authorized });
  downloadImpl = () => Buffer.from('bytes');
});

describe('POST /api/pedidos/[id]/nf — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    currentAuth = null;
    seedPedido('p1');
    const res = await POST(makeRequest('p1'), params('p1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 without orders/update permission', async () => {
    currentAuth = { uid: 'u1', role: 'producao' };
    seedPedido('p1');
    const res = await POST(makeRequest('p1'), params('p1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when the pedido does not exist', async () => {
    const res = await POST(makeRequest('missing'), params('missing'));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/pedidos/[id]/nf — model resolution + guards', () => {
  it('defaults to NFC-e (65) for a LOJA order and emits anonymously', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.nf.modelo).toBe(65);
    // série for 65 comes from serieNfce (2)
    expect(reserveNfNumero).toHaveBeenCalledWith(65, 2, 'homologacao');
    // anonymous: emit input carries no recipient
    expect(emit.mock.calls[0][0].recipient).toBeUndefined();
  });

  it('defaults to NF-e (55) for an ONLINE order', async () => {
    seedPedido('p1', {
      origem: 'ONLINE',
      statusPagamento: 'PAGO',
      billing: { nome: 'Maria', cpfCnpj: '39053344705', email: 'm@x.com' },
    });
    store.set('clients/c1', { name: 'Maria Silva', email: 'maria@x.com' });
    emit.mockResolvedValue({ ...authorized, modelo: 55 });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.nf.modelo).toBe(55);
    expect(reserveNfNumero).toHaveBeenCalledWith(55, 1, 'homologacao');
    expect(emit.mock.calls[0][0].recipient.cpfCnpj).toBe('39053344705');
    expect(emit.mock.calls[0][0].recipient.nome).toBe('Maria Silva');
  });

  it('honours an explicit modelo in the body', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    await POST(makeRequest('p1', { modelo: 65 }), params('p1'));
    expect(reserveNfNumero).toHaveBeenCalledWith(65, 2, 'homologacao');
  });

  it('returns 422 when there is no active orçamento with items', async () => {
    seedPedido('p1', { orcamentos: [{ id: 'o1', isAtivo: true, itens: [] }] });
    const res = await POST(makeRequest('p1'), params('p1'));
    expect(res.status).toBe(422);
  });

  it('returns 409 for NF-e when the order has no billing', async () => {
    seedPedido('p1', { origem: 'ONLINE', statusPagamento: 'PAGO' });
    const res = await POST(makeRequest('p1', { modelo: 55 }), params('p1'));
    expect(res.status).toBe(409);
    expect(emit).not.toHaveBeenCalled();
  });

  it('returns 409 for NF-e when the order is not fully paid', async () => {
    seedPedido('p1', {
      origem: 'ONLINE',
      statusPagamento: 'PARCIAL',
      billing: { nome: 'Maria', cpfCnpj: '39053344705' },
    });
    const res = await POST(makeRequest('p1', { modelo: 55 }), params('p1'));
    expect(res.status).toBe(409);
  });

  it('returns 422 for NFC-e when the CSC is not configured', async () => {
    loadFiscalConfig.mockResolvedValue(baseConfig({ csc: undefined }));
    seedPedido('p1', { origem: 'LOJA' });
    const res = await POST(makeRequest('p1', { modelo: 65 }), params('p1'));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/CSC/);
    expect(json.code).toBe('fiscal-config-missing');
  });

  it('returns 422 for NF-e when the billing document is invalid', async () => {
    seedPedido('p1', {
      origem: 'ONLINE',
      statusPagamento: 'PAGO',
      billing: { nome: 'Maria', cpfCnpj: '11111111111' },
    });
    const res = await POST(makeRequest('p1', { modelo: 55 }), params('p1'));
    expect(res.status).toBe(422);
    expect(emit).not.toHaveBeenCalled();
  });

  it('includes a CPF on the NFC-e when the walk-in customer provides one', async () => {
    seedPedido('p1', {
      origem: 'LOJA',
      billing: { nome: 'Joao', cpfCnpj: '39053344705' },
    });
    await POST(makeRequest('p1', { modelo: 65 }), params('p1'));
    expect(emit.mock.calls[0][0].recipient.cpfCnpj).toBe('39053344705');
    expect(emit.mock.calls[0][0].recipient.tipo).toBe('CPF');
  });

  it('stays anonymous on NFC-e when a CNPJ (not CPF) is provided', async () => {
    seedPedido('p1', {
      origem: 'LOJA',
      billing: { nome: 'Empresa', cpfCnpj: '12345678000100' },
    });
    await POST(makeRequest('p1', { modelo: 65 }), params('p1'));
    expect(emit.mock.calls[0][0].recipient).toBeUndefined();
  });
});

describe('POST /api/pedidos/[id]/nf — idempotency', () => {
  it('returns the existing nf without re-emitting when already EMITIDA', async () => {
    seedPedido('p1', {
      nfStatus: 'EMITIDA',
      nfModelo: 65,
      nfSerie: 2,
      nfNumero: 7,
      nfAccessKey: 'A'.repeat(44),
      nfQrCode: 'qr',
      nfUrlChave: 'url',
    });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.alreadyEmitted).toBe(true);
    expect(json.data.nf.accessKey).toBe('A'.repeat(44));
    expect(emit).not.toHaveBeenCalled();
    expect(reserveNfNumero).not.toHaveBeenCalled();
  });
});

describe('POST /api/pedidos/[id]/nf — emission outcomes', () => {
  it('persists DANFE/XML to storage and stamps the order on AUTORIZADA', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(200);

    // Stored both artifacts under fiscal/<ambiente>/<pedido>/<chave>.
    const paths = savedFiles.map((f) => f.path).sort();
    expect(paths).toEqual([
      `fiscal/homologacao/p1/${'3'.repeat(44)}.pdf`,
      `fiscal/homologacao/p1/${'3'.repeat(44)}.xml`,
    ]);

    const stored = store.get('pedidos/p1')!;
    expect(stored.nfStatus).toBe('EMITIDA');
    expect(stored.nfModelo).toBe(65);
    expect(stored.nfProvider).toBe('nfewizard');
    expect(stored.nfAccessKey).toBe('3'.repeat(44));
    expect(stored.nfNumero).toBe(5);
    expect(stored.nfProtocolo).toBe('135');
    expect(stored.nfAmbiente).toBe('homologacao');
    expect(stored.nfQrCode).toBeDefined();
    expect(json.data.nf.protocolo).toBe('135');
    expect(json.data.nf.ambiente).toBe('homologacao');
  });

  it('reserves the número before calling emit', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    const order: string[] = [];
    reserveNfNumero.mockImplementation(async () => {
      order.push('reserve');
      return 5;
    });
    emit.mockImplementation(async () => {
      order.push('emit');
      return { ...authorized };
    });
    await POST(makeRequest('p1'), params('p1'));
    expect(order).toEqual(['reserve', 'emit']);
  });

  it('returns 422 with the rejection for a REJEITADA result and does not mutate the order', async () => {
    emit.mockResolvedValue({
      status: 'REJEITADA',
      modelo: 65,
      serie: 2,
      numero: 5,
      rejection: { code: '204', message: 'Duplicidade' },
      emittedAt: new Date(),
    });
    // Snapshot BEFORE emitting so any partial mutation on failure is caught.
    seedPedido('p1', { origem: 'LOJA', nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.rejection).toEqual({ code: '204', message: 'Duplicidade' });
    // The order document must be byte-for-byte unchanged (nothing persisted).
    expect(store.get('pedidos/p1')).toEqual(before);
    expect(savedFiles).toHaveLength(0);
  });

  it('returns 504 for an ERRO result and leaves the order untouched', async () => {
    seedPedido('p1', { origem: 'LOJA', nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    emit.mockResolvedValue({
      status: 'ERRO', modelo: 65, serie: 2, numero: 5,
      rejection: { code: 'exception', message: 'timeout' }, emittedAt: new Date(),
    });
    const res = await POST(makeRequest('p1'), params('p1'));
    expect(res.status).toBe(504);
    expect(store.get('pedidos/p1')).toEqual(before);
    expect(savedFiles).toHaveLength(0);
  });

  it('returns 504 when the provider throws and leaves the order untouched', async () => {
    seedPedido('p1', { origem: 'LOJA', nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    emit.mockRejectedValue(new Error('certificado expirado'));
    const res = await POST(makeRequest('p1'), params('p1'));
    expect(res.status).toBe(504);
    expect(store.get('pedidos/p1')).toEqual(before);
    expect(savedFiles).toHaveLength(0);
  });

  it('does not write an XML path when the provider returns no XML', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    emit.mockResolvedValue({ ...authorized, xml: undefined });
    await POST(makeRequest('p1'), params('p1'));
    expect(store.get('pedidos/p1')!.nfXmlPath).toBeNull();
    expect(savedFiles.map((f) => f.path)).toEqual([`fiscal/homologacao/p1/${'3'.repeat(44)}.pdf`]);
  });

  it('falls back to a default message for a DENEGADA without rejection detail', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    emit.mockResolvedValue({ status: 'DENEGADA', modelo: 65, serie: 2, numero: 5, emittedAt: new Date() });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.error).toBe('Nota não autorizada');
  });

  it('falls back to a default message for an ERRO without rejection detail', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    emit.mockResolvedValue({ status: 'ERRO', modelo: 65, serie: 2, numero: 5, emittedAt: new Date() });
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(504);
    expect(json.error).toBe('Falha na comunicação com a SEFAZ');
  });

  it('returns a typed 422 when the fiscal config cannot be loaded', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    loadFiscalConfig.mockRejectedValue(new Error('Certificado digital A1 não configurado.'));
    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.code).toBe('fiscal-config-missing');
    expect(json.error).toMatch(/Certificado/);
    expect(emit).not.toHaveBeenCalled();
  });

  it('maps recorded payments to SEFAZ tPag codes', async () => {
    seedPedido('p1', {
      origem: 'LOJA',
      pagamentos: [
        { id: 'g1', metodo: 'PIX', valor: 60 },
        { id: 'g2', metodo: 'CARTAO_CREDITO', valor: 40 },
      ],
    });
    await POST(makeRequest('p1'), params('p1'));
    expect(emit.mock.calls[0][0].payments).toEqual([
      { tPag: '17', valor: 60 },
      { tPag: '03', valor: 40 },
    ]);
  });

  it('falls back to the checkout session method when there are no payments', async () => {
    seedPedido('p1', {
      origem: 'LOJA',
      pagamentos: [],
      paymentSession: { method: 'PIX' },
    });
    await POST(makeRequest('p1'), params('p1'));
    const payments = emit.mock.calls[0][0].payments;
    expect(payments).toHaveLength(1);
    expect(payments[0].tPag).toBe('17');
  });

  it('resolves a percentual discount into an absolute value in the totals', async () => {
    seedPedido('p1', {
      origem: 'LOJA',
      orcamentos: [
        {
          id: 'o1',
          isAtivo: true,
          desconto: 10,
          descontoTipo: 'percentual',
          acrescimo: 0,
          itens: [{ id: 'i1', nome: 'Bolo', precoUnitario: 50, quantidade: 2, total: 100 }],
        },
      ],
    });
    await POST(makeRequest('p1'), params('p1'));
    const totals = emit.mock.calls[0][0].totals;
    expect(totals.produtos).toBe(100);
    expect(totals.desconto).toBe(10); // 10% of 100
    expect(totals.total).toBe(90);
  });
});

describe('GET /api/pedidos/[id]/nf/danfe & /xml — downloads', () => {
  function getRequest(id: string, kind: 'danfe' | 'xml') {
    return new NextRequest(`http://localhost/api/pedidos/${id}/nf/${kind}`);
  }

  it('401 when unauthenticated (danfe)', async () => {
    currentAuth = null;
    seedPedido('p1');
    const res = await getDanfe(getRequest('p1', 'danfe'), params('p1'));
    expect(res.status).toBe(401);
  });

  it('401 when unauthenticated (xml)', async () => {
    currentAuth = null;
    seedPedido('p1');
    const res = await getXml(getRequest('p1', 'xml'), params('p1'));
    expect(res.status).toBe(401);
  });

  it('403 without orders/view permission (xml)', async () => {
    currentAuth = { uid: 'u1', role: 'producao' };
    seedPedido('p1', { nfXmlPath: 'fiscal/homologacao/p1/x.xml' });
    const res = await getXml(getRequest('p1', 'xml'), params('p1'));
    expect(res.status).toBe(403);
  });

  it('500 when the storage download fails (danfe)', async () => {
    seedPedido('p1', { nfDanfePath: 'fiscal/homologacao/p1/abc.pdf' });
    downloadImpl = () => {
      throw new Error('gcs unavailable');
    };
    const res = await getDanfe(getRequest('p1', 'danfe'), params('p1'));
    expect(res.status).toBe(500);
  });

  it('500 when the storage download fails (xml)', async () => {
    seedPedido('p1', { nfXmlPath: 'fiscal/homologacao/p1/abc.xml' });
    downloadImpl = () => {
      throw new Error('gcs unavailable');
    };
    const res = await getXml(getRequest('p1', 'xml'), params('p1'));
    expect(res.status).toBe(500);
  });

  it('403 without orders/view permission is enforced via role', async () => {
    // producao lacks orders/view — expect 403
    currentAuth = { uid: 'u1', role: 'producao' };
    seedPedido('p1', { nfDanfePath: 'fiscal/homologacao/p1/x.pdf' });
    const res = await getDanfe(getRequest('p1', 'danfe'), params('p1'));
    expect(res.status).toBe(403);
  });

  it('404 when the pedido is missing', async () => {
    const res = await getDanfe(getRequest('missing', 'danfe'), params('missing'));
    expect(res.status).toBe(404);
  });

  it('404 when no DANFE path is stored', async () => {
    seedPedido('p1', { nfDanfePath: null });
    const res = await getDanfe(getRequest('p1', 'danfe'), params('p1'));
    expect(res.status).toBe(404);
  });

  it('streams the DANFE PDF bytes with a download filename', async () => {
    seedPedido('p1', { nfDanfePath: 'fiscal/homologacao/p1/abc.pdf', nfAccessKey: 'ABC' });
    downloadImpl = () => Buffer.from('%PDF bytes');
    const res = await getDanfe(getRequest('p1', 'danfe'), params('p1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('NFe-ABC.pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString()).toBe('%PDF bytes');
  });

  it('streams the XML bytes', async () => {
    seedPedido('p1', { nfXmlPath: 'fiscal/homologacao/p1/abc.xml', nfAccessKey: 'ABC' });
    downloadImpl = () => Buffer.from('<nfeProc/>');
    const res = await getXml(getRequest('p1', 'xml'), params('p1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/xml');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString()).toBe('<nfeProc/>');
  });

  it('404 when no XML path is stored', async () => {
    seedPedido('p1', { nfXmlPath: null });
    const res = await getXml(getRequest('p1', 'xml'), params('p1'));
    expect(res.status).toBe(404);
  });
});
