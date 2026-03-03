import { NextRequest, NextResponse } from 'next/server'
import { getLocation, updateLocation, deleteLocation } from '@/lib/workplace-locations'
import { workplaceLocationSchema } from '@/lib/validators/time-tracking'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

// GET /api/workplace-locations/[locationId] - Get single location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar locais')
    }

    const { locationId } = await params
    const location = await getLocation(locationId)

    return NextResponse.json({ success: true, data: location })
  } catch (error) {
    console.error('Error fetching workplace location:', error)
    const status = error instanceof Error && error.message.includes('nao encontrado') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar local' },
      { status }
    )
  }
}

// PUT /api/workplace-locations/[locationId] - Update location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem editar locais')
    }

    const { locationId } = await params
    const body = await request.json()

    const validationResult = workplaceLocationSchema.partial().safeParse(body)
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

    const location = await updateLocation(locationId, validationResult.data)

    return NextResponse.json({ success: true, data: location, message: 'Local atualizado com sucesso' })
  } catch (error) {
    console.error('Error updating workplace location:', error)
    const status = error instanceof Error && error.message.includes('nao encontrado') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar local' },
      { status }
    )
  }
}

// DELETE /api/workplace-locations/[locationId] - Soft delete location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem excluir locais')
    }

    const { locationId } = await params
    await deleteLocation(locationId)

    return NextResponse.json({ success: true, message: 'Local excluido com sucesso' })
  } catch (error) {
    console.error('Error deleting workplace location:', error)
    const status = error instanceof Error && error.message.includes('nao encontrado') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir local' },
      { status }
    )
  }
}
