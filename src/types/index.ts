// User Role Types
export type UserRole = 
  | 'admin' 
  | 'viewer'

export interface UserModel {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  emailVerified: boolean
  role: {
    type: UserRole
  }
  createdAt?: Date
  lastSignInAt?: Date
  isActive: boolean
  metadata: {
    isInitialAdmin?: boolean
    firstName?: string
    lastName?: string
    phone?: string
    department?: string
    bio?: string
    registeredFrom?: string
    invitationId?: string
  }
}

// Invitation Types
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface UserInvitation {
  id: string
  email: string
  name: string
  role: UserRole
  status: InvitationStatus
  token: string
  invitedBy: string // uid of the admin who sent the invitation
  invitedAt: Date
  expiresAt: Date
  acceptedAt?: Date
  cancelledAt?: Date
  metadata?: {
    department?: string
    notes?: string
  }
}

export interface UserRegistrationData {
  invitationToken: string
  firstName: string
  lastName: string
  email: string // Should match invitation email
  password: string
  phone?: string
  department?: string
  profilePicture?: string
  acceptsTerms: boolean
}


// Client Types
export type ClientType = 'person' | 'business'
export type DocumentType = 'cpf' | 'cnpj'
export type ContactType = 'email' | 'phone' | 'whatsapp'

export interface ClientAddress {
  id: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  cep: string
  reference: string
  isPreferred: boolean
}

export interface ClientContact {
  id: string
  type: ContactType
  value: string
  isPreferred: boolean
}

export interface Client {
  id: string
  name: string
  lastName: string
  description: string
  documentNumber: string
  documentType: DocumentType
  clientType: ClientType
  addresses: ClientAddress[]
  contacts: ClientContact[]
  relatedPersons: unknown[]
  specialDates: unknown[]
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
}

// Ingredient Types
export type PackageUnit = 'kilogram' | 'gram' | 'liter' | 'milliliter' | 'unit'

export interface Ingredient {
  id: string
  name: string
  packageQuantity: number
  packageUnit: PackageUnit
  currentStock: number
  currentPrice: number
  preferredVendorId?: string
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
  notes?: string
}

// Recipe Types
export interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: PackageUnit
  cost: number
}

export interface PreparationStep {
  id: string
  order: number
  description: string
  duration: number
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  preparationSteps: PreparationStep[]
  totalPreparationTime: number
  totalCost: number
  yieldQuantity: number
  yieldUnit: PackageUnit
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
  notes?: string
}

// Vendor Types
export interface Vendor {
  id: string
  name: string
  contact: {
    phone?: string
    email?: string
    address?: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
}