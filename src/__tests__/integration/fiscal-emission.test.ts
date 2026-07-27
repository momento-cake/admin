/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * End-to-end wiring test for fiscal emission.
 *
 * Unlike `src/__tests__/api/pedidos-nf.test.ts` (which stubs the whole
 * `getFiscalProvider`), this test mocks ONLY the external NFeWizard libraries at
 * their module boundary (`nfewizard-io`, `@nfewizard/nfce`, `@nfewizard/danfe`)
 * and lets the REAL registry → config → client → mapping → autorização →
 * map-result → danfe pipeline run. Its purpose is to catch field-name / wiring
 * mismatches that per-unit mocks hide: the route builds a `FiscalEmitInput`, the
 * real `buildFiscalPayload` turns it into the library payload, the mocked SEFAZ
 * response flows back through the real `mapEmitResult`, and the real `danfe.ts`
 * reads the PDF back from disk.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { promises as fsp } from 'fs';

// ---------------------------------------------------------------------------
// Shared mutable state the library mocks read/write (hoisted so the vi.mock
// factories can close over it).
// ---------------------------------------------------------------------------
const wiz = vi.hoisted(() => ({
  lastPayload55: null as any,
  lastPayload65: null as any,
  response55: null as any,
  response65: null as any,
  loadEnvCalls: 0,
}));

// ---- In-memory Firestore + Storage ----------------------------------------
type DocData = Record<string, any>;
const store = new Map<string, DocData>();
const savedFiles: Array<{ path: string; buffer: Buffer; contentType?: string }> = [];
const CERT_BYTES = Buffer.from('PFXBYTES');

function snap(path: string) {
  const data = store.get(path);
  return { exists: data !== undefined, data: () => data, id: path.split('/').pop()! };
}
function docRef(path: string) {
  return {
    __path: path,
    id: path.split('/').pop()!,
    get: vi.fn(async () => snap(path)),
    update: vi.fn(async (data: DocData) => {
      store.set(path, { ...(store.get(path) ?? {}), ...data });
    }),
    set: vi.fn(async (data: DocData, opts?: { merge?: boolean }) => {
      store.set(path, opts?.merge ? { ...(store.get(path) ?? {}), ...data } : data);
    }),
  };
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({ doc: (id: string) => docRef(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: any) => any) =>
      fn({
        get: async (ref: any) => snap(ref.__path),
        update: (ref: any, data: DocData) =>
          store.set(ref.__path, { ...(store.get(ref.__path) ?? {}), ...data }),
        set: (ref: any, data: DocData) => store.set(ref.__path, data),
      }),
  },
  adminAuth: {},
  getFiscalBucket: () => ({
    file: (path: string) => ({
      save: vi.fn(async (buffer: Buffer, opts?: { contentType?: string }) => {
        savedFiles.push({ path, buffer, contentType: opts?.contentType });
      }),
      download: vi.fn(async () => [CERT_BYTES]),
    }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}));

// ---- Collaborators kept real EXCEPT auth + crypto -------------------------
let currentAuth: { uid: string; role: 'admin' | 'atendente' | 'producao' } | null = null;
vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});
vi.mock('@/lib/pedidos-server', () => ({ withPaymentDefaults: (raw: any) => raw }));
// Certificate password / CSC are stored encrypted; fixtures use plaintext.
vi.mock('@/lib/billing-encryption', () => ({
  decryptPii: (v: string) => v,
  encryptPii: (v: string) => v,
}));

