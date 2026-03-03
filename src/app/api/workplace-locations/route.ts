import { NextRequest, NextResponse } from 'next/server'
import { getLocations, createLocation } from '@/lib/workplace-locations'
import { workplaceLocationSchema } from '@/lib/validators/time-tracking'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

// GET /api/workplace-locations - List all active locations
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar locais')
    }

    const locations = await getLocations()

    return NextResponse.json({ success: true, data: locations })
  } catch (error) {
    console.error('Error fetching workplace locations:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar locais' },
      { status: 500 }
    )
  }
}

// POST /api/workplace-locations - Create a new location
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem criar locais')
    }

    const body = await request.json()

    const validationResult = workplaceLocationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados invalidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }

    const location = await createLocation({
      ...validationResult.data,
      createdBy: auth.uid,
    })

    return NextResponse.json(
      { success: true, data: location, message: 'Local criado com sucesso' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating workplace location:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao criar local' },
      { status: 500 }
    )
  }
}
