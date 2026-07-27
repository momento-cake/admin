/**
 * Assembles the fully-resolved `FiscalConfig` the emission providers need from
 * the `storeSettings/fiscal` Firestore doc plus the A1 certificate stored in
 * private Cloud Storage.
 *
 * SERVER-ONLY (Node runtime): it decrypts the certificate password and the CSC
 * token, and downloads the raw `.pfx` bytes. Never import this from client code.
 */

import { adminDb, getFiscalBucket } from '@/lib/firebase-admin';
import { decryptPii } from '@/lib/billing-encryption';
import { COMPANY_INFO } from '@/lib/company-info';
import type {
  FiscalAmbiente,
  FiscalConfig,
  FiscalCsc,
  FiscalIssuer,
  FiscalTaxProfile,
} from '@/lib/fiscal/types';

const SETTINGS_COLLECTION = 'storeSettings';
const FISCAL_DOC_ID = 'fiscal';

/** Address components parsed once from the central company profile. */
const ISSUER_LETTERHEAD = {
  cnpj: COMPANY_INFO.cnpj.replace(/\D/g, ''),
  razaoSocial: COMPANY_INFO.legalName,
  nomeFantasia: COMPANY_INFO.tradeName,
  logradouro: 'Rua Samurais',
  numero: '25',
  bairro: 'Vila Maria Alta',
  municipio: 'São Paulo',
  codigoMunicipioIbge: '3550308',
  uf: 'SP',
  cep: COMPANY_INFO.cep.replace(/\D/g, ''),
} as const;

type FiscalDoc = {
  ambiente?: FiscalAmbiente;
  inscricaoEstadual?: string;
  crt?: 1 | 2 | 3;
  cfop?: string;
  ncm?: string;
  csosn?: string;
  cst?: string;
  unidade?: string;
  naturezaOperacao?: string;
  serieNfe?: number;
  serieNfce?: number;
  cscId?: string;
  cscEnc?: string;
  certStoragePath?: string;
  certPasswordEnc?: string;
};

function buildIssuer(doc: FiscalDoc): FiscalIssuer {
  return {
    cnpj: ISSUER_LETTERHEAD.cnpj,
    razaoSocial: ISSUER_LETTERHEAD.razaoSocial,
    nomeFantasia: ISSUER_LETTERHEAD.nomeFantasia,
    inscricaoEstadual: doc.inscricaoEstadual ?? '',
    crt: doc.crt ?? 1,
    logradouro: ISSUER_LETTERHEAD.logradouro,
    numero: ISSUER_LETTERHEAD.numero,
    bairro: ISSUER_LETTERHEAD.bairro,
    municipio: ISSUER_LETTERHEAD.municipio,
    codigoMunicipioIbge: ISSUER_LETTERHEAD.codigoMunicipioIbge,
    uf: ISSUER_LETTERHEAD.uf,
    cep: ISSUER_LETTERHEAD.cep,
  };
}

function buildTaxProfile(doc: FiscalDoc): FiscalTaxProfile {
  return {
    cfop: doc.cfop ?? '',
    ncm: doc.ncm ?? '',
    unidade: doc.unidade ?? 'UN',
    origem: '0',
    csosn: doc.csosn || undefined,
    cst: doc.cst || undefined,
    naturezaOperacao: doc.naturezaOperacao ?? 'Venda de mercadoria',
  };
}

/**
 * Load and resolve the fiscal configuration. Throws when the certificate is not
 * configured (no emission is possible without it).
 */
export async function loadFiscalConfig(): Promise<FiscalConfig> {
  const snapshot = await adminDb
    .collection(SETTINGS_COLLECTION)
    .doc(FISCAL_DOC_ID)
    .get();

  if (!snapshot.exists) {
    throw new Error(
      'Configuração fiscal não encontrada. Configure a emissão de NF-e em Configurações > Fiscal.',
    );
  }

  const doc = (snapshot.data() ?? {}) as FiscalDoc;

  if (!doc.certStoragePath) {
    throw new Error(
      'Certificado digital A1 não configurado. Faça o upload em Configurações > Fiscal.',
    );
  }
  if (!doc.certPasswordEnc) {
    throw new Error(
      'Senha do certificado digital não configurada. Atualize em Configurações > Fiscal.',
    );
  }

  const [pfx] = await getFiscalBucket().file(doc.certStoragePath).download();

  let csc: FiscalCsc | undefined;
  if (doc.cscId && doc.cscEnc) {
    csc = { id: doc.cscId, token: decryptPii(doc.cscEnc) };
  }

  return {
    ambiente: doc.ambiente ?? 'homologacao',
    issuer: buildIssuer(doc),
    taxProfile: buildTaxProfile(doc),
    serieNfe: doc.serieNfe ?? 1,
    serieNfce: doc.serieNfce ?? 1,
    csc,
    cert: {
      pfx,
      password: decryptPii(doc.certPasswordEnc),
    },
  };
}
