import { NextRequest, NextResponse } from 'next/server';
import { getTimeEntry, updateTimeEntry } from '@/lib/time-tracking';
import { timeEntryUpdateSchema } from '@/lib/validators/time-tracking';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// GET /api/time-tracking/[entryId] - Get a single time entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar registros de ponto');
    }

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'ID do registro é obrigatório' },
        { status: 400 }
      );
    }

    const entry = await getTimeEntry(entryId);

    // Non-admin can only see their own entries
    if (auth.role !== 'admin' && entry.userId !== auth.uid) {
      return forbiddenResponse('Sem permissão para visualizar este registro');
    }

    return NextResponse.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error(`Erro ao buscar registro ${entryId}:`, error);

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Registro de ponto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao buscar registro de ponto',
      },
      { status: 500 }
    );
  }
}

// PUT /api/time-tracking/[entryId] - Update a time entry (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Only admins can update time entries manually
    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem editar registros de ponto');
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'update')) {
      return forbiddenResponse('Sem permissão para editar registros de ponto');
    }

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'ID do registro é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate update data
    const validationResult = timeEntryUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { markings, summary, reason } = validationResult.data;

    // Get performer name from Firestore for audit trail
    const performedByName = auth.uid; // Will be resolved by the service

    const entry = await updateTimeEntry(
      entryId,
      { markings: markings as any, summary },
      auth.uid,
      performedByName,
      reason
    );

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Registro de ponto atualizado com sucesso',
    });
  } catch (error) {
    console.error(`Erro ao atualizar registro ${entryId}:`, error);

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Registro de ponto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao atualizar registro de ponto',
      },
      { status: 500 }
    );
  }
}
