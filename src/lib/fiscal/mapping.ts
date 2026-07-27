/**
 * Pure Pedido → NFeWizard payload mapper.
 *
 * Converts a provider-agnostic {@link FiscalEmitInput} into the JSON payload the
 * NFeWizard-io library expects for `NFE_Autorizacao` (model 55) and
 * `NFCE_Autorizacao` (model 65). No I/O, no randomness unless `cNF` is omitted:
 * pass `opts.cNF` for a deterministic payload (tests do this).
 *
 * The full NFeWizard `NFe`/`LayoutNFe` layout type (see
 * `node_modules/@nfewizard/types/dist/src/nfe/NFEAutorizacao.d.ts`) is enormous
 * and carries dozens of optional groups we never emit, so we build a well-typed
 * local subset here and cast at the adapter boundary. Field names match the
 * layout exactly so the library accepts the shape.
 */
import type { FiscalEmitInput } from './types';

/** IBGE código-UF (cUF) by federative unit acronym. */
const UF_TO_CODIGO: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

/** IBGE código-UF (cUF / cOrgão) for a federative unit acronym; SP (35) default. */
export function ufCodigo(uf: string): number {
  return UF_TO_CODIGO[uf] ?? 35;
}

/** Placeholder used when a product has no GTIN/barcode (SEFAZ NT 2017.001). */
const SEM_GTIN = 'SEM GTIN';

/** Homologação forces this exact razão social on the recipient (SEFAZ rule). */
const HOMOLOG_DEST_NOME =
  'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

// ---------------------------------------------------------------------------
// Local typed subset of the NFeWizard NFe payload (only the groups we emit).
// ---------------------------------------------------------------------------

interface PayloadEnder {
  xLgr: string;
  nro: string;
  xCpl?: string;
  xBairro: string;
  cMun: number;
  xMun: string;
  UF: string;
  CEP: string;
  cPais: number;
  xPais: string;
  fone?: string;
}

interface PayloadEmit {
  CNPJCPF: string;
  xNome: string;
  xFant?: string;
  enderEmit: PayloadEnder;
  IE: string;
  CRT: number;
}

interface PayloadDest {
  CNPJCPF: string;
  xNome: string;
  enderDest?: PayloadEnder;
  indIEDest: number;
  IE?: string;
  email?: string;
}

interface PayloadImposto {
  ICMS: Record<string, unknown>;
  PIS: Record<string, unknown>;
  COFINS: Record<string, unknown>;
}

interface PayloadDet {
  prod: {
    cProd: string;
    cEAN: string;
    xProd: string;
    NCM: string;
    CFOP: number;
    uCom: string;
    qCom: number;
    vUnCom: string;
    vProd: string;
    cEANTrib: string;
    uTrib: string;
    qTrib: number;
    vUnTrib: string;
    indTot: number;
  };
  imposto: PayloadImposto;
}

interface PayloadIde {
  cUF: number;
  cNF: string;
  natOp: string;
  mod: number;
  serie: string;
  nNF: number;
  dhEmi: string;
  tpNF: number;
  idDest: number;
  cMunFG: number;
  tpImp: number;
  tpEmis: number;
  tpAmb: number;
  finNFe: number;
  indFinal: number;
  indPres: number;
  procEmi: number;
}

interface PayloadInfNFe {
  ide: PayloadIde;
  emit: PayloadEmit;
  dest?: PayloadDest;
  det: PayloadDet[];
  total: { ICMSTot: Record<string, string> };
  transp: { modFrete: number };
  pag: { detPag: Array<{ indPag: number; tPag: string; vPag: string }> };
  infAdic: { infCpl: string };
}

export interface NfeWizardPayload {
  idLote: number;
  indSinc: number;
  NFe: { infNFe: PayloadInfNFe };
}

export interface BuildFiscalPayloadOptions {
  /** 8-digit código numérico (cNF). Omit to generate a random one. */
  cNF?: string;
}

