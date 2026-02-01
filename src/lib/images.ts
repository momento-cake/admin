import {
  GalleryImage,
  GalleryImageWithTags,
  ImageTag,
  CreateTagData,
  UpdateTagData,
  UpdateImageData,
  ImageFilters,
  ImagesResponse,
  TagsResponse,
  DEFAULT_TAG_COLOR
} from '@/types/image';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImage, deleteImage, ImageUploadResult } from '@/lib/storage';

const IMAGES_COLLECTION = 'gallery_images';
const TAGS_COLLECTION = 'image_tags';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a Firestore document to ImageTag.
 */
function docToTag(doc: DocumentSnapshot): ImageTag {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    color: data.color || DEFAULT_TAG_COLOR,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'system',
    isActive: data.isActive !== false
  };
}

/**
 * Converts a Firestore document to GalleryImage.
 */
function docToImage(doc: DocumentSnapshot): GalleryImage {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    originalName: data.originalName,
    storagePath: data.storagePath,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl,
    mimeType: data.mimeType,
    width: data.width || 0,
    height: data.height || 0,
    fileSize: data.fileSize || 0,
    tags: data.tags || [],
    description: data.description,
    uploadedBy: data.uploadedBy || 'system',
    uploadedAt: data.uploadedAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    isActive: data.isActive !== false
  };
}

// ============================================================================
// Tag Functions
// ============================================================================

/**
 * Fetches all active tags.
 */
export async function fetchTags(): Promise<TagsResponse> {
  try {
    console.log('🔍 Fetching tags');

    const tagsQuery = query(
      collection(db, TAGS_COLLECTION),
      where('isActive', '==', true),
      orderBy('name')
    );

    const snapshot = await getDocs(tagsQuery);
    const tags = snapshot.docs.map(docToTag);

    console.log(`✅ Retrieved ${tags.length} tags`);

    return { tags, total: tags.length };
  } catch (error) {
    console.error('❌ Error fetching tags:', error);
    throw new Error('Erro ao buscar tags');
  }
}

/**
 * Fetches a single tag by ID.
 */
export async function fetchTag(id: string): Promise<ImageTag> {
  try {
    const docRef = doc(db, TAGS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Tag não encontrada');
    }

    return docToTag(docSnap);
  } catch (error) {
    console.error('❌ Error fetching tag:', error);
    if (error instanceof Error && error.message === 'Tag não encontrada') {
      throw error;
    }
    throw new Error('Erro ao buscar tag');
  }
}

/**
 * Creates a new tag.
 */
export async function createTag(data: CreateTagData, userId: string): Promise<ImageTag> {
  try {
    console.log('➕ Creating new tag:', data.name);

    // Check for duplicate name
    const existingQuery = query(
      collection(db, TAGS_COLLECTION),
      where('name', '==', data.name.trim()),
      where('isActive', '==', true)
    );

    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error('Já existe uma tag com este nome');
    }

    const tagData = {
      name: data.name.trim(),
      color: data.color || DEFAULT_TAG_COLOR,
      isActive: true,
      createdAt: Timestamp.now(),
      createdBy: userId
    };

    const docRef = await addDoc(collection(db, TAGS_COLLECTION), tagData);
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Falha ao criar tag');
    }

    const tag = docToTag(createdDoc);
    console.log(`✅ Tag created: ${tag.name} (${tag.id})`);

    return tag;
  } catch (error) {
    console.error('❌ Error creating tag:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar tag');
  }
}

/**
 * Updates an existing tag.
 */
export async function updateTag(data: UpdateTagData): Promise<ImageTag> {
  try {
    const { id, ...updateData } = data;
    console.log('🔄 Updating tag:', id);

    // Check for duplicate name (excluding current tag)
    if (updateData.name) {
      const existingQuery = query(
        collection(db, TAGS_COLLECTION),
        where('name', '==', updateData.name.trim()),
        where('isActive', '==', true)
      );

      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.filter(doc => doc.id !== id);

      if (existingDocs.length > 0) {
        throw new Error('Já existe uma tag com este nome');
      }
    }

    const docRef = doc(db, TAGS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updateData,
      name: updateData.name?.trim()
    });

    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Tag não encontrada');
    }

    const tag = docToTag(updatedDoc);
    console.log(`✅ Tag updated: ${tag.name} (${tag.id})`);

    return tag;
  } catch (error) {
    console.error('❌ Error updating tag:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar tag');
  }
}

/**
 * Deletes a tag (soft delete).
 */
export async function deleteTag(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting tag:', id);

    const docRef = doc(db, TAGS_COLLECTION, id);
    await updateDoc(docRef, { isActive: false });

    console.log(`✅ Tag marked as inactive: ${id}`);
  } catch (error) {
    console.error('❌ Error deleting tag:', error);
    throw new Error('Erro ao remover tag');
  }
}

