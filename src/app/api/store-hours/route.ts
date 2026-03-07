import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { storeHoursSchema } from '@/lib/validators/pedido';
import { z } from 'zod';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const HOURS_COLLECTION = 'storeHours';

const DIAS_SEMANA_DEFAULTS = [
  { diaSemana: 0, diaSemanaLabel: 'Domingo', abreAs: '08:00', fechaAs: '18:00', fechado: true },
  { diaSemana: 1, diaSemanaLabel: 'Segunda-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 2, diaSemanaLabel: 'Terca-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 3, diaSemanaLabel: 'Quarta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 4, diaSemanaLabel: 'Quinta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 5, diaSemanaLabel: 'Sexta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 6, diaSemanaLabel: 'Sabado', abreAs: '08:00', fechaAs: '14:00', fechado: false },
];

// GET /api/store-hours - Get store hours
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar horarios');
    }

    const snapshot = await adminDb
      .collection(HOURS_COLLECTION)
      .orderBy('diaSemana', 'asc')
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, data: DIAS_SEMANA_DEFAULTS });
    }

    const hours = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: hours });
  } catch (error) {
    console.error('❌ Erro ao buscar horarios:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/store-hours - Update store hours (batch, all 7 days)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'update')) {
      return forbiddenResponse('Sem permissao para atualizar horarios');
    }

    const body = await request.json();

    // Validate array of store hours
    const arraySchema = z.array(storeHoursSchema);
    const validation = arraySchema.safeParse(body.hours || body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validacao falhou', details: errors },
        { status: 400 }
      );
    }

    const hours = validation.data;
    const batch = adminDb.batch();
    const now = FieldValue.serverTimestamp();

    for (const h of hours) {
      const docId = `day-${h.diaSemana}`;
      const ref = adminDb.collection(HOURS_COLLECTION).doc(docId);

      batch.set(ref, {
        diaSemana: h.diaSemana,
        diaSemanaLabel: h.diaSemanaLabel,
        abreAs: h.abreAs,
        fechaAs: h.fechaAs,
        fechado: h.fechado,
        createdAt: now,
        updatedBy: auth.uid,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Horarios atualizados com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar horarios:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
