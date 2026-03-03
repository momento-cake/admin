import { NextRequest, NextResponse } from 'next/server';
import {
  getHolidaysByYear,
  createHoliday,
  deleteHoliday,
  getBrazilianNationalHolidays,
} from '@/lib/holidays';
import {
  getAuthFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

// GET /api/holidays?year=2026
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const yearParam = request.nextUrl.searchParams.get('year');
    if (!yearParam) {
      return NextResponse.json(
        { success: false, error: 'Parametro year e obrigatorio' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);
    if (isNaN(year)) {
      return NextResponse.json(
        { success: false, error: 'Ano invalido' },
        { status: 400 }
      );
    }

    const holidays = await getHolidaysByYear(year);

    return NextResponse.json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error('Erro ao buscar feriados:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Erro ao buscar feriados',
      },
      { status: 500 }
    );
  }
}

// POST /api/holidays
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem gerenciar feriados');
    }

    const body = await request.json();
    const { action } = body;

    // Seed national holidays
    if (action === 'seed') {
      const { year } = body;
      if (!year) {
        return NextResponse.json(
          { success: false, error: 'Parametro year e obrigatorio' },
          { status: 400 }
        );
      }

      const nationalHolidays = getBrazilianNationalHolidays(year);
      const existing = await getHolidaysByYear(year);
      const existingDates = new Set(existing.map((h) => h.date));
      const newHolidays = nationalHolidays.filter((h) => !existingDates.has(h.date));

      if (newHolidays.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Todos os feriados nacionais ja estao cadastrados para este ano',
        });
      }

      const created = [];
      for (const holiday of newHolidays) {
        const h = await createHoliday({
          ...holiday,
          createdBy: auth.uid,
        });
        created.push(h);
      }

      return NextResponse.json({
        success: true,
        data: created,
        message: `${created.length} feriados adicionados com sucesso`,
      });
    }

    // Create single holiday
    const { date, name, type, year } = body;
    if (!date || !name || !type || !year) {
      return NextResponse.json(
        { success: false, error: 'Campos date, name, type e year sao obrigatorios' },
        { status: 400 }
      );
    }

    const holiday = await createHoliday({
      date,
      name,
      type,
      year,
      createdBy: auth.uid,
    });

    return NextResponse.json(
      { success: true, data: holiday },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar feriado:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Erro ao criar feriado',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/holidays
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (auth.role !== 'admin') {
      return forbiddenResponse('Apenas administradores podem excluir feriados');
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Parametro id e obrigatorio' },
        { status: 400 }
      );
    }

    await deleteHoliday(id);

    return NextResponse.json({
      success: true,
      message: 'Feriado excluido com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir feriado:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Erro ao excluir feriado',
      },
      { status: 500 }
    );
  }
}