/**
 * Creates a tag inline if it doesn't exist, or returns the existing one.
 */
export async function createTagIfNotExists(
  name: string,
  color: string,
  userId: string
): Promise<ImageTag> {
  // Check if tag exists
  const existingQuery = query(
    collection(db, TAGS_COLLECTION),
    where('name', '==', name.trim()),
    where('isActive', '==', true)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    return docToTag(existingSnapshot.docs[0]);
  }

  // Create new tag
  return createTag({ name: name.trim(), color }, userId);
}

// ============================================================================
// Image Functions
// ============================================================================

/**
 * Fetches images with optional filters.
 */
export async function fetchImages(filters?: ImageFilters): Promise<ImagesResponse> {
  try {
    console.log('🔍 Fetching images with filters:', filters);

    // Base query - active images only
    let imagesQuery = query(
      collection(db, IMAGES_COLLECTION),
      where('isActive', '==', true),
      orderBy(filters?.sortBy || 'uploadedAt', filters?.sortOrder || 'desc')
    );

    const snapshot = await getDocs(imagesQuery);
    let images = snapshot.docs.map(docToImage);

    // Apply client-side filtering for advanced tag logic
    if (filters) {
      // Search query filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        images = images.filter(image =>
          image.originalName.toLowerCase().includes(searchLower) ||
          image.description?.toLowerCase().includes(searchLower)
        );
      }

      // Include tags filter
      if (filters.includeTags && filters.includeTags.length > 0) {
        const mode = filters.includeMode || 'OR';

        if (mode === 'AND') {
          // Image must have ALL selected tags
          images = images.filter(image =>
            filters.includeTags!.every(tagId => image.tags.includes(tagId))
          );
        } else {
          // Image must have AT LEAST ONE of the selected tags
          images = images.filter(image =>
            filters.includeTags!.some(tagId => image.tags.includes(tagId))
          );
        }
      }

      // Exclude tags filter
      if (filters.excludeTags && filters.excludeTags.length > 0) {
        const mode = filters.excludeMode || 'AND';

        if (mode === 'AND') {
          // Exclude images that have ALL excluded tags
          images = images.filter(image =>
            !filters.excludeTags!.every(tagId => image.tags.includes(tagId))
          );
        } else {
          // Exclude images that have ANY of the excluded tags
          images = images.filter(image =>
            !filters.excludeTags!.some(tagId => image.tags.includes(tagId))
          );
        }
      }
    }

    // Calculate pagination
    const total = images.length;
    const page = 1;
    const limitNum = 100;

    console.log(`✅ Retrieved ${images.length} images`);

    return { images, total, page, limit: limitNum };
  } catch (error) {
    console.error('❌ Error fetching images:', error);
    throw new Error('Erro ao buscar imagens');
  }
}

/**
 * Fetches images with resolved tag objects.
 */
export async function fetchImagesWithTags(filters?: ImageFilters): Promise<GalleryImageWithTags[]> {
  try {
    // Fetch images and tags in parallel
    const [imagesResponse, tagsResponse] = await Promise.all([
      fetchImages(filters),
      fetchTags()
    ]);

    // Create a map of tags for quick lookup
    const tagMap = new Map<string, ImageTag>();
    tagsResponse.tags.forEach(tag => tagMap.set(tag.id, tag));

    // Resolve tags for each image
    const imagesWithTags: GalleryImageWithTags[] = imagesResponse.images.map(image => ({
      ...image,
      tagIds: image.tags,
      tags: image.tags
        .map(tagId => tagMap.get(tagId))
        .filter((tag): tag is ImageTag => tag !== undefined)
    }));

    return imagesWithTags;
  } catch (error) {
    console.error('❌ Error fetching images with tags:', error);
    throw new Error('Erro ao buscar imagens');
  }
}

/**
 * Fetches a single image by ID.
 */
export async function fetchImage(id: string): Promise<GalleryImage> {
  try {
    const docRef = doc(db, IMAGES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Imagem não encontrada');
    }

    return docToImage(docSnap);
  } catch (error) {
    console.error('❌ Error fetching image:', error);
    if (error instanceof Error && error.message === 'Imagem não encontrada') {
      throw error;
    }
    throw new Error('Erro ao buscar imagem');
  }
}

/**
 * Fetches a single image with resolved tag objects.
 */
export async function fetchImageWithTags(id: string): Promise<GalleryImageWithTags> {
  try {
    const [image, tagsResponse] = await Promise.all([
      fetchImage(id),
      fetchTags()
    ]);

    const tagMap = new Map<string, ImageTag>();
    tagsResponse.tags.forEach(tag => tagMap.set(tag.id, tag));

    return {
      ...image,
      tagIds: image.tags,
      tags: image.tags
        .map(tagId => tagMap.get(tagId))
        .filter((tag): tag is ImageTag => tag !== undefined)
    };
  } catch (error) {
    console.error('❌ Error fetching image with tags:', error);
    throw error;
  }
}

