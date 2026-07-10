/**
 * Central company profile for customer-facing documents (receipts, etc.).
 *
 * The app has no Firestore-backed company profile, so the issuer letterhead
 * data lives here as a single source of truth. Update these values if the
 * business details change.
 */
export interface CompanyInfo {
  /** Brand name shown prominently in the letterhead. */
  tradeName: string
  /** Legal entity name (razão social). */
  legalName: string
  /** Street address (without CEP). */
  address: string
  /** Postal code. */
  cep: string
  /** Contact phone, pre-formatted. */
  phone: string
  /** CNPJ, pre-formatted. */
  cnpj: string
  /** Contact email. */
  email: string
  /** Public path to the brand logo (served from /public). */
  logoPath: string
}

export const COMPANY_INFO: CompanyInfo = {
  tradeName: 'MOMENTO CAKE',
  legalName: 'Momento Cake LTDA',
  address: 'Rua Samurais, 25 - Vila Maria Alta - São Paulo - SP',
  cep: '02131-080',
  phone: '(11) 94449-9004',
  cnpj: '30.640.317/0001-53',
  email: 'contato@momentocake.com.br',
  logoPath: '/brand/logo.png',
}
