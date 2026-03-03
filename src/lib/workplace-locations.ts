import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { WorkplaceLocation } from '@/types/time-tracking'

const COLLECTION_NAME = 'workplace_locations'

/**
 * Helper to convert Firestore document to WorkplaceLocation
 */
function docToLocation(docSnap: DocumentSnapshot): WorkplaceLocation {
  const data = docSnap.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: docSnap.id,
    name: data.name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radiusMeters,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
    createdBy: data.createdBy,
  }
}

/**
 * Create a new workplace location
 */
export async function createLocation(
  data: Omit<WorkplaceLocation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkplaceLocation> {
  try {
    const locationData = {
      ...data,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), locationData)
    const createdDoc = await getDoc(docRef)

    if (!createdDoc.exists()) {
      throw new Error('Erro ao criar local de trabalho')
    }

    return docToLocation(createdDoc)
  } catch (error) {
    console.error('Error creating workplace location:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao criar local de trabalho')
  }
}

/**
 * Update an existing workplace location
 */
export async function updateLocation(
  id: string,
  data: Partial<Omit<WorkplaceLocation, 'id' | 'createdAt'>>
): Promise<WorkplaceLocation> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Local de trabalho não encontrado')
    }

    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    }

    await updateDoc(docRef, updateData)
    const updatedDoc = await getDoc(docRef)

    if (!updatedDoc.exists()) {
      throw new Error('Erro ao atualizar local de trabalho')
    }

    return docToLocation(updatedDoc)
  } catch (error) {
    console.error('Error updating workplace location:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao atualizar local de trabalho')
  }
}

/**
 * Soft delete a workplace location (mark as inactive)
 */
export async function deleteLocation(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Local de trabalho não encontrado')
    }

    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error deleting workplace location:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao deletar local de trabalho')
  }
}

/**
 * Get a single workplace location by ID
 */
export async function getLocation(id: string): Promise<WorkplaceLocation> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))

    if (!docSnap.exists()) {
      throw new Error('Local de trabalho não encontrado')
    }

    return docToLocation(docSnap)
  } catch (error) {
    console.error('Error fetching workplace location:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao buscar local de trabalho')
  }
}

/**
 * Get all active workplace locations
 */
export async function getLocations(): Promise<WorkplaceLocation[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    )
    const snapshot = await getDocs(q)

    const locations = snapshot.docs.map(docToLocation)
    // Sort in-memory to avoid requiring a composite index
    locations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return locations
  } catch (error) {
    console.error('Error fetching workplace locations:', error)
    throw new Error('Erro ao buscar locais de trabalho')
  }
}