/** Format a monetary/decimal value to a fixed 2-decimal string (SEFAZ style). */
function money(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

/** Random 8-digit código numérico, distinct-ish from nNF (SEFAZ NT 2019.001). */
function randomCNF(): string {
  return Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, '0');
}

/**
 * ICMS group for the item, chosen by the issuer's regime tributário (CRT):
 * Simples Nacional (1|2) → ICMSSN* keyed by CSOSN; Regime Normal (3) → ICMS*
 * keyed by CST. Values are zeroed — the effective tax is fixed by the
 * accountant-confirmed profile, and Simples ICMS is not itemized on the note.
 */
function buildIcms(
  crt: number,
  origem: number,
  csosn: string | undefined,
  cst: string | undefined,
): Record<string, unknown> {
  const isSimples = crt === 1 || crt === 2;
  if (isSimples) {
    const code = csosn ?? '102';
    if (code === '101') {
      return { ICMSSN101: { orig: origem, CSOSN: 101, pCredSN: 0, vCredICMSSN: 0 } };
    }
    return { ICMSSN102: { orig: origem, CSOSN: Number(code) } };
  }
  // Regime Normal.
  const code = cst ?? '40';
  if (code === '40' || code === '41' || code === '50') {
    return { ICMS40: { orig: origem, CST: code } };
  }
  return {
    ICMS00: {
      orig: origem,
      CST: code,
      modBC: 3,
      vBC: '0.00',
      pICMS: '0.00',
      vICMS: '0.00',
    },
  };
}

/**
 * Minimal PIS/COFINS blocks. CST '49' (outras operações) with zeroed base is a
 * placeholder for Simples issuers — the real apuração is done by the accountant.
 */
function buildPis(): Record<string, unknown> {
  return { PISOutr: { CST: '49', vBC: 0, pPIS: 0, vPIS: 0 } };
}

function buildCofins(): Record<string, unknown> {
  return { COFINSOutr: { CST: '49', vBC: 0, pCOFINS: 0, vCOFINS: 0 } };
}

/** Convert an intra-state CFOP (5xxx) to its interstate counterpart (6xxx). */
function resolveCfop(cfop: string, interestadual: boolean): number {
  if (interestadual && cfop.startsWith('5')) {
    return Number(`6${cfop.slice(1)}`);
  }
  return Number(cfop);
}

/**
 * Build the NFeWizard payload for a single emission. Pure: given the same input
 * and `opts.cNF`, always produces the same object.
 */
