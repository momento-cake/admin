import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getFiscalBucket } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { formatErrorMessage, logError } from '@/lib/error-handler';

export const runtime = 'nodejs';

const PEDIDOS_COLLECTION = 'pedidos';

// GET /api/pedidos/[id]/nf/danfe — stream the authorized DANFE PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();
    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar notas fiscais');
    }

    const snapshot = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 },
      );
    }

    const data = snapshot.data() as { nfDanfePath?: string | null; nfAccessKey?: string | null };
    if (!data.nfDanfePath) {
      return NextResponse.json(
        { success: false, error: 'DANFE não disponível para este pedido' },
        { status: 404 },
      );
    }

    const [buffer] = await getFiscalBucket().file(data.nfDanfePath).download();
    const filename = `NFe-${data.nfAccessKey ?? id}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError('PEDIDO_NF_DANFE_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
