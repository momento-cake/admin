import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  ImageFolder,
  ImageFolderWithImages,
  CreateFolderData,
  UpdateFolderData,
  FolderQueryFilters,
  FoldersResponse,
  PublicFolder,
  PublicFolderImage,
  PublicFolderWithImages
} from '@/types/folder'
import { GalleryImage } from '@/types/image'
import { fetchImage } from './images'
import { fetchClient } from './clients'
import { generateSlug } from './validators/folder'

const COLLECTION_NAME = 'image_folders'
const IMAGES_COLLECTION = 'gallery_images'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts a Firestore document to ImageFolder.
 */
function docToFolder(doc: DocumentSnapshot): ImageFolder {
  const data = doc.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: doc.id,
    name: data.name,
    slug: data.slug,
    description: data.description || undefined,
    imageIds: data.imageIds || [],
    clientId: data.clientId || undefined,
    clientName: data.clientName || undefined,
    coverImageId: data.coverImageId || undefined,
    isPublic: data.isPublic !== false,
    createdBy: data.createdBy || 'system',
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
    isActive: data.isActive !== false
  }
}

/**
 * Converts a GalleryImage to PublicFolderImage (excludes internal fields).
 */
function imageToPublicImage(image: GalleryImage): PublicFolderImage {
  return {
    id: image.id,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    width: image.width,
    height: image.height,
    description: image.description,
    isExternal: image.isExternal
  }
}

/**
 * Checks if a slug is unique in the collection.
 */
async function isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  const slugQuery = query(
    collection(db, COLLECTION_NAME),
    where('slug', '==', slug),
    where('isActive', '==', true)
  )

  const snapshot = await getDocs(slugQuery)

  if (snapshot.empty) {
    return true
  }

  // If excludeId is provided, check if the found document is the same
  if (excludeId) {
    return snapshot.docs.every(doc => doc.id === excludeId)
  }

  return false
}

/**
 * Generates a unique slug from a name, appending numbers if needed.
 */
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  let baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 1

  while (!(await isSlugUnique(slug, excludeId))) {
    slug = `${baseSlug}-${counter}`
    counter++

    // Safety limit
    if (counter > 100) {
      throw new Error('Não foi possível gerar um slug único')
    }
  }

  return slug
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetches folders with optional filters, search, and pagination.
 */
export async function fetchFolders(
  filters?: FolderQueryFilters
): Promise<FoldersResponse> {
  try {
    console.log('🔍 Fetching folders with filters:', filters)

    // Base query - active folders only
    const foldersQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )

    let folders: ImageFolder[] = []
    try {
      const snapshot = await getDocs(foldersQuery)
      folders = snapshot.docs.map(docToFolder)
    } catch (firestoreError) {
      if (firestoreError instanceof Error && firestoreError.message.includes('permission')) {
        console.warn('⚠️ Firestore permission denied. Returning empty folder list.')
        return {
          success: true,
          folders: [],
          total: 0,
          hasMore: false,
          page: filters?.page || 1,
          limit: filters?.limit || 20
        }
      }
      throw firestoreError
    }

    // Apply client-side filtering
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      folders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchLower) ||
        folder.description?.toLowerCase().includes(searchLower) ||
        folder.slug.toLowerCase().includes(searchLower)
      )
    }

    if (filters?.clientId) {
      folders = folders.filter(folder => folder.clientId === filters.clientId)
    }

    if (filters?.isPublic !== undefined) {
      folders = folders.filter(folder => folder.isPublic === filters.isPublic)
    }

    // Apply sorting
    if (filters?.sortBy) {
      folders = folders.sort((a, b) => {
        let compareA: any, compareB: any

        switch (filters.sortBy) {
          case 'name':
            compareA = a.name.toLowerCase()
            compareB = b.name.toLowerCase()
            break
          case 'createdAt':
            compareA = a.createdAt
            compareB = b.createdAt
            break
          case 'updatedAt':
            compareA = a.updatedAt || a.createdAt
            compareB = b.updatedAt || b.createdAt
            break
          default:
            return 0
        }

        if (filters.sortOrder === 'asc') {
          return compareA > compareB ? 1 : -1
        } else {
          return compareA < compareB ? 1 : -1
        }
      })
    }

    // Apply pagination
    const page = filters?.page || 1
    const limitParam = filters?.limit || 20
    const startIndex = (page - 1) * limitParam
    const endIndex = startIndex + limitParam
    const paginatedFolders = folders.slice(startIndex, endIndex)

    console.log(`✅ Retrieved ${paginatedFolders.length} folders (page ${page})`)

    return {
      success: true,
      folders: paginatedFolders,
      total: folders.length,
      page,
      limit: limitParam,
      hasMore: endIndex < folders.length
    }
  } catch (error) {
    console.error('❌ Error fetching folders:', error)
    throw new Error('Erro ao buscar pastas')
  }
}

