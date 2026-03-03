import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditLogsForEntry,
  getAuditLogsForEmployee,
} from '@/lib/time-tracking-audit';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// GET /api/time-tracking/audit - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar logs de auditoria');
    }

    const searchParams = request.nextUrl.searchParams;
    const timeEntryId = searchParams.get('timeEntryId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Audit logs for a specific time entry
    if (timeEntryId) {
      const logs = await getAuditLogsForEntry(timeEntryId);

      // Non-admin can only see audit logs for their own entries
      if (auth.role !== 'admin' && logs.length > 0 && logs[0].userId !== auth.uid) {
        return forbiddenResponse('Sem permissao para visualizar estes logs');
      }

      return NextResponse.json({
        success: true,
        data: logs,
        total: logs.length,
      });
    }

    // Audit logs for a specific employee
    const targetUserId = auth.role === 'admin' && userId ? userId : auth.uid;

    const logs = await getAuditLogsForEmployee(
      targetUserId,
      startDate || undefined,
      endDate || undefined
    );

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao buscar logs de auditoria',
      },
      { status: 500 }
    );
  }
}
