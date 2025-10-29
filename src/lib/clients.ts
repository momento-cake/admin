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
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  Client,
  PersonalClient,
  BusinessClient,
  ContactMethod,
  RelatedPerson,
  SpecialDate,
  ClientListResponse,
  ClientQueryFilters
} from '@/types/client'

const COLLECTION_NAME = 'clients'

/**
 * Helper function to convert Firestore document to Client
 */
function docToClient(doc: DocumentSnapshot): Client {
  const data = doc.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  const clientData = {
    id: doc.id,
    type: data.type,
    name: data.name,
    email: data.email || undefined,
    cpfCnpj: data.cpfCnpj || undefined,
    phone: data.phone || undefined,
    address: data.address || undefined,
    contactMethods: (data.contactMethods || []) as ContactMethod[],
    relatedPersons: (data.relatedPersons || []) as RelatedPerson[],
    specialDates: (data.specialDates || []) as SpecialDate[],
    notes: data.notes || undefined,
    tags: data.tags || [],
    preferences: data.preferences || undefined,
    isActive: data.isActive !== false,
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || undefined,
    createdBy: data.createdBy || undefined,
    lastModifiedBy: data.lastModifiedBy || undefined
  }

  // Add business-specific fields if it's a business client
  if (data.type === 'business') {
    return {
      ...clientData,
      companyInfo: data.companyInfo,
      representative: data.representative
    } as BusinessClient
  }

  return clientData as PersonalClient
}

/**
 * Fetch clients with optional filters, search, and pagination
 */
export async function fetchClients(
  filters?: ClientQueryFilters
): Promise<ClientListResponse> {
  try {
    console.log('🔍 Fetching clients with filters:', filters)

    // Base query - active clients only
    const clientsQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )

    let clients: Client[] = []
    try {
      const snapshot = await getDocs(clientsQuery)
      clients = snapshot.docs.map(docToClient)
    } catch (firestoreError) {
      // If there's a permission error, log it and return empty array
      // This allows the UI to render while we troubleshoot the security rules
      if (firestoreError instanceof Error && firestoreError.message.includes('permission')) {
        console.warn('⚠️  Firestore permission denied. Returning empty client list.')
        return {
          success: true,
          clients: [],
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
      clients = clients.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.cpfCnpj?.toLowerCase().includes(searchLower) ||
        client.contactMethods.some(cm =>
          cm.value.toLowerCase().includes(searchLower)
        )
      )
    }

    if (filters?.type) {
      clients = clients.filter(client => client.type === filters.type)
    }

    // Apply sorting
    if (filters?.sortBy) {
      clients = clients.sort((a, b) => {
        let compareA: any, compareB: any

        switch (filters.sortBy) {
          case 'name':
            compareA = a.name.toLowerCase()
            compareB = b.name.toLowerCase()
            break
          case 'created':
            compareA = a.createdAt
            compareB = b.createdAt
            break
          case 'updated':
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
    const paginatedClients = clients.slice(startIndex, endIndex)

    console.log(`✅ Retrieved ${paginatedClients.length} clients (page ${page})`)

    return {
      success: true,
      clients: paginatedClients,
      total: clients.length,
      page,
      limit: limitParam,
      hasMore: endIndex < clients.length
    }
  } catch (error) {
    console.error('❌ Error fetching clients:', error)
    throw new Error('Erro ao buscar clientes')
  }
}

/**
 * Fetch a single client by ID
 */
export async function fetchClient(id: string): Promise<Client> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Cliente não encontrado')
    }

    return docToClient(docSnap)
  } catch (error) {
    console.error('❌ Error fetching client:', error)
    if (error instanceof Error && error.message === 'Cliente não encontrado') {
      throw error
    }
    throw new Error('Erro ao buscar cliente')
  }
}

/**
 * Create a new client
 */
export async function createClient(
  data: Omit<PersonalClient | BusinessClient, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>
): Promise<Client> {
  try {
    console.log('➕ Creating new client:', data.name)

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome do cliente é obrigatório')
    }

    if (!data.contactMethods || data.contactMethods.length === 0) {
      throw new Error('Pelo menos um método de contato é obrigatório')
    }

    // Check if client with same CPF/CNPJ already exists
    if (data.cpfCnpj) {
      const existingQuery = query(
        collection(db, COLLECTION_NAME),
        where('cpfCnpj', '==', data.cpfCnpj),
        where('isActive', '==', true)
      )

      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        throw new Error(`Já existe um cliente com esse ${data.type === 'business' ? 'CNPJ' : 'CPF'}`)
      }
    }

    // Create client document
    const clientData = {
      ...data,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), clientData)

    // Fetch the created document
    const createdDoc = await getDoc(docRef)

    if (!createdDoc.exists()) {
      throw new Error('Erro ao criar cliente')
    }

    console.log(`✅ Client created with ID: ${docRef.id}`)
    return docToClient(createdDoc)
  } catch (error) {
    console.error('❌ Error creating client:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao criar cliente')
  }
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: string,
  data: Partial<Omit<PersonalClient | BusinessClient, 'id' | 'createdAt' | 'isActive'>>
): Promise<Client> {
  try {
    console.log('✏️ Updating client:', id)

    // Verify client exists
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Cliente não encontrado')
    }

    const existingClient = docSnap.data() as Client

    // Prevent editing inactive clients
    if (!existingClient.isActive) {
      throw new Error('Cliente inativo não pode ser editado. Restaure primeiro.')
    }

    // If updating CPF/CNPJ, check for duplicates
    if (data.cpfCnpj && data.cpfCnpj !== existingClient.cpfCnpj) {
      const existingQuery = query(
        collection(db, COLLECTION_NAME),
        where('cpfCnpj', '==', data.cpfCnpj),
        where('isActive', '==', true)
      )

      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        throw new Error(`Já existe outro cliente com esse ${existingClient.type === 'business' ? 'CNPJ' : 'CPF'}`)
      }
    }

    // Update client document
    const updateData = {
      ...data,
      updatedAt: Timestamp.now()
    }

    await updateDoc(docRef, updateData)

    // Fetch and return updated document
    const updatedDoc = await getDoc(docRef)

    if (!updatedDoc.exists()) {
      throw new Error('Erro ao atualizar cliente')
    }

    console.log(`✅ Client updated: ${id}`)
    return docToClient(updatedDoc)
  } catch (error) {
    console.error('❌ Error updating client:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao atualizar cliente')
  }
}

