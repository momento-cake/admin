/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firebase admin mock ----------------------------------------------------
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockSave = vi.fn();
// Public-exposure methods must NEVER be invoked for the certificate — it stays private.
const mockMakePublic = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockFile = vi.fn(() => ({
  save: mockSave,
  makePublic: mockMakePublic,
  getSignedUrl: mockGetSignedUrl,
}));
const mockGetFiscalBucket = vi.fn(() => ({ file: mockFile }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  getFiscalBucket: () => mockGetFiscalBucket(),
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

// ---- api-auth mock ----------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return {
    ...actual,
    getAuthFromRequest: vi.fn(async () => currentAuth),
  };
});

import * as apiAuth from '@/lib/api-auth';
import { decryptPii, resetBillingEncryptionForTesting } from '@/lib/billing-encryption';
import { GET, PUT } from '@/app/api/fiscal-settings/route';
import { POST as CERT_POST } from '@/app/api/fiscal-settings/certificate/route';

const validBody = {
  ambiente: 'homologacao',
  inscricaoEstadual: '123456789012',
  crt: 1,
  cfop: '5102',
  ncm: '19059090',
  csosn: '102',
  unidade: 'UN',
  naturezaOperacao: 'Venda de mercadoria',
  serieNfe: 1,
  serieNfce: 1,
};

function makeJsonRequest(method: 'GET' | 'PUT', body?: unknown) {
  return new NextRequest('http://localhost:3001/api/fiscal-settings', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

// The route only calls `request.formData()`; getAuthFromRequest is mocked and
// ignores the request. A minimal stub avoids NextRequest's strict multipart
// content-type parsing in the test environment.
function makeFormRequest(formData: FormData) {
  return { formData: async () => formData } as unknown as NextRequest;
}

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockReset();
  mockSave.mockReset();
  mockMakePublic.mockReset();
  mockGetSignedUrl.mockReset();
  mockDoc.mockClear();
  mockCollection.mockClear();
  mockFile.mockClear();
  mockGetFiscalBucket.mockClear();
  currentAuth = null;
  vi.mocked(apiAuth.getAuthFromRequest).mockImplementation(async () => currentAuth as any);
  resetBillingEncryptionForTesting();
});

describe('GET /api/fiscal-settings', () => {
  it('returns 401 when unauthenticated', async () => {
    currentAuth = null;
    const res = await GET(makeJsonRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin (atendente)', async () => {
    currentAuth = { uid: 'a1', role: 'atendente' };
    const res = await GET(makeJsonRequest('GET'));
    expect(res.status).toBe(403);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns defaults when the doc is missing', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ exists: false });

    const res = await GET(makeJsonRequest('GET'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({ ambiente: 'homologacao', hasCert: false, hasCsc: false });
  });

  it('returns 500 when Firestore read throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockRejectedValueOnce(new Error('read failed'));
    const res = await GET(makeJsonRequest('GET'));
    expect(res.status).toBe(500);
  });

  it('strips encrypted secrets and exposes presence booleans', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ...validBody,
        cscId: '000001',
        cscEnc: 'enc:v1:xxxx',
        certStoragePath: 'fiscal/certificates/cert.pfx',
        certFileName: 'cert.pfx',
        certPasswordEnc: 'enc:v1:yyyy',
      }),
    });

    const res = await GET(makeJsonRequest('GET'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.certPasswordEnc).toBeUndefined();
    expect(json.data.cscEnc).toBeUndefined();
    expect(json.data.hasCert).toBe(true);
    expect(json.data.hasCsc).toBe(true);
    expect(json.data.certFileName).toBe('cert.pfx');
    expect(json.data.cscId).toBe('000001');
  });
});