/**
 * Creates a new image record after uploading to storage.
 */
export async function createImage(
  file: File,
  tags: string[],
  userId: string,
  description?: string
): Promise<GalleryImage> {
  try {
    console.log('➕ Creating new image:', file.name);

    // Upload to storage first
    const uploadResult: ImageUploadResult = await uploadImage(file);

    // Create Firestore document
    const imageData = {
      originalName: file.name,
      storagePath: uploadResult.storagePath,
      url: uploadResult.url,
      mimeType: uploadResult.mimeType,
      width: uploadResult.width,
      height: uploadResult.height,
      fileSize: uploadResult.fileSize,
      tags: tags || [],
      description: description?.trim() || null,
      uploadedBy: userId,
      uploadedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true
    };

    const docRef = await addDoc(collection(db, IMAGES_COLLECTION), imageData);
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Falha ao criar registro da imagem');
    }

    const image = docToImage(createdDoc);
    console.log(`✅ Image created: ${image.originalName} (${image.id})`);

    return image;
  } catch (error) {
    console.error('❌ Error creating image:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar imagem');
  }
}

/**
 * Updates an image's metadata.
 */
export async function updateImage(data: UpdateImageData): Promise<GalleryImage> {
  try {
    const { id, ...updateData } = data;
    console.log('🔄 Updating image:', id);

    const docRef = doc(db, IMAGES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updateData,
      description: updateData.description?.trim() || null,
      updatedAt: Timestamp.now()
    });

    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Imagem não encontrada');
    }

    const image = docToImage(updatedDoc);
    console.log(`✅ Image updated: ${image.originalName} (${image.id})`);

    return image;
  } catch (error) {
    console.error('❌ Error updating image:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar imagem');
  }
}

/**
 * Deletes an image (soft delete in Firestore, actual delete in Storage).
 */
export async function deleteImageRecord(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting image:', id);

    // Get image to retrieve storage path
    const image = await fetchImage(id);

    // Delete from storage
    await deleteImage(image.storagePath);

    // Soft delete in Firestore
    const docRef = doc(db, IMAGES_COLLECTION, id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Image deleted: ${id}`);
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error instanceof Error ? error : new Error('Erro ao remover imagem');
  }
}

/**
 * Deletes multiple images.
 */
export async function deleteMultipleImageRecords(ids: string[]): Promise<{
  successful: string[];
  failed: { id: string; error: string }[];
}> {
  const successful: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of ids) {
    try {
      await deleteImageRecord(id);
      successful.push(id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      failed.push({ id, error: errorMessage });
    }
  }

  return { successful, failed };
}

/**
 * Adds a tag to an image.
 */
export async function addTagToImage(imageId: string, tagId: string): Promise<GalleryImage> {
  try {
    const image = await fetchImage(imageId);

    if (image.tags.includes(tagId)) {
      return image; // Tag already exists
    }

    const updatedTags = [...image.tags, tagId];

    return updateImage({ id: imageId, tags: updatedTags });
  } catch (error) {
    console.error('❌ Error adding tag to image:', error);
    throw error instanceof Error ? error : new Error('Erro ao adicionar tag');
  }
}

/**
 * Removes a tag from an image.
 */
export async function removeTagFromImage(imageId: string, tagId: string): Promise<GalleryImage> {
  try {
    const image = await fetchImage(imageId);

    const updatedTags = image.tags.filter(t => t !== tagId);

    return updateImage({ id: imageId, tags: updatedTags });
  } catch (error) {
    console.error('❌ Error removing tag from image:', error);
    throw error instanceof Error ? error : new Error('Erro ao remover tag');
  }
}

/**
 * Gets images that have a specific tag.
 */
export async function getImagesByTag(tagId: string): Promise<GalleryImage[]> {
  try {
    const imagesQuery = query(
      collection(db, IMAGES_COLLECTION),
      where('isActive', '==', true),
      where('tags', 'array-contains', tagId),
      orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(imagesQuery);
    return snapshot.docs.map(docToImage);
  } catch (error) {
    console.error('❌ Error getting images by tag:', error);
    throw new Error('Erro ao buscar imagens por tag');
  }
}

/**
 * Gets count of images for each tag.
 */
export async function getTagImageCounts(): Promise<Map<string, number>> {
  try {
    const imagesResponse = await fetchImages();
    const counts = new Map<string, number>();

    for (const image of imagesResponse.images) {
      for (const tagId of image.tags) {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      }
    }

    return counts;
  } catch (error) {
    console.error('❌ Error getting tag image counts:', error);
    throw new Error('Erro ao calcular contagem de imagens por tag');
  }
}
