import { NextRequest, NextResponse } from 'next/server';
import {
  clockIn,
  clockLunchOut,
  clockLunchIn,
  clockOut,
} from '@/lib/time-tracking';
import { clockOperationSchema } from '@/lib/validators/time-tracking';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// POST /api/time-tracking/clock - Perform a clock operation
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'time_tracking', 'create')) {
      return forbiddenResponse('Sem permissão para registrar ponto');
    }

    const body = await request.json();

    // Validate request body
    const validationResult = clockOperationSchema.safeParse(body);
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

    const { type, geolocation } = validationResult.data;

    const options = geolocation
      ? {
          geolocation: {
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
            accuracy: geolocation.accuracy,
          },
        }
      : undefined;

    let entry;
    switch (type) {
      case 'clock_in':
        entry = await clockIn(auth.uid, options);
        break;
      case 'lunch_out':
        entry = await clockLunchOut(auth.uid, options);
        break;
      case 'lunch_in':
        entry = await clockLunchIn(auth.uid, options);
        break;
      case 'clock_out':
        entry = await clockOut(auth.uid, options);
        break;
    }

    return NextResponse.json(
      {
        success: true,
        data: entry,
        message: `Ponto registrado com sucesso: ${formatType(type)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar ponto:', error);

    const message =
      error instanceof Error ? error.message : 'Erro ao registrar ponto';
    const status = message.includes('já foi registrada') || message.includes('Registre') ? 400 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    clock_in: 'Entrada',
    lunch_out: 'Saída Almoço',
    lunch_in: 'Retorno Almoço',
    clock_out: 'Saída',
  };
  return labels[type] || type;
}