/**
 * Soft delete a client (mark as inactive)
 */
export async function deleteClient(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting client:', id)

    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Cliente não encontrado')
    }

    // Soft delete - mark as inactive
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    })

    console.log(`✅ Client marked as inactive: ${id}`)
  } catch (error) {
    console.error('❌ Error deleting client:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao deletar cliente')
  }
}

/**
 * Restore a soft-deleted client
 */
export async function restoreClient(id: string): Promise<Client> {
  try {
    console.log('♻️ Restoring client:', id)

    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Cliente não encontrado')
    }

    // Restore - mark as active
    await updateDoc(docRef, {
      isActive: true,
      updatedAt: Timestamp.now()
    })

    // Fetch and return restored document
    const restoredDoc = await getDoc(docRef)

    if (!restoredDoc.exists()) {
      throw new Error('Erro ao restaurar cliente')
    }

    console.log(`✅ Client restored: ${id}`)
    return docToClient(restoredDoc)
  } catch (error) {
    console.error('❌ Error restoring client:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Erro ao restaurar cliente')
  }
}

/**
 * Fetch inactive (deleted) clients for admin restoration
 */
export async function fetchInactiveClients(
  filters?: Omit<ClientQueryFilters, 'type'>
): Promise<ClientListResponse> {
  try {
    console.log('🔍 Fetching inactive clients')

    // Query inactive clients
    const clientsQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', false),
      orderBy('updatedAt', 'desc')
    )

    let clients: Client[] = []
    try {
      const snapshot = await getDocs(clientsQuery)
      clients = snapshot.docs.map(docToClient)
    } catch (firestoreError) {
      // If there's a permission error, log it and return empty array
      if (firestoreError instanceof Error && firestoreError.message.includes('permission')) {
        console.warn('⚠️  Firestore permission denied. Returning empty inactive client list.')
        return {
          success: true,
          clients: [],
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
      clients = clients.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.cpfCnpj?.toLowerCase().includes(searchLower)
      )
    }

    // Apply pagination
    const page = filters?.page || 1
    const limitParam = filters?.limit || 20
    const startIndex = (page - 1) * limitParam
    const endIndex = startIndex + limitParam
    const paginatedClients = clients.slice(startIndex, endIndex)

    console.log(`✅ Retrieved ${paginatedClients.length} inactive clients`)

    return {
      success: true,
      clients: paginatedClients,
      total: clients.length,
      page,
      limit: limitParam,
      hasMore: endIndex < clients.length
    }
  } catch (error) {
    console.error('❌ Error fetching inactive clients:', error)
    throw new Error('Erro ao buscar clientes deletados')
  }
}

