import { describe, it, expect } from 'vitest';
import {
  mapEmitResult,
  mapCancelResult,
  mapQueryResult,
} from '@/lib/fiscal/nfewizard/map-result';
import type { MapEmitResultContext } from '@/lib/fiscal/nfewizard/map-result';

const ctx55: MapEmitResultContext = {
  modelo: 55,
  serie: 1,
  numero: 7,
  emittedAt: new Date('2026-07-26T13:00:00Z'),
};

describe('mapEmitResult', () => {
  it('maps an authorized response (cStat 100)', () => {
    const r = mapEmitResult(
      {
        success: true,
        xMotivo: [{ chNFe: 'A'.repeat(44), xMotivo: 'Autorizado', cStat: '100' }],
        xmls: [{ NFe: { infNFe: {} }, protNFe: { infProt: { nProt: '123' } } }],
      },
      { ...ctx55, xml: '<nfeProc/>' },
    );
    expect(r.status).toBe('AUTORIZADA');
    expect(r.accessKey).toBe('A'.repeat(44));
    expect(r.protocolo).toBe('123');
    expect(r.xml).toBe('<nfeProc/>');
  });

  it('treats cStat 150 (autorizado fora de prazo) as AUTORIZADA', () => {
    const r = mapEmitResult(
      { xMotivo: [{ chNFe: 'B'.repeat(44), cStat: 150 }], xmls: [{ protNFe: { infProt: {} } }] },
      ctx55,
    );
    expect(r.status).toBe('AUTORIZADA');
    expect(r.xml).toBeUndefined();
  });

  it('reads status from the protNFe infProt when xMotivo is absent', () => {
    const r = mapEmitResult(
      {
        // single object (not array) exercises the normalization helper
        xmls: { protNFe: { infProt: { chNFe: 'C'.repeat(44), nProt: '9', cStat: '100' } } },
      },
      ctx55,
    );
    expect(r.status).toBe('AUTORIZADA');
    expect(r.accessKey).toBe('C'.repeat(44));
    expect(r.protocolo).toBe('9');
  });

  it('maps a rejection cStat to REJEITADA with the motivo', () => {
    const r = mapEmitResult(
      { xMotivo: [{ xMotivo: 'Duplicidade', cStat: '204' }], xmls: [] },
      ctx55,
    );
    expect(r.status).toBe('REJEITADA');
    expect(r.rejection).toEqual({ code: '204', message: 'Duplicidade' });
  });

  it('maps denegação codes to DENEGADA', () => {
    for (const code of ['301', '302', '303']) {
      const r = mapEmitResult({ xMotivo: [{ cStat: code }] }, ctx55);
      expect(r.status).toBe('DENEGADA');
      expect(r.rejection?.message).toBe('Nota não autorizada pela SEFAZ');
    }
  });

  it('returns ERRO when there is no status, using message as the reason', () => {
    const r = mapEmitResult({ success: false, message: 'timeout na SEFAZ' }, ctx55);
    expect(r.status).toBe('ERRO');
    expect(r.rejection).toEqual({ code: 'no_status', message: 'timeout na SEFAZ' });
  });

  it('returns ERRO with a default reason for an empty/undefined response', () => {
    const r = mapEmitResult(undefined, ctx55);
    expect(r.status).toBe('ERRO');
    expect(r.rejection?.code).toBe('no_status');
    expect(r.rejection?.message).toMatch(/sem status/i);
  });

  it('captures the QR code and urlChave only for model 65', () => {
    const supl = { qrCode: 'qr', urlChave: 'url' };
    const authorized = {
      xMotivo: [{ chNFe: 'D'.repeat(44), cStat: '100' }],
      xmls: [{ NFe: { infNFeSupl: supl }, protNFe: { infProt: { nProt: '1' } } }],
    };
    const r65 = mapEmitResult(authorized, { ...ctx55, modelo: 65 });
    expect(r65.qrCode).toBe('qr');
    expect(r65.urlChave).toBe('url');

    const r55 = mapEmitResult(authorized, ctx55);
    expect(r55.qrCode).toBeUndefined();
    expect(r55.urlChave).toBeUndefined();
  });
});

describe('mapCancelResult', () => {
  const ctx = { accessKey: 'A'.repeat(44), cancelledAt: new Date('2026-07-27T10:00:00Z') };

  it('maps cStat 135 (evento registrado) to CANCELADA with nProt from infEvento', () => {
    const r = mapCancelResult(
      [{ retEvento: { infEvento: { cStat: '135', nProt: '900', chNFe: 'A'.repeat(44) } } }],
      { ...ctx, xml: '<procEventoNFe/>' },
    );
    expect(r.status).toBe('CANCELADA');
    expect(r.protocolo).toBe('900');
    expect(r.cancelledAt).toBe(ctx.cancelledAt);
    expect(r.xml).toBe('<procEventoNFe/>');
  });

  it('treats cStat 155 as CANCELADA', () => {
    const r = mapCancelResult({ xMotivos: [{ cStat: 155 }] }, ctx);
    expect(r.status).toBe('CANCELADA');
  });

  it('reads status from the NFC-e xMotivos wrapper', () => {
    const r = mapCancelResult(
      { success: true, xMotivos: [{ cStat: '135', xMotivo: 'ok' }], response: [{ retEvento: { infEvento: { nProt: '77' } } }] },
      ctx,
    );
    expect(r.status).toBe('CANCELADA');
    expect(r.protocolo).toBe('77');
  });

  it('maps a rejection cStat to REJEITADA with the motivo', () => {
    const r = mapCancelResult(
      [{ retEvento: { infEvento: { cStat: '573', xMotivo: 'Duplicidade' } } }],
      ctx,
    );
    expect(r.status).toBe('REJEITADA');
    expect(r.rejection).toEqual({ code: '573', message: 'Duplicidade' });
  });

  it('returns ERRO when there is no cStat anywhere', () => {
    const r = mapCancelResult({ success: true }, ctx);
    expect(r.status).toBe('ERRO');
    expect(r.rejection?.code).toBe('no_status');
  });
});

describe('mapQueryResult', () => {
  it('maps cStat 100 to AUTORIZADA with protocolo', () => {
    const r = mapQueryResult({ cStat: '100', protNFe: { infProt: { nProt: '1' } } });
    expect(r.status).toBe('AUTORIZADA');
    expect(r.protocolo).toBe('1');
  });

  it('maps 101/151 to CANCELADA', () => {
    expect(mapQueryResult({ cStat: '101' }).status).toBe('CANCELADA');
    expect(mapQueryResult({ cStat: 151 }).status).toBe('CANCELADA');
  });

  it('maps 217 to DESCONHECIDA and 302 to DENEGADA', () => {
    expect(mapQueryResult({ cStat: '217' }).status).toBe('DESCONHECIDA');
    expect(mapQueryResult({ cStat: '302' }).status).toBe('DENEGADA');
  });

  it('defaults unknown/absent cStat to DESCONHECIDA', () => {
    expect(mapQueryResult({}).status).toBe('DESCONHECIDA');
    expect(mapQueryResult(undefined).status).toBe('DESCONHECIDA');
  });
});
