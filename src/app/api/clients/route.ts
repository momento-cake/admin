import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { createClientSchema, clientQuerySchema } from '@/lib/validators/client'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

const CLIENTS_COLLECTION = 'clients'

// GET /api/clients - Get all clients with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'clients', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar clientes')
    }

    const searchParams = request.nextUrl.searchParams

    // Check if user is requesting inactive clients (admin only)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    if (includeInactive && auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem ver clientes inativos')
    }

    const filters = {
      searchQuery: searchParams.get('searchQuery') || undefined,
      type: (searchParams.get('type') as 'person' | 'business') || undefined,
      sortBy: (searchParams.get('sortBy') as 'name' | 'created' | 'updated') || 'created',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    }

    // Validate query parameters
    const validationResult = clientQuerySchema.safeParse(filters)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros de consulta inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Build query using admin SDK
    const isActiveValue = !includeInactive
    let q: FirebaseFirestore.Query = adminDb
      .collection(CLIENTS_COLLECTION)
      .where('isActive', '==', isActiveValue)

    // Apply type filter at query level
    if (filters.type) {
      q = q.where('type', '==', filters.type)
    }

    // Apply sort order
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      created: 'createdAt',
      updated: 'updatedAt'
    }
    const sortField = sortFieldMap[filters.sortBy] || 'createdAt'
    const sortDirection = filters.sortOrder === 'asc' ? 'asc' : 'desc'

    // For inactive clients, sort by updatedAt desc to match original behavior
    if (includeInactive) {
      q = q.orderBy('updatedAt', 'desc')
    } else {
      q = q.orderBy(sortField, sortDirection)
    }

    const snapshot = await q.get()

    // Map documents to client objects
    let clients = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    // Apply client-side search filtering (Firestore doesn't support full-text search)
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      clients = clients.filter((client: any) =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.cpfCnpj?.toLowerCase().includes(searchLower) ||
        client.contactMethods?.some((cm: any) =>
          cm.value?.toLowerCase().includes(searchLower)
        )
      )
    }

    const total = clients.length

    // Apply pagination
    const page = filters.page
    const limit = Math.min(filters.limit, 100)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedClients = clients.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      clients: paginatedClients,
      total,
      hasMore: endIndex < total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching clients:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar clientes'
      },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'clients', 'create')) {
      return forbiddenResponse('Sem permissão para criar clientes')
    }

    const body = await request.json()

    // Validate the client data
    const validationResult = createClientSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const clientData = validationResult.data

    // Check if client with same CPF/CNPJ already exists
    if (clientData.cpfCnpj) {
      const existingSnapshot = await adminDb
        .collection(CLIENTS_COLLECTION)
        .where('cpfCnpj', '==', clientData.cpfCnpj)
        .where('isActive', '==', true)
        .get()

      if (!existingSnapshot.empty) {
        const label = clientData.type === 'business' ? 'CNPJ' : 'CPF'
        return NextResponse.json(
          { success: false, error: `Já existe um cliente com esse ${label}` },
          { status: 409 }
        )
      }
    }

    const now = FieldValue.serverTimestamp()
    const docData = {
      ...clientData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid
    }

    const docRef = await adminDb.collection(CLIENTS_COLLECTION).add(docData)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: docRef.id,
          ...clientData,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: auth.uid
        },
        message: 'Cliente criado com sucesso'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating client:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar cliente'
      },
      { status: 500 }
    )
  }
}
