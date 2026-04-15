import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { storeAddressSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const ADDRESSES_COLLECTION = 'storeAddresses';

// GET /api/store-addresses - List active store addresses
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Store addresses are operational data needed by anyone who can view
    // orders. Allow either settings:view or orders:view.
    if (
      !canPerformActionFromRequest(auth, 'settings', 'view') &&
      !canPerformActionFromRequest(auth, 'orders', 'view')
    ) {
      return forbiddenResponse('Sem permissao para visualizar enderecos da loja');
    }

    const snapshot = await adminDb
      .collection(ADDRESSES_COLLECTION)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'asc')
      .get();

    const addresses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    console.error('❌ Erro ao buscar enderecos da loja:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/store-addresses - Create a new store address
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'update')) {
      return forbiddenResponse('Sem permissao para criar enderecos da loja');
    }

    const body = await request.json();

    const validation = storeAddressSchema.safeParse(body);
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

    const data = validation.data;

    // If marked as default, clear other defaults
    if (data.isDefault) {
      const existingDefaults = await adminDb
        .collection(ADDRESSES_COLLECTION)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .get();

      const batch = adminDb.batch();
      existingDefaults.docs.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const now = FieldValue.serverTimestamp();
    const addressData = {
      ...data,
      isActive: true,
      createdAt: now,
      createdBy: auth.uid,
    };

    const docRef = await adminDb.collection(ADDRESSES_COLLECTION).add(addressData);

    return NextResponse.json(
      {
        success: true,
        data: { id: docRef.id, ...addressData },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Erro ao criar endereco da loja:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
