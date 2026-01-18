/**
 * User roles for role-based access control.
 * - `admin`: Full system access including user management
 * - `atendente`: Access to dashboard and client management only
 */
export type UserRole = 'admin' | 'atendente';

/**
 * Portuguese labels for user roles.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
};

/**
 * Feature permission configuration for custom user permissions
 */
export interface FeaturePermissionConfig {
  enabled: boolean;
  actions: ('view' | 'create' | 'update' | 'delete')[];
}

/**
 * Custom permissions that can be assigned to a user by an admin
 * Only applicable to non-admin users (atendente)
 */
export type UserCustomPermissions = Partial<Record<
  'dashboard' | 'users' | 'clients' | 'ingredients' | 'recipes' |
  'products' | 'packaging' | 'orders' | 'reports' | 'settings',
  FeaturePermissionConfig
>>;

/**
 * Represents an authenticated user in the system.
 *
 * @remarks
 * Users are created through invitations and registration. Each user has
 * a unique Firebase UID and email. Roles determine what features they can access.
 * Admins can customize permissions for atendente users.
 *
 * @example
 * ```typescript
 * const admin: UserModel = {
 *   uid: 'user_123',
 *   email: 'admin@example.com',
 *   displayName: 'John Admin',
 *   role: { type: 'admin' },
 *   isActive: true,
 *   emailVerified: true
 * };
 * ```
 */
export interface UserModel {
  /** Unique Firebase user ID */
  uid: string;

  /** User's email address (unique) */
  email: string;

  /** Display name (optional) */
  displayName?: string;

  /** Profile photo URL (optional) */
  photoURL?: string;

  /** Whether email has been verified */
  emailVerified: boolean;

  /** User's role and permissions */
  role: {
    /** Role type (admin or atendente) */
    type: UserRole;
  };

  /**
   * Custom permissions that override role defaults
   * Only applicable to non-admin users
   * Admins always have ALL permissions
   */
  customPermissions?: UserCustomPermissions;

  /**
   * UID of admin who last modified this user's permissions
   */
  permissionsModifiedBy?: string;

  /**
   * When permissions were last modified
   */
  permissionsModifiedAt?: Date;

  /** When the user account was created */
  createdAt?: Date;

  /** When the user last signed in */
  lastSignInAt?: Date;

  /** Whether the user account is active */
  isActive: boolean;

  /** Additional user metadata */
  metadata: {
    /** Whether this was the initial admin user */
    isInitialAdmin?: boolean;

    /** User's first name */
    firstName?: string;

    /** User's last name */
    lastName?: string;

    /** User's phone number */
    phone?: string;

    /** User's department */
    department?: string;

    /** User's bio or description */
    bio?: string;

    /** Source of user registration */
    registeredFrom?: string;

    /** ID of the invitation that created this user */
    invitationId?: string;
  };
}

/**
 * Status of a user invitation.
 * - `pending`: Invitation sent, awaiting user acceptance
 * - `accepted`: User accepted and registered
 * - `expired`: Invitation expired without acceptance
 * - `cancelled`: Invitation was cancelled by an admin
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

/**
 * Represents an invitation to join the system.
 *
 * @remarks
 * Invitations are created by admins and sent to new users via email.
 * Each invitation has an expiration time and can only be used once.
 * The token is used to validate the invitation during registration.
 *
 * @example
 * ```typescript
 * const invitation: UserInvitation = {
 *   id: 'inv_001',
 *   email: 'newuser@example.com',
 *   name: 'New User',
 *   role: 'viewer',
 *   status: 'pending',
 *   token: 'long_secure_token_here',
 *   invitedBy: 'admin_uid',
 *   invitedAt: new Date('2024-01-01'),
 *   expiresAt: new Date('2024-01-08'),
 * };
 * ```
 */
export interface UserInvitation {
  /** Unique invitation ID */
  id: string;

  /** Email address the invitation was sent to */
  email: string;

  /** Name of the invited user */
  name: string;

  /** Role to assign to the user upon acceptance */
  role: UserRole;

  /** Current status of the invitation */
  status: InvitationStatus;

  /** Secure token for validating the invitation */
  token: string;

  /** UID of the admin who created this invitation */
  invitedBy: string;

  /** When the invitation was created */
  invitedAt: Date;

  /** When the invitation expires */
  expiresAt: Date;

  /** When the invitation was accepted (if applicable) */
  acceptedAt?: Date;

  /** When the invitation was cancelled (if applicable) */
  cancelledAt?: Date;

  /** Additional invitation metadata */
  metadata?: {
    /** Department for the new user (optional) */
    department?: string;

    /** Notes from the admin who sent the invitation */
    notes?: string;
  };
}

/**
 * Form data for user registration via invitation.
 *
 * @remarks
 * This data is submitted when a user accepts an invitation
 * and completes their registration.
 */
export interface UserRegistrationData {
  /** Token from the invitation */
  invitationToken: string;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** User's email (must match invitation email) */
  email: string;

  /** User's password (must meet security requirements) */
  password: string;

  /** User's phone number (optional) */
  phone?: string;

  /** User's department (optional) */
  department?: string;

  /** User's profile picture (optional, base64 or URL) */
  profilePicture?: string;

  /** Whether user accepts terms of service */
  acceptsTerms: boolean;
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