/**
 * Fetches a single folder by ID.
 */
export async function fetchFolder(id: string): Promise<ImageFolder> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Pasta não encontrada')
    }

    return docToFolder(docSnap)
  } catch (error) {
    console.error('❌ Error fetching folder:', error)
    if (error instanceof Error && error.message === 'Pasta não encontrada') {
      throw error
    }
    throw new Error('Erro ao buscar pasta')
  }
}

/**
 * Fetches a folder by its slug.
 */
export async function fetchFolderBySlug(slug: string): Promise<ImageFolder | null> {
  try {
    const slugQuery = query(
      collection(db, COLLECTION_NAME),
      where('slug', '==', slug),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(slugQuery)

    if (snapshot.empty) {
      return null
    }

    return docToFolder(snapshot.docs[0])
  } catch (error) {
    console.error('❌ Error fetching folder by slug:', error)
    throw new Error('Erro ao buscar pasta')
  }
}

/**
 * Fetches a folder with resolved image objects.
 */
export async function fetchFolderWithImages(id: string): Promise<ImageFolderWithImages> {
  try {
    const folder = await fetchFolder(id)

    // Fetch all images in parallel
    const imagePromises = folder.imageIds.map(async (imageId) => {
      try {
        return await fetchImage(imageId)
      } catch {
        console.warn(`⚠️ Image ${imageId} not found, skipping`)
        return null
      }
    })

    const images = (await Promise.all(imagePromises)).filter(
      (img): img is GalleryImage => img !== null && img.isActive
    )

    return {
      ...folder,
      images,
      imageIds: folder.imageIds
    }
  } catch (error) {
    console.error('❌ Error fetching folder with images:', error)
    throw error
  }
}

/**
 * Creates a new folder.
 */
export async function createFolder(
  data: CreateFolderData,
  userId: string
): Promise<ImageFolder> {
  try {
    console.log('➕ Creating new folder:', data.name)

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome da pasta é obrigatório')
    }

    if (!data.imageIds || data.imageIds.length === 0) {
      throw new Error('Selecione pelo menos uma imagem')
    }

    // Generate unique slug
    const slug = data.slug
      ? await generateUniqueSlug(data.slug)
      : await generateUniqueSlug(data.name)

    // Get client name if clientId is provided
    let clientName: string | undefined
    if (data.clientId) {
      try {
        const client = await fetchClient(data.clientId)
        clientName = client.name
      } catch {
        console.warn('⚠️ Client not found, proceeding without client name')
      }
    }

    // Create folder document
    const folderData = {
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
      imageIds: data.imageIds,
      clientId: data.clientId || null,
      clientName: clientName || null,
      coverImageId: data.coverImageId || data.imageIds[0] || null,
      isPublic: data.isPublic !== false,
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), folderData)

    // Fetch the created document
    const createdDoc = await getDoc(docRef)

    if (!createdDoc.exists()) {
      throw new Error('Erro ao criar pasta')
    }

    console.log(`✅ Folder created with ID: ${docRef.id}`)
    return docToFolder(createdDoc)
  } catch (error) {
    console.error('❌ Error creating folder:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao criar pasta')
  }
}

/**
 * Updates an existing folder.
 */
