import { NextRequest, NextResponse } from 'next/server';
import { getTimeEntries, getAllEmployeesEntries } from '@/lib/time-tracking';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// GET /api/time-tracking - List time entries with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar registros de ponto');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date'); // Single date for admin overview

    // Admin: get all employees for a single date
    if (date && auth.role === 'admin') {
      const entries = await getAllEmployeesEntries(date);
      return NextResponse.json({
        success: true,
        data: entries,
        total: entries.length,
      });
    }

    // Non-admin users can only see their own entries
    const targetUserId = auth.role === 'admin' && userId ? userId : auth.uid;

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetros startDate e endDate são obrigatórios',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de data inválido. Use AAAA-MM-DD',
        },
        { status: 400 }
      );
    }

    const entries = await getTimeEntries(targetUserId, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: entries,
      total: entries.length,
    });
  } catch (error) {
    console.error('Erro ao buscar registros de ponto:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao buscar registros de ponto',
      },
      { status: 500 }
    );
  }
}
