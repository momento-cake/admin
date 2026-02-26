import { NextRequest, NextResponse } from 'next/server'
import {
  fetchClients,
  createClient,
  deleteClient,
  fetchInactiveClients
} from '@/lib/clients'
import { createClientSchema, clientQuerySchema } from '@/lib/validators/client'
import { ClientQueryFilters } from '@/types/client'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

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

    console.log('🔍 GET /api/clients - Fetching clients')

    const searchParams = request.nextUrl.searchParams

    // Check if user is requesting inactive clients (admin only)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    if (includeInactive && auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem ver clientes inativos')
    }

    const filters: ClientQueryFilters = {
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
      console.error('❌ Validation failed:', validationResult.error)
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

    // Fetch active or inactive clients
    const result = includeInactive
      ? await fetchInactiveClients(filters)
      : await fetchClients(filters)

    console.log(`✅ Successfully fetched ${result.clients.length} clients`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error fetching clients:', error)

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

    console.log('➕ POST /api/clients - Creating client')

    const body = await request.json()
    // Request body log removed to avoid logging PII (name, CPF, phone, email)

    // Validate the client data
    const validationResult = createClientSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
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

    const client = await createClient(clientData as any)

    console.log(`✅ Successfully created client: ${client.id}`)

    return NextResponse.json(
      {
        success: true,
        data: client,
        message: 'Cliente criado com sucesso'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating client:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar cliente'
      },
      { status: 500 }
    )
  }
}