export async function updateFolder(
  id: string,
  data: UpdateFolderData
): Promise<ImageFolder> {
  try {
    console.log('✏️ Updating folder:', id)

    // Verify folder exists
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Pasta não encontrada')
    }

    const existingFolder = docToFolder(docSnap)

    // Prevent editing inactive folders
    if (!existingFolder.isActive) {
      throw new Error('Pasta inativa não pode ser editada. Restaure primeiro.')
    }

    // Build update data
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now()
    }

    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }

    if (data.slug !== undefined && data.slug !== existingFolder.slug) {
      // Validate slug uniqueness
      const isUnique = await isSlugUnique(data.slug, id)
      if (!isUnique) {
        throw new Error('Já existe uma pasta com este slug')
      }
      updateData.slug = data.slug
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null
    }

    if (data.imageIds !== undefined) {
      updateData.imageIds = data.imageIds
    }

    if (data.clientId !== undefined) {
      if (data.clientId === null) {
        updateData.clientId = null
        updateData.clientName = null
      } else {
        updateData.clientId = data.clientId
        // Fetch client name
        try {
          const client = await fetchClient(data.clientId)
          updateData.clientName = client.name
        } catch {
          updateData.clientName = null
        }
      }
    }

    if (data.coverImageId !== undefined) {
      updateData.coverImageId = data.coverImageId
    }

    if (data.isPublic !== undefined) {
      updateData.isPublic = data.isPublic
    }

    await updateDoc(docRef, updateData)

    // Fetch and return updated document
    const updatedDoc = await getDoc(docRef)

    if (!updatedDoc.exists()) {
      throw new Error('Erro ao atualizar pasta')
    }

    console.log(`✅ Folder updated: ${id}`)
    return docToFolder(updatedDoc)
  } catch (error) {
    console.error('❌ Error updating folder:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao atualizar pasta')
  }
}

/**
 * Soft deletes a folder (marks as inactive).
 */
export async function deleteFolder(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting folder:', id)

    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Pasta não encontrada')
    }

    // Soft delete - mark as inactive
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    })

    console.log(`✅ Folder marked as inactive: ${id}`)
  } catch (error) {
    console.error('❌ Error deleting folder:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao deletar pasta')
  }
}

/**
 * Restores a soft-deleted folder.
 */
export async function restoreFolder(id: string): Promise<ImageFolder> {
  try {
    console.log('♻️ Restoring folder:', id)

    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Pasta não encontrada')
    }

    // Restore - mark as active
    await updateDoc(docRef, {
      isActive: true,
      updatedAt: Timestamp.now()
    })

    // Fetch and return restored document
    const restoredDoc = await getDoc(docRef)

    if (!restoredDoc.exists()) {
      throw new Error('Erro ao restaurar pasta')
    }

    console.log(`✅ Folder restored: ${id}`)
    return docToFolder(restoredDoc)
  } catch (error) {
    console.error('❌ Error restoring folder:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao restaurar pasta')
  }
}

// ============================================================================
// Folder-Specific Operations
// ============================================================================

/**
 * Adds images to a folder.
 */
export async function addImagesToFolder(
  folderId: string,
  imageIds: string[]
): Promise<ImageFolder> {
  try {
    console.log(`➕ Adding ${imageIds.length} images to folder:`, folderId)

    const folder = await fetchFolder(folderId)

    // Merge unique image IDs
    const uniqueImageIds = [...new Set([...folder.imageIds, ...imageIds])]

    return updateFolder(folderId, { imageIds: uniqueImageIds })
  } catch (error) {
    console.error('❌ Error adding images to folder:', error)
    throw error instanceof Error ? error : new Error('Erro ao adicionar imagens à pasta')
  }
}

/**
 * Removes images from a folder.
 */
export async function removeImagesFromFolder(
  folderId: string,
  imageIds: string[]
): Promise<ImageFolder> {
  try {
    console.log(`➖ Removing ${imageIds.length} images from folder:`, folderId)

    const folder = await fetchFolder(folderId)

    // Filter out removed image IDs
    const remainingImageIds = folder.imageIds.filter(id => !imageIds.includes(id))

    // Update cover image if it was removed
    let updateData: UpdateFolderData = { imageIds: remainingImageIds }
    if (folder.coverImageId && imageIds.includes(folder.coverImageId)) {
      updateData.coverImageId = remainingImageIds[0] || null
    }

    return updateFolder(folderId, updateData)
  } catch (error) {
    console.error('❌ Error removing images from folder:', error)
    throw error instanceof Error ? error : new Error('Erro ao remover imagens da pasta')
  }
}

/**
 * Binds a client to a folder.
 */
