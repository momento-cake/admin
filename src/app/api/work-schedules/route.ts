import { NextRequest, NextResponse } from 'next/server'
import { getWorkSchedules, createWorkSchedule } from '@/lib/work-schedules'
import { workScheduleSchema } from '@/lib/validators/time-tracking'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

// GET /api/work-schedules - List all active schedules
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar escalas')
    }

    const schedules = await getWorkSchedules()

    return NextResponse.json({ success: true, data: schedules })
  } catch (error) {
    console.error('Error fetching work schedules:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao buscar escalas' },
      { status: 500 }
    )
  }
}

// POST /api/work-schedules - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem criar escalas')
    }

    const body = await request.json()

    const validationResult = workScheduleSchema.safeParse(body)
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

    const schedule = await createWorkSchedule({
      ...validationResult.data,
      createdBy: auth.uid,
      lastModifiedBy: auth.uid,
    })

    return NextResponse.json(
      { success: true, data: schedule, message: 'Escala criada com sucesso' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating work schedule:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao criar escala' },
      { status: 500 }
    )
  }
}