/**
 * Check if a CPF/CNPJ already exists
 */
export async function checkCpfCnpjExists(
  cpfCnpj: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('cpfCnpj', '==', cpfCnpj),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(existingQuery)

    // If excludeId is provided, check if the found document is different
    if (excludeId && !snapshot.empty) {
      return !snapshot.docs.some(doc => doc.id === excludeId)
    }

    return !snapshot.empty
  } catch (error) {
    console.error('❌ Error checking CPF/CNPJ:', error)
    return false
  }
}

/**
 * Get clients with upcoming special dates
 */
export async function fetchClientsWithUpcomingDates(
  daysAhead: number = 30
): Promise<Client[]> {
  try {
    console.log(`🔍 Fetching clients with special dates in the next ${daysAhead} days`)

    const clientsQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(clientsQuery)
    const today = new Date()
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const clientsWithUpcomingDates = snapshot.docs
      .map(docToClient)
      .filter(client => {
        if (!client.specialDates || client.specialDates.length === 0) {
          return false
        }

        return client.specialDates.some(specialDate => {
          const dateStr = specialDate.date
          const [year, month, day] = dateStr.split('-').map(Number)
          // Create date for this year and next year
          const upcomingDate = new Date(today.getFullYear(), month - 1, day)

          // If the date has already passed this year, check next year
          if (upcomingDate < today) {
            upcomingDate.setFullYear(today.getFullYear() + 1)
          }

          return upcomingDate <= futureDate
        })
      })

    console.log(
      `✅ Found ${clientsWithUpcomingDates.length} clients with upcoming special dates`
    )
    return clientsWithUpcomingDates
  } catch (error) {
    console.error('❌ Error fetching clients with upcoming dates:', error)
    throw new Error('Erro ao buscar clientes com datas especiais')
  }
}

/**
 * Interface for special date dashboard entries
 */
export interface SpecialDateWithClient {
  // Date information
  dateId: string
  date: string // YYYY-MM-DD format
  type: 'birthday' | 'anniversary' | 'custom' | 'company-anniversary'
  description: string
  relatedPersonId?: string
  relatedPersonName?: string
  notes?: string

  // Client information
  clientId: string
  clientName: string
  clientType: 'person' | 'business'

  // Calculated fields
  daysFromToday: number
  displayDate: string // "15 de março de 2025"
  relativeDate: string // "Em 5 dias", "Hoje!", "Há 3 dias"
  yearOfDate: number
}

/**
 * Fetch all clients for the special dates dashboard
 * Returns clients with minimal data for performance
 */
export async function fetchSpecialDatesForDashboard(): Promise<Client[]> {
  try {
    console.log('🔍 Fetching clients for special dates dashboard')

    const clientsQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(clientsQuery)
    const clients = snapshot.docs.map(docToClient)

    console.log(`✅ Retrieved ${clients.length} clients for special dates dashboard`)
    return clients
  } catch (error) {
    console.error('❌ Error fetching clients for special dates dashboard:', error)
    throw new Error('Erro ao buscar clientes para o dashboard de datas especiais')
  }
}
