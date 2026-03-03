import { NextRequest, NextResponse } from 'next/server'
import { getWorkSchedule, updateWorkSchedule, deleteWorkSchedule } from '@/lib/work-schedules'
import { workScheduleSchema } from '@/lib/validators/time-tracking'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

// GET /api/work-schedules/[scheduleId] - Get single schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar escalas')
    }

    const { scheduleId } = await params
    const schedule = await getWorkSchedule(scheduleId)

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('Error fetching work schedule:', error)
    const status = error instanceof Error && error.message.includes('nao encontrada') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar escala' },
      { status }
    )
  }
}

// PUT /api/work-schedules/[scheduleId] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem editar escalas')
    }

    const { scheduleId } = await params
    const body = await request.json()

    const validationResult = workScheduleSchema.partial().safeParse(body)
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

    const schedule = await updateWorkSchedule(scheduleId, {
      ...validationResult.data,
      lastModifiedBy: auth.uid,
    })

    return NextResponse.json({ success: true, data: schedule, message: 'Escala atualizada com sucesso' })
  } catch (error) {
    console.error('Error updating work schedule:', error)
    const status = error instanceof Error && error.message.includes('nao encontrada') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar escala' },
      { status }
    )
  }
}

// DELETE /api/work-schedules/[scheduleId] - Soft delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem excluir escalas')
    }

    const { scheduleId } = await params
    await deleteWorkSchedule(scheduleId)

    return NextResponse.json({ success: true, message: 'Escala excluida com sucesso' })
  } catch (error) {
    console.error('Error deleting work schedule:', error)
    const status = error instanceof Error && error.message.includes('nao encontrada') ? 404 : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir escala' },
      { status }
    )
  }
}
