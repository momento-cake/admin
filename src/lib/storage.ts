import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  UploadMetadata
} from 'firebase/storage';
import { storage } from './firebase';
import { validateImageFile } from './validators/image';

/**
 * Generates a unique filename for storage.
 *
 * @param originalName - Original file name
 * @returns Unique filename with timestamp and random string
 */
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Result of an image upload operation.
 */
export interface ImageUploadResult {
  /** Path in Firebase Cloud Storage */
  storagePath: string;
  /** Public download URL */
  url: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Gets image dimensions from a File object.
 *
 * @param file - The image file
 * @returns Promise resolving to width and height
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem para obter dimensões'));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image to Firebase Cloud Storage.
 *
 * @param file - The image file to upload
 * @param folder - The folder path in storage (default: 'images/gallery')
 * @returns Promise resolving to upload result with URL and metadata
 */
export async function uploadImage(
  file: File,
  folder: string = 'images/gallery'
): Promise<ImageUploadResult> {
  try {
    console.log('📤 Uploading image:', file.name);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get image dimensions before upload
    const dimensions = await getImageDimensions(file);

    // Generate unique filename and create storage reference
    const filename = generateUniqueFilename(file.name);
    const storagePath = `${folder}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // Set upload metadata
    const metadata: UploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        width: dimensions.width.toString(),
        height: dimensions.height.toString()
      }
    };

    // Upload file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('✅ File uploaded to:', snapshot.ref.fullPath);

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    return {
      storagePath,
      url,
      width: dimensions.width,
      height: dimensions.height,
      fileSize: file.size,
      mimeType: file.type
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error instanceof Error ? error : new Error('Erro ao fazer upload da imagem');
  }
}

/**
 * Uploads multiple images to Firebase Cloud Storage.
 *
 * @param files - Array of image files to upload
 * @param folder - The folder path in storage (default: 'images/gallery')
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to array of upload results
 */
export async function uploadMultipleImages(
  files: File[],
  folder: string = 'images/gallery',
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<{
  successful: ImageUploadResult[];
  failed: { file: File; error: string }[];
}> {
  const successful: ImageUploadResult[] = [];
  const failed: { file: File; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (onProgress) {
      onProgress(i, files.length, file.name);
    }

    try {
      const result = await uploadImage(file, folder);
      successful.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      failed.push({ file, error: errorMessage });
    }
  }

  if (onProgress) {
    onProgress(files.length, files.length, 'Concluído');
  }

  return { successful, failed };
}

/**
 * Deletes an image from Firebase Cloud Storage.
 *
 * @param storagePath - The path to the file in storage
 */
export async function deleteImage(storagePath: string): Promise<void> {
  try {
    console.log('🗑️ Deleting image:', storagePath);

    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    console.log('✅ Image deleted successfully');
  } catch (error: any) {
    // Ignore "object not found" errors
    if (error?.code === 'storage/object-not-found') {
      console.log('ℹ️ Image already deleted or not found');
      return;
    }
    console.error('❌ Error deleting image:', error);
    throw error instanceof Error ? error : new Error('Erro ao deletar imagem');
  }
}

/**
 * Deletes multiple images from Firebase Cloud Storage.
 *
 * @param storagePaths - Array of paths to delete
 * @returns Object with successful and failed deletions
 */
export async function deleteMultipleImages(
  storagePaths: string[]
): Promise<{
  successful: string[];
  failed: { path: string; error: string }[];
}> {
  const successful: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const path of storagePaths) {
    try {
      await deleteImage(path);
      successful.push(path);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      failed.push({ path, error: errorMessage });
    }
  }

  return { successful, failed };
}

/**
 * Gets metadata for an image in storage.
 *
 * @param storagePath - The path to the file in storage
 * @returns Promise resolving to file metadata
 */
export async function getImageMetadata(storagePath: string): Promise<{
  size: number;
  contentType: string | undefined;
  customMetadata: Record<string, string> | undefined;
  timeCreated: string;
  updated: string;
}> {
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = await getMetadata(storageRef);

    return {
      size: metadata.size,
      contentType: metadata.contentType,
      customMetadata: metadata.customMetadata,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated
    };
  } catch (error) {
    console.error('❌ Error getting image metadata:', error);
    throw error instanceof Error ? error : new Error('Erro ao obter metadados da imagem');
  }
}

/**
 * Gets the download URL for an image.
 *
 * @param storagePath - The path to the file in storage
 * @returns Promise resolving to the download URL
 */
export async function getImageUrl(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('❌ Error getting image URL:', error);
    throw error instanceof Error ? error : new Error('Erro ao obter URL da imagem');
  }
}