// ---- External NFeWizard libraries (the ONLY real boundary mocked) ---------
/** Simulate the library persisting the authorized XML to pathXMLAutorizacao. */
function writeAuthorizedXml(resp: any) {
  if (!resp) return;
  const fs = require('fs');
  const path = require('path');
  const motivo = Array.isArray(resp.xMotivo) ? resp.xMotivo[0] : resp.xMotivo;
  const cStat = String(motivo?.cStat ?? '');
  if (cStat !== '100' && cStat !== '150') return;
  const chNFe = motivo?.chNFe;
  if (!chNFe) return;
  const dir = '/tmp/fiscal-xml';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${chNFe}.xml`), '<nfeProc><NFe/></nfeProc>');
}

vi.mock('nfewizard-io', () => ({
  default: class NFeWizard {
    async NFE_LoadEnvironment() {
      wiz.loadEnvCalls += 1;
    }
    async NFE_Autorizacao(payload: any) {
      wiz.lastPayload55 = payload;
      writeAuthorizedXml(wiz.response55);
      return wiz.response55;
    }
  },
}));

vi.mock('@nfewizard/nfce', () => ({
  NFCEWizard: class NFCEWizard {
    async NFE_LoadEnvironment() {
      wiz.loadEnvCalls += 1;
    }
    async NFCE_Autorizacao(payload: any) {
      wiz.lastPayload65 = payload;
      writeAuthorizedXml(wiz.response65);
      return wiz.response65;
    }
  },
}));

vi.mock('@nfewizard/danfe', () => {
  const write = async (params: any) => {
    const fs = require('fs');
    const path = require('path');
    fs.mkdirSync(path.dirname(params.outputPath), { recursive: true });
    fs.writeFileSync(params.outputPath, '%PDF-1.4 danfe bytes');
    return { success: true };
  };
  return { NFE_GerarDanfe: vi.fn(write), NFCE_GerarDanfe: vi.fn(write) };
});

// ---- Import the route AFTER mocks -----------------------------------------
import { POST } from '@/app/api/pedidos/[id]/nf/route';
import { resetFiscalProviderForTesting } from '@/lib/fiscal/registry';

// ---- Fixtures -------------------------------------------------------------
const KEY_55 = '35' + '1'.repeat(42);
const KEY_65 = '35' + '2'.repeat(42);

/** Full storeSettings/fiscal doc — exactly the fields `loadFiscalConfig` reads. */
function seedFiscalSettings(overrides: DocData = {}) {
  store.set('storeSettings/fiscal', {
    ambiente: 'homologacao',
    inscricaoEstadual: '123456789',
    crt: 1,
    cfop: '5102',
    ncm: '19059090',
    csosn: '102',
    unidade: 'UN',
    naturezaOperacao: 'Venda de mercadoria',
    serieNfe: 1,
    serieNfce: 2,
    cscId: '1',
    cscEnc: 'CSC-TOKEN-PLAINTEXT',
    certStoragePath: 'fiscal/certificates/cert.pfx',
    certPasswordEnc: 'cert-password',
    ...overrides,
  });
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
    pagamentos: [{ id: 'g1', metodo: 'PIX', valor: 100 }],
    orcamentos: [
      {
        id: 'o1',
        isAtivo: true,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        itens: [
          { id: 'i1', produtoId: 'prod-1', nome: 'Bolo de Chocolate', precoUnitario: 50, quantidade: 2, total: 100 },
        ],
      },
    ],
    ...overrides,
  });
}

function authorizedResponse(
  accessKey: string,
  opts: { qrCode?: string; urlChave?: string } = {},
) {
  const supl =
    opts.qrCode || opts.urlChave
      ? { infNFeSupl: { qrCode: opts.qrCode, urlChave: opts.urlChave } }
      : {};
  return {
    success: true,
    xMotivo: [{ chNFe: accessKey, xMotivo: 'Autorizado o uso da NF-e', cStat: '100' }],
    xmls: [
      {
        NFe: { infNFe: { '@_Id': `NFe${accessKey}`, '@_versao': '4.00' }, ...supl },
        protNFe: { infProt: { chNFe: accessKey, nProt: '135250000000123', cStat: '100' } },
      },
    ],
  };
}

function makeRequest(id: string, body: DocData = {}) {
  return new NextRequest(`http://localhost/api/pedidos/${id}/nf`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  store.clear();
  savedFiles.length = 0;
  vi.clearAllMocks();
  resetFiscalProviderForTesting(); // config-cache is keyed on config; reset between cases
  currentAuth = { uid: 'u1', role: 'admin' };
  wiz.lastPayload55 = null;
  wiz.lastPayload65 = null;
  wiz.response55 = null;
  wiz.response65 = null;
  wiz.loadEnvCalls = 0;
  seedFiscalSettings();
});

afterEach(async () => {
  await fsp.rm(`/tmp/fiscal-xml/${KEY_55}.xml`, { force: true }).catch(() => {});
  await fsp.rm(`/tmp/fiscal-xml/${KEY_65}.xml`, { force: true }).catch(() => {});
});

