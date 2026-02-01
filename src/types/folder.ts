import { Timestamp } from 'firebase/firestore'
import { GalleryImage } from './image'

/**
 * Represents an image folder (collection) that can be shared publicly.
 *
 * @remarks
 * Folders are collections of gallery images that can be shared via public URLs.
 * Images are referenced by ID, not copied. Folders support optional client binding
 * and soft delete functionality.
 *
 * @example
 * ```typescript
 * const folder: ImageFolder = {
 *   id: 'folder_001',
 *   name: 'Casamento Maria & João',
 *   slug: 'casamento-maria-joao-2024',
 *   description: 'Fotos do bolo de casamento',
 *   imageIds: ['img_001', 'img_002', 'img_003'],
 *   clientId: 'client_123',
 *   clientName: 'Maria Silva',
 *   isPublic: true,
 *   createdBy: 'user_456',
 *   createdAt: Timestamp.now(),
 *   updatedAt: Timestamp.now(),
 *   isActive: true
 * };
 * ```
 */
export interface ImageFolder {
  /** Unique Firestore document ID */
  id: string

  /** Folder display name (required, max 100 chars) */
  name: string

  /** URL-friendly unique identifier for public access */
  slug: string

  /** Optional public description for the folder */
  description?: string

  /** Array of GalleryImage IDs in this folder (references, not copies) */
  imageIds: string[]

  /** Optional client ID if folder is bound to a client */
  clientId?: string

  /** Denormalized client name for display (performance optimization) */
  clientName?: string

  /** Cover image ID for previews (defaults to first image) */
  coverImageId?: string

  /** Whether the folder is publicly accessible */
  isPublic: boolean

  /** UID of user who created this folder */
  createdBy: string

  /** Timestamp of folder creation */
  createdAt: Timestamp

  /** Timestamp of last update */
  updatedAt: Timestamp

  /** Whether folder is still active (soft delete) */
  isActive: boolean
}

/**
 * Extended folder type with resolved image objects for display.
 *
 * @remarks
 * Used when displaying folders with full image information instead of just IDs.
 */
export interface ImageFolderWithImages extends Omit<ImageFolder, 'imageIds'> {
  /** Full image objects instead of just IDs */
  images: GalleryImage[]

  /** Original image IDs for reference */
  imageIds: string[]
}

/**
 * Public-safe folder projection (excludes internal data).
 *
 * @remarks
 * Used for public gallery access. Excludes sensitive fields like createdBy.
 */
export interface PublicFolder {
  /** Unique folder ID */
  id: string

  /** Folder display name */
  name: string

  /** URL slug for public access */
  slug: string

  /** Optional public description */
  description?: string

  /** Cover image URL for previews */
  coverImageUrl?: string

  /** Number of images in the folder */
  imageCount: number
}

/**
 * Public-safe image projection (excludes internal data like tags).
 *
 * @remarks
 * Used for public gallery access. Excludes tags, uploadedBy, and storagePath.
 */
export interface PublicFolderImage {
  /** Image ID */
  id: string

  /** Public download URL for the full image */
  url: string

  /** Public download URL for the thumbnail */
  thumbnailUrl?: string

  /** Image width in pixels */
  width: number

  /** Image height in pixels */
  height: number

  /** Optional description or alt text */
  description?: string

  /** Whether this is an external reference (e.g., Pinterest) */
  isExternal: boolean
}

/**
 * Extended public folder with resolved image objects.
 */
export interface PublicFolderWithImages extends PublicFolder {
  /** Full public image objects */
  images: PublicFolderImage[]
}

// Form data types

/**
 * Form data for creating a new folder.
 */
export interface CreateFolderData {
  /** Folder display name (required) */
  name: string

  /** URL-friendly slug (auto-generated if not provided) */
  slug?: string

  /** Optional public description */
  description?: string

  /** Array of image IDs to include in the folder */
  imageIds: string[]

  /** Optional client ID to bind the folder to */
  clientId?: string

  /** Cover image ID (defaults to first image) */
  coverImageId?: string

  /** Whether the folder is publicly accessible (defaults to true) */
  isPublic?: boolean
}

/**
 * Form data for updating an existing folder.
 */
export interface UpdateFolderData {
  /** Folder display name */
  name?: string

  /** URL-friendly slug */
  slug?: string

  /** Optional public description (null to clear) */
  description?: string | null

  /** Array of image IDs */
  imageIds?: string[]

  /** Client ID to bind (null to unbind) */
  clientId?: string | null

  /** Cover image ID (null to clear) */
  coverImageId?: string | null

  /** Whether the folder is publicly accessible */
  isPublic?: boolean
}

// Query and filter types

/**
 * Filters for searching and filtering folders.
 */
export interface FolderQueryFilters {
  /** Text search in folder name or description */
  searchQuery?: string

  /** Filter by client ID */
  clientId?: string

  /** Filter by public status */
  isPublic?: boolean

  /** Sort by field */
  sortBy?: 'createdAt' | 'name' | 'updatedAt'

  /** Sort direction */
  sortOrder?: 'asc' | 'desc'

  /** Number of items per page */
  limit?: number

  /** Page number (1-indexed) */
  page?: number
}

// API response types

/**
 * Response type for folder list queries.
 */
export interface FoldersResponse {
  /** Whether the operation was successful */
  success: boolean

  /** Array of folders */
  folders: ImageFolder[]

  /** Total number of folders matching the query */
  total: number

  /** Current page number */
  page: number

  /** Number of items per page */
  limit: number

  /** Whether there are more pages available */
  hasMore: boolean
}

/**
 * Response type for single folder operations.
 */
export interface FolderResponse {
  /** Whether the operation was successful */
  success: boolean

  /** The folder data */
  data: ImageFolder

  /** Optional message */
  message?: string
}

/**
 * Response type for folder with images.
 */
export interface FolderWithImagesResponse {
  /** Whether the operation was successful */
  success: boolean

  /** The folder data with resolved images */
  data: ImageFolderWithImages

  /** Optional message */
  message?: string
}
