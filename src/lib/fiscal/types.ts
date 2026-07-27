/**
 * Fiscal domain types for Brazilian electronic invoice emission
 * (NF-e model 55 for online orders, NFC-e model 65 for in-store orders).
 *
 * Mirrors the shape of `src/lib/payments/types.ts`: a provider-agnostic domain
 * layer that the NFeWizard adapter (and any future provider) implements. The
 * concrete NFeWizard payload/response types stay inside the adapter — nothing
 * here depends on `nfewizard-io`.
 */

/** SEFAZ environment. `homologacao` = test (no fiscal value); `producao` = live. */
export type FiscalAmbiente = 'homologacao' | 'producao';

/** Fiscal document model: 55 = NF-e (online), 65 = NFC-e (in-store consumer). */
export type FiscalModelo = 55 | 65;

export type FiscalProviderName = 'nfewizard';

/**
 * Outcome of an emission attempt, normalized across providers.
 * `AUTORIZADA` is the only success state; everything else leaves the order
 * un-emitted.
 */
export type FiscalEmitStatus =
  | 'AUTORIZADA'
  | 'REJEITADA'
  | 'DENEGADA'
  | 'ERRO';

/**
 * Issuer (emitente) identity. Seeded from `company-info.ts` and overlaid with
 * the fiscal numbers admins enter in the settings page (IE, CRT). NF-e/NFC-e
 * need more than the receipt letterhead: Inscrição Estadual, regime tributário
 * (CRT), and the IBGE municipality code.
 */
export interface FiscalIssuer {
  cnpj: string; // digits only
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  /** Regime tributário: 1 = Simples Nacional, 2 = Simples excesso, 3 = Regime Normal. */
  crt: 1 | 2 | 3;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  /** IBGE 7-digit municipality code (São Paulo capital = '3550308'). */
  codigoMunicipioIbge: string;
  uf: string; // 'SP'
  cep: string; // digits only
  telefone?: string;
}

/**
 * Recipient (destinatário). For NF-e (55) a CPF/CNPJ is required; for NFC-e (65)
 * the whole recipient is optional (anonymous consumer) unless a CPF is provided.
 */
export interface FiscalRecipient {
  nome: string;
  /** Digits only, already decrypted. Empty/undefined ⇒ anonymous (NFC-e only). */
  cpfCnpj?: string;
  tipo?: 'CPF' | 'CNPJ';
  /** Indicador de IE: 1 = contribuinte, 2 = isento, 9 = não contribuinte. */
  indicadorIeDestinatario?: 1 | 2 | 9;
  inscricaoEstadual?: string;
  email?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    codigoMunicipioIbge?: string;
    uf: string;
    cep: string;
  };
}

/**
 * Single fixed tax profile applied to every item (no per-product tax fields).
 * The concrete values are admin-entered and accountant-confirmed.
 */
export interface FiscalTaxProfile {
  /** CFOP for intra-state consumer sale, e.g. '5102'. Interstate → '6102'. */
  cfop: string;
  ncm: string;
  /** Unidade comercial, e.g. 'UN'. */
  unidade: string;
  /** Origem da mercadoria, e.g. '0' (nacional). */
  origem: string;
  /** CSOSN when Simples Nacional (CRT 1|2), e.g. '102'. */
  csosn?: string;
  /** CST ICMS when Regime Normal (CRT 3). */
  cst?: string;
  /** Natureza da operação, e.g. 'Venda de mercadoria'. */
  naturezaOperacao: string;
}

/** NFC-e security code (Código de Segurança do Contribuinte), per ambiente. */
export interface FiscalCsc {
  /** The CSC token (secret). */
  token: string;
  /** The CSC id (idToken), a small integer as string. */
  id: string;
}

/**
 * Fully-resolved fiscal configuration the provider needs. Assembled by
 * `loadFiscalConfig()` from `storeSettings/fiscal` + the certificate in Storage.
 * The certificate password and CSC are decrypted here; never expose this to the
 * client.
 */