describe('fiscal emission — end-to-end wiring (real registry/config/mapping/danfe)', () => {
  it('ONLINE + PAGO → model 55 → AUTORIZADA: persists order + writes DANFE/XML to storage', async () => {
    seedPedido('p1', {
      origem: 'ONLINE',
      statusPagamento: 'PAGO',
      billing: { nome: 'Maria', cpfCnpj: '39053344705', email: 'm@x.com' },
    });
    store.set('clients/c1', { name: 'Maria Silva', email: 'maria@x.com' });
    wiz.response55 = authorizedResponse(KEY_55);

    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.nf.modelo).toBe(55);
    expect(json.data.nf.accessKey).toBe(KEY_55);
    expect(json.data.nf.protocolo).toBe('135250000000123');
    expect(json.data.nf.ambiente).toBe('homologacao');

    // The REAL mapping ran: the FiscalEmitInput the route built became the
    // NFeWizard payload the library received. Prove the shape/field parity.
    const payload = wiz.lastPayload55;
    expect(payload).toBeTruthy();
    expect(payload.NFe.infNFe.ide.mod).toBe(55);
    expect(payload.NFe.infNFe.ide.nNF).toBe(json.data.nf.numero);
    expect(payload.NFe.infNFe.det[0].prod.xProd).toBe('Bolo de Chocolate');
    expect(payload.NFe.infNFe.det[0].prod.vProd).toBe('100.00');
    expect(payload.NFe.infNFe.emit.CNPJCPF).toMatch(/^\d+$/); // issuer from company-info
    expect(payload.NFe.infNFe.dest.CNPJCPF).toBe('39053344705');
    expect(wiz.loadEnvCalls).toBe(1);

    // Order stamped.
    const stored = store.get('pedidos/p1')!;
    expect(stored.nfStatus).toBe('EMITIDA');
    expect(stored.nfModelo).toBe(55);
    expect(stored.nfProvider).toBe('nfewizard');
    expect(stored.nfAccessKey).toBe(KEY_55);
    expect(stored.nfXmlPath).toBe(`fiscal/homologacao/p1/${KEY_55}.xml`);
    expect(stored.nfDanfePath).toBe(`fiscal/homologacao/p1/${KEY_55}.pdf`);

    // DANFE + XML written to (mocked) Storage — real danfe.ts read the PDF back.
    const paths = savedFiles.map((f) => f.path).sort();
    expect(paths).toEqual([
      `fiscal/homologacao/p1/${KEY_55}.pdf`,
      `fiscal/homologacao/p1/${KEY_55}.xml`,
    ]);
    const pdf = savedFiles.find((f) => f.path.endsWith('.pdf'))!;
    expect(pdf.contentType).toBe('application/pdf');
    expect(pdf.buffer.toString()).toContain('%PDF-1.4 danfe bytes');
  });

  it('LOJA + CSC configured → model 65 → AUTORIZADA: persists QR code / urlChave / ambiente', async () => {
    seedPedido('p1', { origem: 'LOJA' });
    wiz.response65 = authorizedResponse(KEY_65, {
      qrCode: 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=CHAVE|2|1',
      urlChave: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta',
    });

    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.nf.modelo).toBe(65);
    expect(json.data.nf.qrCode).toContain('qrcode?p=');
    expect(json.data.nf.urlChave).toContain('consulta');

    // Real client.ts built the model-65 wizard config and the CSC gate passed.
    const payload = wiz.lastPayload65;
    expect(payload.NFe.infNFe.ide.mod).toBe(65);
    expect(payload.NFe.infNFe.ide.tpImp).toBe(4); // NFC-e print layout
    expect(payload.NFe.infNFe.ide.indPres).toBe(1);

    const stored = store.get('pedidos/p1')!;
    expect(stored.nfStatus).toBe('EMITIDA');
    expect(stored.nfModelo).toBe(65);
    expect(stored.nfQrCode).toBe(json.data.nf.qrCode);
    expect(stored.nfUrlChave).toBe(json.data.nf.urlChave);
    expect(stored.nfAmbiente).toBe('homologacao');
  });

  it('SEFAZ rejection (cStat 204) → 422 and the order is left untouched', async () => {
    seedPedido('p1', { origem: 'LOJA', nfSentinel: 'untouched' });
    const before = structuredClone(store.get('pedidos/p1'));
    wiz.response65 = {
      success: false,
      xMotivo: [{ cStat: '204', xMotivo: 'Duplicidade de NF-e' }],
      xmls: [],
    };

    const res = await POST(makeRequest('p1'), params('p1'));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.rejection).toEqual({ code: '204', message: 'Duplicidade de NF-e' });
    // Order document untouched, nothing archived.
    expect(store.get('pedidos/p1')).toEqual(before);
    expect(savedFiles).toHaveLength(0);
  });
});
