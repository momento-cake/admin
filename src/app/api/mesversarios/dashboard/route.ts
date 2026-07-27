import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { daysUntil, getNextDueMes } from '@/lib/mesversario-utils';
import { getRelativeDateLabel } from '@/lib/special-dates-utils';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import type { Mesversario, MesversarioDashboardEntry } from '@/types/mesversario';

const MESVERSARIOS_COLLECTION = 'mesversarios';

// GET /api/mesversarios/dashboard - Flattened next-due month per active baby
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar mesversários');
    }

    const snapshot = await adminDb
      .collection(MESVERSARIOS_COLLECTION)
      .where('isActive', '==', true)
      .where('status', '==', 'ATIVO')
      .get();

    const entries: MesversarioDashboardEntry[] = [];
    for (const doc of snapshot.docs) {
      const m = { id: doc.id, ...doc.data() } as Mesversario;
      const next = getNextDueMes(m);
      if (!next) continue;
      const days = daysUntil(next.dataComemoracao);
      entries.push({
        clienteId: m.clienteId,
        clienteNome: m.clienteNome,
        mesversarioId: m.id,
        bebeNome: m.bebeNome,
        numero: next.numero,
        dataComemoracao: next.dataComemoracao,
        status: next.status,
        daysUntil: days,
        relativeLabel: getRelativeDateLabel(days),
      });
    }

    entries.sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
      total: entries.length,
    });
  } catch (error) {
    logError('MESVERSARIOS_DASHBOARD_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
