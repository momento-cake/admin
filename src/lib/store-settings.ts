import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { StoreAddress, StoreSettings, StoreHours, DIAS_SEMANA } from '@/types/store-settings'

// ============================================================================
// STORE ADDRESSES
// ============================================================================

const ADDRESSES_COLLECTION = 'storeAddresses'

function docToStoreAddress(docSnap: DocumentSnapshot): StoreAddress {
  const data = docSnap.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: docSnap.id,
    nome: data.nome || '',
    cep: data.cep || undefined,
    estado: data.estado || undefined,
    cidade: data.cidade || undefined,
    bairro: data.bairro || undefined,
    endereco: data.endereco || undefined,
    numero: data.numero || undefined,
    complemento: data.complemento || undefined,
    isDefault: data.isDefault ?? false,
    isActive: data.isActive !== false,
    createdAt: data.createdAt || Timestamp.now(),
    createdBy: data.createdBy || '',
  }
}

export async function fetchStoreAddresses(): Promise<StoreAddress[]> {
  const q = query(
    collection(db, ADDRESSES_COLLECTION),
    where('isActive', '==', true),
    orderBy('createdAt', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(docToStoreAddress)
}

export async function fetchStoreAddress(id: string): Promise<StoreAddress> {
  const docRef = doc(db, ADDRESSES_COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    throw new Error('Endereço não encontrado')
  }

  return docToStoreAddress(docSnap)
}

export async function createStoreAddress(
  data: Omit<StoreAddress, 'id' | 'createdAt' | 'isActive'>,
): Promise<StoreAddress> {
  if (!data.nome) {
    throw new Error('Nome do endereço é obrigatório')
  }

  // If this is the first address or marked as default, handle default logic
  if (data.isDefault) {
    await clearDefaultAddresses()
  }

  const addressData = {
    ...data,
    isActive: true,
    createdAt: Timestamp.now(),
  }

  const docRef = await addDoc(collection(db, ADDRESSES_COLLECTION), addressData)
  const createdDoc = await getDoc(docRef)

  if (!createdDoc.exists()) {
    throw new Error('Erro ao criar endereço')
  }

  return docToStoreAddress(createdDoc)
}

export async function updateStoreAddress(
  id: string,
  data: Partial<Omit<StoreAddress, 'id' | 'createdAt'>>,
): Promise<StoreAddress> {
  const docRef = doc(db, ADDRESSES_COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    throw new Error('Endereço não encontrado')
  }

  if (data.isDefault) {
    await clearDefaultAddresses()
  }

  await updateDoc(docRef, data)

  const updatedDoc = await getDoc(docRef)
  if (!updatedDoc.exists()) {
    throw new Error('Erro ao atualizar endereço')
  }

  return docToStoreAddress(updatedDoc)
}

export async function deleteStoreAddress(id: string): Promise<void> {
  const docRef = doc(db, ADDRESSES_COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    throw new Error('Endereço não encontrado')
  }

  const address = docToStoreAddress(docSnap)

  // Soft delete
  await updateDoc(docRef, {
    isActive: false,
  })

  // If deleting the default, set another as default
  if (address.isDefault) {
    const remaining = await fetchStoreAddresses()
    if (remaining.length > 0) {
      await updateDoc(doc(db, ADDRESSES_COLLECTION, remaining[0].id), {
        isDefault: true,
      })
    }
  }
}

async function clearDefaultAddresses(): Promise<void> {
  const addresses = await fetchStoreAddresses()
  const batch = writeBatch(db)

  for (const addr of addresses) {
    if (addr.isDefault) {
      batch.update(doc(db, ADDRESSES_COLLECTION, addr.id), { isDefault: false })
    }
  }

  await batch.commit()
}

// ============================================================================
// STORE SETTINGS (freight config)
// ============================================================================

const SETTINGS_COLLECTION = 'storeSettings'
const SETTINGS_DOC_ID = 'config'

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) {
    // Return defaults if no settings exist
    return {
      custoPorKm: 4.5,
      updatedAt: Timestamp.now(),
      updatedBy: '',
    }
  }

  const data = docSnap.data()
  return {
    custoPorKm: data.custoPorKm ?? 4.5,
    updatedAt: data.updatedAt || Timestamp.now(),
    updatedBy: data.updatedBy || '',
  }
}

export async function updateStoreSettings(
  data: { custoPorKm: number; updatedBy: string },
): Promise<StoreSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID)
  const settingsData = {
    custoPorKm: data.custoPorKm,
    updatedAt: Timestamp.now(),
    updatedBy: data.updatedBy,
  }

  await setDoc(docRef, settingsData, { merge: true })

  return {
    ...settingsData,
    updatedAt: Timestamp.now(),
  }
}

// ============================================================================
// STORE HOURS
// ============================================================================

const HOURS_COLLECTION = 'storeHours'

function docToStoreHours(docSnap: DocumentSnapshot): StoreHours {
  const data = docSnap.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: docSnap.id,
    diaSemana: data.diaSemana ?? 0,
    diaSemanaLabel: data.diaSemanaLabel || '',
    abreAs: data.abreAs || '08:00',
    fechaAs: data.fechaAs || '18:00',
    fechado: data.fechado ?? false,
    createdAt: data.createdAt || Timestamp.now(),
    updatedBy: data.updatedBy || undefined,
  }
}

export async function fetchStoreHours(): Promise<StoreHours[]> {
  const q = query(
    collection(db, HOURS_COLLECTION),
    orderBy('diaSemana', 'asc')
  )

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    // Return default hours for all 7 days
    return DIAS_SEMANA.map(d => ({
      id: `day-${d.diaSemana}`,
      diaSemana: d.diaSemana,
      diaSemanaLabel: d.label,
      abreAs: '08:00',
      fechaAs: '18:00',
      fechado: d.diaSemana === 0, // Sunday closed by default
      createdAt: Timestamp.now(),
    }))
  }

  return snapshot.docs.map(docToStoreHours)
}

export async function updateStoreHours(
  hours: Array<{
    diaSemana: number
    diaSemanaLabel: string
    abreAs: string
    fechaAs: string
    fechado: boolean
  }>,
  updatedBy: string,
): Promise<void> {
  const batch = writeBatch(db)

  for (const h of hours) {
    const docId = `day-${h.diaSemana}`
    const docRef = doc(db, HOURS_COLLECTION, docId)

    batch.set(docRef, {
      diaSemana: h.diaSemana,
      diaSemanaLabel: h.diaSemanaLabel,
      abreAs: h.abreAs,
      fechaAs: h.fechaAs,
      fechado: h.fechado,
      createdAt: Timestamp.now(),
      updatedBy,
    })
  }

  await batch.commit()
}