describe('PUT /api/fiscal-settings', () => {
  it('returns 401 when unauthenticated', async () => {
    currentAuth = null;
    const res = await PUT(makeJsonRequest('PUT', validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-admin (producao)', async () => {
    currentAuth = { uid: 'p1', role: 'producao' };
    const res = await PUT(makeJsonRequest('PUT', validBody));
    expect(res.status).toBe(403);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid input', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    const res = await PUT(makeJsonRequest('PUT', { ...validBody, cfop: 'bad' }));
    expect(res.status).toBe(400);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('persists validated fields and never stores raw secrets', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSet.mockResolvedValueOnce(undefined);

    const res = await PUT(
      makeJsonRequest('PUT', {
        ...validBody,
        cscId: '000001',
        csc: 'CSC-PLAINTEXT',
        certPassword: 'PFX-PLAINTEXT',
      }),
    );
    expect(res.status).toBe(200);

    const written = mockSet.mock.calls[0][0];
    // Raw secrets must not be persisted under their input keys.
    expect(written.csc).toBeUndefined();
    expect(written.certPassword).toBeUndefined();
    // Encrypted forms are stored and decrypt back to the plaintext.
    expect(decryptPii(written.cscEnc)).toBe('CSC-PLAINTEXT');
    expect(decryptPii(written.certPasswordEnc)).toBe('PFX-PLAINTEXT');
    expect(written.updatedBy).toBe('admin');
    expect(written.cfop).toBe('5102');
  });

  it('persists an optional cst when provided', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSet.mockResolvedValueOnce(undefined);

    const res = await PUT(makeJsonRequest('PUT', { ...validBody, cst: '00' }));
    expect(res.status).toBe(200);
    expect(mockSet.mock.calls[0][0].cst).toBe('00');
  });

  it('omits cst from the write when not provided', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSet.mockResolvedValueOnce(undefined);

    await PUT(makeJsonRequest('PUT', validBody));
    expect('cst' in mockSet.mock.calls[0][0]).toBe(false);
  });

  it('does not write CSC/cert secrets when they are not provided', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSet.mockResolvedValueOnce(undefined);

    await PUT(makeJsonRequest('PUT', validBody));

    const written = mockSet.mock.calls[0][0];
    expect(written.cscEnc).toBeUndefined();
    expect(written.certPasswordEnc).toBeUndefined();
  });

  it('returns 500 when Firestore set throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSet.mockRejectedValueOnce(new Error('write failed'));
    const res = await PUT(makeJsonRequest('PUT', validBody));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/fiscal-settings/certificate', () => {
  function makeCert(name = 'cert.pfx', type = 'application/x-pkcs12', bytes = 'PFX-CONTENT') {
    const file = new File([bytes], name, { type });
    // jsdom's File lacks arrayBuffer(); the route reads bytes via it.
    (file as any).arrayBuffer = async () => Buffer.from(bytes);
    return file;
  }

  it('returns 401 when unauthenticated', async () => {
    currentAuth = null;
    const fd = new FormData();
    fd.append('file', makeCert());
    const res = await CERT_POST(makeFormRequest(fd));
    expect(res.status).toBe(401);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-admin', async () => {
    currentAuth = { uid: 'a1', role: 'atendente' };
    const fd = new FormData();
    fd.append('file', makeCert());
    const res = await CERT_POST(makeFormRequest(fd));
    expect(res.status).toBe(403);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns 500 when the storage upload throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSave.mockRejectedValueOnce(new Error('upload failed'));
    const fd = new FormData();
    fd.append('file', makeCert());
    const res = await CERT_POST(makeFormRequest(fd));
    expect(res.status).toBe(500);
  });

  it('returns 400 when no file is present', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    const res = await CERT_POST(makeFormRequest(new FormData()));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid file type', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    const fd = new FormData();
    fd.append('file', makeCert('notes.txt', 'text/plain'));
    const res = await CERT_POST(makeFormRequest(fd));
    expect(res.status).toBe(400);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('uploads bytes to private storage and records metadata (with encrypted password)', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSave.mockResolvedValueOnce(undefined);
    mockSet.mockResolvedValueOnce(undefined);

    const fd = new FormData();
    fd.append('file', makeCert());
    fd.append('password', 'PFX-PW');

    const res = await CERT_POST(makeFormRequest(fd));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.hasCert).toBe(true);

    // Bytes saved to the fixed private path, no public URL involved.
    expect(mockFile).toHaveBeenCalledWith('fiscal/certificates/cert.pfx');
    expect(mockSave).toHaveBeenCalled();
    // The cert must stay private: never make it public or mint a signed URL.
    expect(mockMakePublic).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();

    const meta = mockSet.mock.calls[0][0];
    expect(meta.certStoragePath).toBe('fiscal/certificates/cert.pfx');
    expect(meta.certFileName).toBe('cert.pfx');
    expect(decryptPii(meta.certPasswordEnc)).toBe('PFX-PW');
  });

  it('uploads without a password when none is supplied', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockSave.mockResolvedValueOnce(undefined);
    mockSet.mockResolvedValueOnce(undefined);

    const fd = new FormData();
    fd.append('file', makeCert());

    const res = await CERT_POST(makeFormRequest(fd));
    expect(res.status).toBe(200);
    const meta = mockSet.mock.calls[0][0];
    expect(meta.certPasswordEnc).toBeUndefined();
  });
});
