import { NextRequest, NextResponse } from 'next/server';
import { getTimeEntries, getAllEmployeesEntries } from '@/lib/time-tracking';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// GET /api/time-tracking/export - Export time entries data
// Returns JSON data that the client will format as CSV or PDF
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para exportar registros de ponto');
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const exportType = searchParams.get('type') || 'single'; // 'single' or 'all'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Parametros startDate e endDate sao obrigatorios' },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Formato de data invalido. Use AAAA-MM-DD' },
        { status: 400 }
      );
    }

    // Single employee export
    if (exportType === 'single') {
      const targetUserId = auth.role === 'admin' && userId ? userId : auth.uid;
      const entries = await getTimeEntries(targetUserId, startDate, endDate);

      return NextResponse.json({
        success: true,
        data: {
          entries,
          userId: targetUserId,
          period: { start: startDate, end: endDate },
        },
      });
    }

    // All employees export (admin only)
    if (exportType === 'all') {
      if (auth.role !== 'admin') {
        return forbiddenResponse(
          'Apenas administradores podem exportar registros de todos os funcionarios'
        );
      }

      // Fetch entries for each day in the range and aggregate
      const allEntries: Record<string, any[]> = {};
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayEntries = await getAllEmployeesEntries(dateStr);
        for (const entry of dayEntries) {
          if (!allEntries[entry.userId]) {
            allEntries[entry.userId] = [];
          }
          allEntries[entry.userId].push(entry);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          employeeEntries: Object.entries(allEntries).map(
            ([empUserId, entries]) => ({
              userId: empUserId,
              entries,
            })
          ),
          period: { start: startDate, end: endDate },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Tipo de exportacao invalido' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao exportar registros:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao exportar registros de ponto',
      },
      { status: 500 }
    );
  }
}
