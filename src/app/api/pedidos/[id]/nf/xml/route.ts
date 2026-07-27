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

// GET /api/pedidos/[id]/nf/xml — stream the authorized nfeProc XML
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

    const data = snapshot.data() as { nfXmlPath?: string | null; nfAccessKey?: string | null };
    if (!data.nfXmlPath) {
      return NextResponse.json(
        { success: false, error: 'XML não disponível para este pedido' },
        { status: 404 },
      );
    }

    const [buffer] = await getFiscalBucket().file(data.nfXmlPath).download();
    const filename = `NFe-${data.nfAccessKey ?? id}.xml`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logError('PEDIDO_NF_XML_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
