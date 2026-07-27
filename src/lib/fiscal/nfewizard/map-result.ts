/**
 * Parse the (typed `any`) SEFAZ response from NFeWizard's `NFE_Autorizacao` /
 * `NFCE_Autorizacao` into a normalized {@link FiscalEmitResult}.
 *
 * Response shape (read from the library source — the return of `Exec` in
 * `node_modules/nfewizard-io/dist/index.mjs`, class `NFEAutorizacaoService`, and
 * the mirror in `@nfewizard/nfce`):
 *
 *   {
 *     success: boolean,
 *     xMotivo: [{ chNFe, xMotivo, cStat }],   // one entry per NFe in the lote
 *     xmls:    [{ NFe: { infNFe, infNFeSupl? }, protNFe: { infProt: {...} } }],
 *     emContingencia?: boolean,
 *   }
 *
 * The authorized signed XML string is NOT part of this return (the lib parses it
 * to JSON with attributes stripped), so the caller passes it in via `ctx.xml`
 * when it has persisted it. cStat 100 = autorizado, 150 = autorizado fora de
 * prazo; 301/302/303 = denegada; anything else = rejeitada.
 */
import type {
  FiscalCancelResult,
  FiscalEmitResult,
  FiscalModelo,
  FiscalQueryResult,
} from '../types';

/** Contextual data the response does not carry back, supplied by the caller. */
export interface MapEmitResultContext {
  modelo: FiscalModelo;
  serie: number;
  numero: number;
  emittedAt: Date;
  /** Authorized nfeProc XML, if the caller persisted and read it back. */
  xml?: string;
}

interface InfProt {
  chNFe?: string;
  nProt?: string;
  cStat?: string | number;
  xMotivo?: string;
}

const AUTHORIZED = new Set(['100', '150']);
const DENIED = new Set(['301', '302', '303']);

/** Normalize a field the library may return as a single object or an array. */
function first<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function mapEmitResult(
  response: unknown,
  ctx: MapEmitResultContext,
): FiscalEmitResult {
  const base = {
    modelo: ctx.modelo,
    serie: ctx.serie,
    numero: ctx.numero,
    emittedAt: ctx.emittedAt,
  };

  const res = (response ?? {}) as {
    success?: boolean;
    xMotivo?: Array<{ chNFe?: string; xMotivo?: string; cStat?: string | number }>;
    xmls?: Array<{ NFe?: { infNFeSupl?: { qrCode?: string; urlChave?: string } }; protNFe?: { infProt?: InfProt } }>;
    message?: unknown;
  };

  const motivo = first(res.xMotivo);
  const xml = first(res.xmls);
  const infProt = xml?.protNFe?.infProt;

  const cStat = motivo?.cStat ?? infProt?.cStat;
  const cStatStr = cStat === undefined || cStat === null ? undefined : String(cStat);
  const xMotivo = motivo?.xMotivo ?? infProt?.xMotivo;

  // No status at all ⇒ the call did not produce a recognizable SEFAZ answer.
  if (!cStatStr) {
    return {
      ...base,
      status: 'ERRO',
      rejection: {
        code: 'no_status',
        message:
          typeof res.message === 'string'
            ? res.message
            : 'Resposta da SEFAZ sem status de processamento',
      },
    };
  }

  if (AUTHORIZED.has(cStatStr)) {
    const accessKey = motivo?.chNFe ?? infProt?.chNFe;
    const supl = xml?.NFe?.infNFeSupl;
    return {
      ...base,
      status: 'AUTORIZADA',
      accessKey,
      protocolo: infProt?.nProt,
      ...(ctx.xml ? { xml: ctx.xml } : {}),
      ...(ctx.modelo === 65 && supl?.qrCode ? { qrCode: supl.qrCode } : {}),
      ...(ctx.modelo === 65 && supl?.urlChave ? { urlChave: supl.urlChave } : {}),
    };
  }

  const status = DENIED.has(cStatStr) ? 'DENEGADA' : 'REJEITADA';
  return {
    ...base,
    status,
    rejection: {
      code: cStatStr,
      message: xMotivo ?? 'Nota não autorizada pela SEFAZ',
    },
  };
}