export async function bindClientToFolder(
  folderId: string,
  clientId: string
): Promise<ImageFolder> {
  try {
    console.log(`🔗 Binding client ${clientId} to folder:`, folderId)

    return updateFolder(folderId, { clientId })
  } catch (error) {
    console.error('❌ Error binding client to folder:', error)
    throw error instanceof Error ? error : new Error('Erro ao vincular cliente à pasta')
  }
}

/**
 * Unbinds a client from a folder.
 */
export async function unbindClientFromFolder(folderId: string): Promise<ImageFolder> {
  try {
    console.log(`🔓 Unbinding client from folder:`, folderId)

    return updateFolder(folderId, { clientId: null })
  } catch (error) {
    console.error('❌ Error unbinding client from folder:', error)
    throw error instanceof Error ? error : new Error('Erro ao desvincular cliente da pasta')
  }
}

/**
 * Fetches folders for a specific client.
 */
export async function fetchFoldersByClient(clientId: string): Promise<ImageFolder[]> {
  try {
    console.log('🔍 Fetching folders for client:', clientId)

    const response = await fetchFolders({ clientId })
    return response.folders
  } catch (error) {
    console.error('❌ Error fetching folders by client:', error)
    throw new Error('Erro ao buscar pastas do cliente')
  }
}

// ============================================================================
// Public Access Functions
// ============================================================================

/**
 * Fetches a public folder by slug with resolved public-safe image data.
 * This function is used for unauthenticated public gallery access.
 */
export async function fetchPublicFolder(slug: string): Promise<PublicFolderWithImages | null> {
  try {
    console.log('🌐 Fetching public folder:', slug)

    // Query for public, active folder by slug
    const slugQuery = query(
      collection(db, COLLECTION_NAME),
      where('slug', '==', slug),
      where('isPublic', '==', true),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(slugQuery)

    if (snapshot.empty) {
      console.log('⚠️ Public folder not found:', slug)
      return null
    }

    const folder = docToFolder(snapshot.docs[0])

    // Fetch images in parallel
    const imagePromises = folder.imageIds.map(async (imageId) => {
      try {
        const docRef = doc(db, IMAGES_COLLECTION, imageId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          return null
        }

        const data = docSnap.data()
        if (!data || data.isActive === false) {
          return null
        }

        // Return only public-safe fields
        return {
          id: docSnap.id,
          url: data.url,
          thumbnailUrl: data.thumbnailUrl,
          width: data.width || 0,
          height: data.height || 0,
          description: data.description,
          isExternal: data.isExternal === true
        } as PublicFolderImage
      } catch {
        return null
      }
    })

    const images = (await Promise.all(imagePromises)).filter(
      (img): img is PublicFolderImage => img !== null
    )

    // Find cover image URL
    let coverImageUrl: string | undefined
    if (folder.coverImageId) {
      const coverImage = images.find(img => img.id === folder.coverImageId)
      coverImageUrl = coverImage?.url
    }
    if (!coverImageUrl && images.length > 0) {
      coverImageUrl = images[0].url
    }

    console.log(`✅ Retrieved public folder: ${folder.name} with ${images.length} images`)

    return {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      description: folder.description,
      coverImageUrl,
      imageCount: images.length,
      images
    }
  } catch (error) {
    console.error('❌ Error fetching public folder:', error)
    throw new Error('Erro ao buscar galeria pública')
  }
}

/**
 * Fetches all public folders (for sitemap generation, etc.).
 */
export async function fetchAllPublicFolders(): Promise<PublicFolder[]> {
  try {
    console.log('🌐 Fetching all public folders')

    const publicQuery = query(
      collection(db, COLLECTION_NAME),
      where('isPublic', '==', true),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(publicQuery)
    const folders = snapshot.docs.map(docToFolder)

    // Convert to public format
    const publicFolders: PublicFolder[] = await Promise.all(
      folders.map(async (folder) => {
        // Get cover image URL
        let coverImageUrl: string | undefined
        if (folder.coverImageId) {
          try {
            const image = await fetchImage(folder.coverImageId)
            coverImageUrl = image.url
          } catch {
            // Ignore
          }
        }

        return {
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          description: folder.description,
          coverImageUrl,
          imageCount: folder.imageIds.length
        }
      })
    )

    console.log(`✅ Retrieved ${publicFolders.length} public folders`)

    return publicFolders
  } catch (error) {
    console.error('❌ Error fetching all public folders:', error)
    throw new Error('Erro ao buscar galerias públicas')
  }
}