export function buildFiscalPayload(
  input: FiscalEmitInput,
  opts: BuildFiscalPayloadOptions = {},
): NfeWizardPayload {
  const { issuer, taxProfile, recipient } = input;
  const isNfce = input.modelo === 65;
  const isHomolog = input.ambiente === 'homologacao';
  const tpAmb = isHomolog ? 2 : 1;

  const recipientUf = recipient?.endereco?.uf;
  const interestadual = !!recipientUf && recipientUf !== issuer.uf;
  const idDest = interestadual ? 2 : 1;

  const cfop = resolveCfop(taxProfile.cfop, interestadual);
  const origem = Number(taxProfile.origem);

  const ide: PayloadIde = {
    cUF: ufCodigo(issuer.uf),
    cNF: opts.cNF ?? randomCNF(),
    natOp: taxProfile.naturezaOperacao,
    mod: input.modelo,
    serie: String(input.serie),
    nNF: input.numero,
    dhEmi: input.emittedAtIso,
    tpNF: 1,
    idDest,
    cMunFG: Number(issuer.codigoMunicipioIbge),
    tpImp: isNfce ? 4 : 1,
    tpEmis: 1,
    tpAmb,
    finNFe: 1,
    indFinal: 1,
    indPres: isNfce ? 1 : 2,
    procEmi: 0,
  };

  const enderEmit: PayloadEnder = {
    xLgr: issuer.logradouro,
    nro: issuer.numero,
    ...(issuer.complemento ? { xCpl: issuer.complemento } : {}),
    xBairro: issuer.bairro,
    cMun: Number(issuer.codigoMunicipioIbge),
    xMun: issuer.municipio,
    UF: issuer.uf,
    CEP: issuer.cep,
    cPais: 1058,
    xPais: 'Brasil',
    ...(issuer.telefone ? { fone: issuer.telefone } : {}),
  };

  const emit: PayloadEmit = {
    CNPJCPF: issuer.cnpj,
    xNome: issuer.razaoSocial,
    ...(issuer.nomeFantasia ? { xFant: issuer.nomeFantasia } : {}),
    enderEmit,
    IE: issuer.inscricaoEstadual,
    CRT: issuer.crt,
  };

  // Destinatário: required for NF-e (55); for NFC-e (65) only when a CPF/CNPJ is
  // provided (anonymous consumer sale otherwise).
  let dest: PayloadDest | undefined;
  const hasRecipientDoc = !!recipient?.cpfCnpj;
  if (!isNfce || hasRecipientDoc) {
    const nome = isHomolog ? HOMOLOG_DEST_NOME : recipient?.nome ?? '';
    dest = {
      CNPJCPF: recipient?.cpfCnpj ?? '',
      xNome: nome,
      indIEDest: recipient?.indicadorIeDestinatario ?? 9,
      ...(recipient?.inscricaoEstadual ? { IE: recipient.inscricaoEstadual } : {}),
      ...(recipient?.email ? { email: recipient.email } : {}),
    };
    if (recipient?.endereco) {
      const e = recipient.endereco;
      dest.enderDest = {
        xLgr: e.logradouro,
        nro: e.numero,
        ...(e.complemento ? { xCpl: e.complemento } : {}),
        xBairro: e.bairro,
        cMun: Number(e.codigoMunicipioIbge ?? issuer.codigoMunicipioIbge),
        xMun: e.municipio,
        UF: e.uf,
        CEP: e.cep,
        cPais: 1058,
        xPais: 'Brasil',
      };
    }
  }

  const det: PayloadDet[] = input.items.map((item) => ({
    prod: {
      cProd: item.codigo,
      cEAN: SEM_GTIN,
      xProd: item.descricao,
      NCM: taxProfile.ncm,
      CFOP: cfop,
      uCom: taxProfile.unidade,
      qCom: item.quantidade,
      vUnCom: money(item.valorUnitario),
      vProd: money(item.valorTotal),
      cEANTrib: SEM_GTIN,
      uTrib: taxProfile.unidade,
      qTrib: item.quantidade,
      vUnTrib: money(item.valorUnitario),
      indTot: 1,
    },
    imposto: {
      ICMS: buildIcms(issuer.crt, origem, taxProfile.csosn, taxProfile.cst),
      PIS: buildPis(),
      COFINS: buildCofins(),
    },
  }));

  const frete = input.frete ?? input.totals.frete ?? 0;

  const total = {
    ICMSTot: {
      vBC: '0.00',
      vICMS: '0.00',
      vICMSDeson: '0.00',
      vFCP: '0.00',
      vBCST: '0.00',
      vST: '0.00',
      vFCPST: '0.00',
      vFCPSTRet: '0.00',
      vProd: money(input.totals.produtos),
      vFrete: money(frete),
      vSeg: '0.00',
      vDesc: money(input.totals.desconto),
      vII: '0.00',
      vIPI: '0.00',
      vIPIDevol: '0.00',
      vPIS: '0.00',
      vCOFINS: '0.00',
      vOutro: money(input.totals.acrescimo ?? 0),
      vNF: money(input.totals.total),
    },
  };

  const infNFe: PayloadInfNFe = {
    ide,
    emit,
    ...(dest ? { dest } : {}),
    det,
    total,
    transp: { modFrete: frete > 0 ? 0 : 9 },
    pag: {
      detPag: input.payments.map((p) => ({
        indPag: 0,
        tPag: p.tPag,
        vPag: money(p.valor),
      })),
    },
    infAdic: { infCpl: `Pedido ${input.numeroPedido}` },
  };

  return { idLote: 1, indSinc: 1, NFe: { infNFe } };
}
