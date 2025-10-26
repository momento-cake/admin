import { Timestamp } from 'firebase/firestore'

/**
 * Contact Method Type
 */
export type ContactMethodType =
  | 'phone'
  | 'email'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'other'

/**
 * Contact Method interface
 */
export interface ContactMethod {
  id: string
  type: ContactMethodType
  value: string
  isPrimary: boolean
  notes?: string
}

/**
 * Relationship Type
 */
export type RelationshipType =
  | 'child'
  | 'parent'
  | 'sibling'
  | 'friend'
  | 'spouse'
  | 'other'

/**
 * Related Person interface
 */
export interface RelatedPerson {
  id: string
  name: string
  relationship: RelationshipType
  email?: string
  phone?: string
  birthDate?: string // ISO format date
  notes?: string
}

/**
 * Special Date Type
 */
export type SpecialDateType = 'birthday' | 'anniversary' | 'custom'

/**
 * Special Date interface
 */
export interface SpecialDate {
  id: string
  date: string // ISO format date (YYYY-MM-DD)
  type: SpecialDateType
  description: string
  relatedPersonId?: string
  notes?: string
}

/**
 * Address interface
 */
export interface Address {
  cep?: string
  estado?: string
  cidade?: string
  bairro?: string
  endereco?: string
  numero?: string
  complemento?: string
}

/**
 * Company Info - Business clients only
 */
export interface CompanyInfo {
  cnpj: string
  companyName: string
  businessType?: string
  inscricaoEstadual?: string
  companyPhone?: string
  companyEmail?: string
}

/**
 * Representative - Business clients only
 */
export interface Representative {
  name: string
  email: string
  phone: string
  role?: string
  cpf?: string
}

/**
 * Customer Preferences
 */
export interface Preferences {
  preferredContact?: 'phone' | 'email' | 'whatsapp' | 'other'
  marketingConsent?: boolean
  communicationPreference?: string
}

/**
 * Personal Client type
 */
export interface PersonalClient {
  id: string
  type: 'person'
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
  address?: Address
  contactMethods: ContactMethod[]
  relatedPersons?: RelatedPerson[]
  specialDates?: SpecialDate[]
  notes?: string
  tags?: string[]
  preferences?: Preferences
  isActive: boolean
  createdAt: Timestamp
  updatedAt?: Timestamp
  createdBy?: string
  lastModifiedBy?: string
}

/**
 * Business Client type
 */
export interface BusinessClient {
  id: string
  type: 'business'
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
  address?: Address
  contactMethods: ContactMethod[]
  companyInfo: CompanyInfo
  representative: Representative
  relatedPersons?: RelatedPerson[]
  specialDates?: SpecialDate[]
  notes?: string
  tags?: string[]
  preferences?: Preferences
  isActive: boolean
  createdAt: Timestamp
  updatedAt?: Timestamp
  createdBy?: string
  lastModifiedBy?: string
}

/**
 * Client Union type - Can be either Personal or Business
 */
export type Client = PersonalClient | BusinessClient

/**
 * Client type discriminator
 */
export type ClientType = 'person' | 'business'

/**
 * API Response wrapper for client operations
 */
export interface ClientApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: Array<{
    field: string
    message: string
  }>
}

/**
 * List response with pagination
 */
export interface ClientListResponse {
  success: boolean
  clients: Client[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * Client query filters
 */
export interface ClientQueryFilters {
  searchQuery?: string
  type?: ClientType
  sortBy?: 'name' | 'created' | 'updated'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  page?: number
}