export interface FiscalConfig {
  ambiente: FiscalAmbiente;
  issuer: FiscalIssuer;
  taxProfile: FiscalTaxProfile;
  serieNfe: number;
  serieNfce: number;
  /** NFC-e CSC (required to emit model 65). Absent ⇒ NFC-e unavailable. */
  csc?: FiscalCsc;
  cert: {
    /** Raw .pfx bytes from private Storage. */
    pfx: Buffer;
    password: string;
  };
}

/**
 * Everything the pure `buildFiscalPayload` mapper + the provider need for one
 * emission. Recipient resolution / decryption happens in the API route before
 * this is constructed.
 */
export interface FiscalEmitInput {
  modelo: FiscalModelo;
  serie: number;
  /** Reserved número (nNF), incremented atomically before the SEFAZ call. */
  numero: number;
  ambiente: FiscalAmbiente;
  issuer: FiscalIssuer;
  taxProfile: FiscalTaxProfile;
  recipient?: FiscalRecipient;
  items: FiscalItem[];
  /** Totals resolved from the active orçamento. */
  totals: FiscalTotals;
  payments: FiscalPayment[];
  /** Freight amount (vFrete), 0 when none. */
  frete?: number;
  /** Order reference for the additional-info block. */
  numeroPedido: string;
  /** ISO emission datetime with SP offset (built by the route/mapper). */
  emittedAtIso: string;
}

export interface FiscalItem {
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface FiscalTotals {
  /** Sum of item valorTotal, before discount/surcharge. */
  produtos: number;
  desconto: number;
  acrescimo: number;
  frete: number;
  /** Final note value (vNF). */
  total: number;
}

export interface FiscalPayment {
  /** SEFAZ tPag code: '01' dinheiro, '03' crédito, '04' débito, '17' PIX, '99' outros. */
  tPag: string;
  valor: number;
}

/**
 * Normalized emission result. Model 65 additionally carries the QR payload
 * (`qrCode`) used to render the printed DANFE-NFC-e.
 */
export interface FiscalEmitResult {
  status: FiscalEmitStatus;
  modelo: FiscalModelo;
  serie: number;
  numero: number;
  /** Chave de acesso (44 digits) when AUTORIZADA. Also used as the external id. */
  accessKey?: string;
  protocolo?: string;
  /** Authorized nfeProc XML. */
  xml?: string;
  /** DANFE PDF bytes. */
  danfePdf?: Buffer;
  /** NFC-e (65) only: the infNFeSupl QR code string, and the consulta URL. */
  qrCode?: string;
  urlChave?: string;
  /** SEFAZ rejection detail (cStat/xMotivo) when not AUTORIZADA. */
  rejection?: { code: string; message: string };
  emittedAt: Date;
}

/** Input for a SEFAZ cancellation event (evento de cancelamento). */
export interface FiscalCancelInput {
  modelo: FiscalModelo;
  /** Chave de acesso (44 digits) of the note being cancelled. */
  accessKey: string;
  /** Authorization protocol (nProt) of the original emission. */
  protocolo: string;
  /** Justificativa (xJust), 15–255 chars. */
  justificativa: string;
}

export interface FiscalCancelResult {
  status: 'CANCELADA' | 'REJEITADA' | 'ERRO';
  /** Protocol of the cancellation event when accepted. */
  protocolo?: string;
  /** Authorized cancellation event XML (procEventoNFe). */
  xml?: string;
  rejection?: { code: string; message: string };
  cancelledAt?: Date;
}

export interface FiscalQueryResult {
  status: FiscalEmitStatus | 'CANCELADA' | 'DESCONHECIDA';
  protocolo?: string;
  xml?: string;
}

export class FiscalProviderError extends Error {
  constructor(
    public readonly providerName: FiscalProviderName,
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'FiscalProviderError';
  }
}
