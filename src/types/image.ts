/**
 * Represents a tag that can be applied to images for categorization and search.
 *
 * @remarks
 * Tags are user-defined labels with colors that help organize and filter images.
 * Multiple images can share the same tag, and colors don't need to be unique.
 *
 * @example
 * ```typescript
 * const tag: ImageTag = {
 *   id: 'tag_001',
 *   name: 'Casamento',
 *   color: '#FF6B6B',
 *   createdAt: new Date(),
 *   createdBy: 'user_123',
 *   isActive: true
 * };
 * ```
 */
export interface ImageTag {
  /** Unique Firestore document ID */
  id: string;

  /** Tag name (required, max 50 chars) */
  name: string;

  /** Tag color in hex format (e.g., #FF6B6B) */
  color: string;

  /** Timestamp of tag creation */
  createdAt: Date;

  /** UID of user who created this tag */
  createdBy: string;

  /** Whether tag is still active for use */
  isActive: boolean;
}

/**
 * Represents an image file stored in Firebase Cloud Storage.
 *
 * @remarks
 * Images are stored in Cloud Storage with metadata in Firestore.
 * Each image can have multiple tags for organization and searching.
 * Images support advanced filtering with AND/OR conditions on tags.
 *
 * @example
 * ```typescript
 * const image: GalleryImage = {
 *   id: 'img_001',
 *   originalName: 'bolo-casamento.jpg',
 *   storagePath: 'images/gallery/img_001.jpg',
 *   url: 'https://storage.googleapis.com/...',
 *   thumbnailUrl: 'https://storage.googleapis.com/.../thumb_...',
 *   mimeType: 'image/jpeg',
 *   width: 1920,
 *   height: 1080,
 *   fileSize: 245000,
 *   tags: ['tag_001', 'tag_002'],
 *   uploadedBy: 'user_123',
 *   uploadedAt: new Date(),
 *   isActive: true
 * };
 * ```
 */
export interface GalleryImage {
  /** Unique Firestore document ID */
  id: string;

  /** Original file name when uploaded */
  originalName: string;

  /** Path in Firebase Cloud Storage */
  storagePath: string;

  /** Public download URL for the full image */
  url: string;

  /** Public download URL for the thumbnail (optional) */
  thumbnailUrl?: string;

  /** MIME type of the image (e.g., image/jpeg, image/png) */
  mimeType: string;

  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** File size in bytes */
  fileSize: number;

  /** Array of tag IDs associated with this image */
  tags: string[];

  /** Optional description or alt text for the image */
  description?: string;

  /** UID of user who uploaded this image */
  uploadedBy: string;

  /** Timestamp of image upload */
  uploadedAt: Date;

  /** Timestamp of last update */
  updatedAt: Date;

  /** Whether image is still active (soft delete) */
  isActive: boolean;

  /** Whether this is an external reference (e.g., Pinterest) vs company-created */
  isExternal: boolean;
}

/**
 * Extended image type with resolved tag objects for display.
 *
 * @remarks
 * Used when displaying images with full tag information instead of just IDs.
 */
export interface GalleryImageWithTags extends Omit<GalleryImage, 'tags'> {
  /** Full tag objects instead of just IDs */
  tags: ImageTag[];

  /** Original tag IDs for reference */
  tagIds: string[];
}

// Form data types

/**
 * Form data for creating a new tag.
 */
export interface CreateTagData {
  /** Tag name (required, max 50 chars) */
  name: string;

  /** Tag color in hex format (e.g., #FF6B6B) */
  color: string;
}

/**
 * Form data for updating an existing tag.
 */
export interface UpdateTagData extends Partial<CreateTagData> {
  /** Unique identifier of the tag to update */
  id: string;
}

/**
 * Form data for uploading a new image.
 */
export interface UploadImageData {
  /** The file object to upload */
  file: File;

  /** Array of tag IDs to associate with the image */
  tags: string[];

  /** Optional description or alt text */
  description?: string;
}

/**
 * Form data for updating an existing image's metadata.
 */
export interface UpdateImageData {
  /** Unique identifier of the image to update */
  id: string;

  /** Updated array of tag IDs */
  tags?: string[];

  /** Updated description */
  description?: string;
}

/**
 * Filter mode for tag-based searches.
 * - `AND`: Image must have ALL selected tags
 * - `OR`: Image must have AT LEAST ONE of the selected tags
 */
export type TagFilterMode = 'AND' | 'OR';

/**
 * Filters for searching and filtering images.
 */
export interface ImageFilters {
  /** Text search in image name or description */
  searchQuery?: string;

  /** Tags to include in the search */
  includeTags?: string[];

  /** Tags to exclude from the search */
  excludeTags?: string[];

  /** Filter mode for include tags (AND/OR) */
  includeMode?: TagFilterMode;

  /** Filter mode for exclude tags (AND/OR) */
  excludeMode?: TagFilterMode;

  /** Sort by field */
  sortBy?: 'uploadedAt' | 'originalName' | 'fileSize';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Predefined tag colors for the color picker.
 */
export const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#78716C', // Stone
  '#6B7280', // Gray
  '#1F2937', // Dark
] as const;

/**
 * Default tag color when none is selected.
 */
export const DEFAULT_TAG_COLOR = '#3B82F6'; // Blue

// API response types

export interface ImagesResponse {
  images: GalleryImage[];
  total: number;
  page: number;
  limit: number;
}

export interface TagsResponse {
  tags: ImageTag[];
  total: number;
}

/**
 * Supported image MIME types for upload.
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Maximum file size for image uploads (10MB).
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum number of tags per image.
 */
export const MAX_TAGS_PER_IMAGE = 20;