// ---------------------------------------------------------------------------
// Cancellation (evento de cancelamento) + status query
// ---------------------------------------------------------------------------

/** Cancellation event accepted (135) or accepted outside the deadline (155). */
const CANCEL_ACCEPTED = new Set(['135', '155']);

interface InfEvento {
  cStat?: string | number;
  xMotivo?: string;
  chNFe?: string;
  nProt?: string;
}

/**
 * Depth-first search for the first value stored under `key` anywhere in a
 * parsed SEFAZ response. Used to locate `infEvento` regardless of the wrapper
 * shape (NFE_Cancelamento returns the envelope array; NFCE_Cancelamento wraps it
 * in `{ success, xMotivos, response }`).
 */
function deepFind(node: unknown, key: string): unknown {
  if (node === null || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFind(item, key);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (key in obj) return obj[key];
  for (const value of Object.values(obj)) {
    const found = deepFind(value, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

export interface MapCancelResultContext {
  accessKey: string;
  cancelledAt: Date;
  /** Archived cancellation-response XML/record, when the caller captured it. */
  xml?: string;
}

/**
 * Map a cancellation response to {@link FiscalCancelResult}. Reads the top-level
 * `xMotivos[0]` when present (NFC-e shape) and falls back to a nested
 * `infEvento` (NF-e shape). cStat 135/155 ⇒ CANCELADA; otherwise REJEITADA.
 */
export function mapCancelResult(
  response: unknown,
  ctx: MapCancelResultContext,
): FiscalCancelResult {
  const res = (response ?? {}) as {
    xMotivos?: Array<{ cStat?: string | number; xMotivo?: string; chNFe?: string }>;
  };
  const motivo = first(res.xMotivos);
  const infEventoRaw = deepFind(response, 'infEvento');
  const infEvento = first(infEventoRaw as InfEvento | InfEvento[] | undefined);

  const cStat = motivo?.cStat ?? infEvento?.cStat;
  const cStatStr = cStat === undefined || cStat === null ? undefined : String(cStat);
  const xMotivo = motivo?.xMotivo ?? infEvento?.xMotivo;
  const protocolo = infEvento?.nProt;

  if (!cStatStr) {
    return {
      status: 'ERRO',
      rejection: {
        code: 'no_status',
        message: 'Resposta da SEFAZ sem status de cancelamento',
      },
    };
  }

  if (CANCEL_ACCEPTED.has(cStatStr)) {
    return {
      status: 'CANCELADA',
      protocolo,
      cancelledAt: ctx.cancelledAt,
      ...(ctx.xml ? { xml: ctx.xml } : {}),
    };
  }

  return {
    status: 'REJEITADA',
    ...(protocolo ? { protocolo } : {}),
    rejection: {
      code: cStatStr,
      message: xMotivo ?? 'Cancelamento não homologado pela SEFAZ',
    },
  };
}

const QUERY_CANCELLED = new Set(['101', '151', '135', '155']);

/**
 * Map an `NFE_ConsultaProtocolo` response to {@link FiscalQueryResult}. cStat
 * 100 ⇒ AUTORIZADA; 101/151/135/155 ⇒ CANCELADA; 217 (NF-e não consta) ⇒
 * DESCONHECIDA; 301/302/303 ⇒ DENEGADA; anything else ⇒ DESCONHECIDA.
 */
export function mapQueryResult(response: unknown): FiscalQueryResult {
  const res = (response ?? {}) as {
    cStat?: string | number;
    protNFe?: { infProt?: { nProt?: string } };
    procEventoNFe?: unknown;
    xMotivo?: string;
  };
  const cStatStr =
    res.cStat === undefined || res.cStat === null ? undefined : String(res.cStat);
  const protocolo = res.protNFe?.infProt?.nProt;

  let status: FiscalQueryResult['status'];
  if (cStatStr === '100') status = 'AUTORIZADA';
  else if (cStatStr && QUERY_CANCELLED.has(cStatStr)) status = 'CANCELADA';
  else if (cStatStr && DENIED.has(cStatStr)) status = 'DENEGADA';
  else status = 'DESCONHECIDA';

  return {
    status,
    ...(protocolo ? { protocolo } : {}),
  };
}
