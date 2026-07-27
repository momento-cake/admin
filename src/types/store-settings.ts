import { Timestamp } from 'firebase/firestore'

export interface StoreAddress {
  id: string
  nome: string
  cep?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
  isDefault: boolean
  isActive: boolean
  createdAt: Timestamp
  createdBy: string
}

export interface StoreSettings {
  custoPorKm: number
  updatedAt: Timestamp
  updatedBy: string
}

/**
 * Fiscal (NF-e / NFC-e) configuration, stored as the single Firestore doc
 * `storeSettings/fiscal`. Managed by admins on the /settings/fiscal page.
 *
 * SECURITY: `certPasswordEnc` and `cscEnc` are encrypted at rest via
 * `encryptPii` and MUST never be returned to the client (the GET route strips
 * them). The A1 `.pfx` bytes live in private Storage at `certStoragePath`, never
 * in this doc and never exposed with a public download URL.
 */
export interface FiscalSettings {
  /** SEFAZ environment. */
  ambiente: 'homologacao' | 'producao'
  /** Inscrição Estadual (issuer). */
  inscricaoEstadual: string
  /** Regime tributário: 1 = Simples Nacional, 2 = Simples excesso, 3 = Normal. */
  crt: 1 | 2 | 3
  /** Fixed tax profile applied to every item. */
  cfop: string
  ncm: string
  csosn: string
  /** CST ICMS, used only under Regime Normal (CRT 3). */
  cst?: string
  unidade: string
  naturezaOperacao: string
  /** NF-e (model 55) série. */
  serieNfe: number
  /** NFC-e (model 65) série. */
  serieNfce: number
  /** NFC-e CSC id (idToken). The CSC token itself is stored in `cscEnc`. */
  cscId?: string
  /** Encrypted NFC-e CSC token (via encryptPii). */
  cscEnc?: string
  // --- Certificate (A1 .pfx) metadata; bytes live in private Storage ---
  certStoragePath?: string
  certFileName?: string
  /** Encrypted certificate password (via encryptPii). */
  certPasswordEnc?: string
  /** Certificate expiry, when known. */
  certExpiresAt?: Timestamp
  certUpdatedAt?: Timestamp
  certUpdatedBy?: string
  updatedAt: Timestamp
  updatedBy: string
}

export interface StoreHours {
  id: string
  diaSemana: number
  diaSemanaLabel: string
  abreAs: string
  fechaAs: string
  fechado: boolean
  createdAt: Timestamp
  updatedBy?: string
}

export const DIAS_SEMANA: { diaSemana: number; label: string }[] = [
  { diaSemana: 0, label: 'Domingo' },
  { diaSemana: 1, label: 'Segunda-feira' },
  { diaSemana: 2, label: 'Terça-feira' },
  { diaSemana: 3, label: 'Quarta-feira' },
  { diaSemana: 4, label: 'Quinta-feira' },
  { diaSemana: 5, label: 'Sexta-feira' },
  { diaSemana: 6, label: 'Sábado' },
]
