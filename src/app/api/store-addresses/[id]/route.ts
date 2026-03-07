import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { storeAddressSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const ADDRESSES_COLLECTION = 'storeAddresses';

// PUT /api/store-addresses/[id] - Update a store address
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'update')) {
      return forbiddenResponse('Sem permissao para atualizar enderecos da loja');
    }

    const body = await request.json();

    const validation = storeAddressSchema.partial().safeParse(body);
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

    const docSnapshot = await adminDb.collection(ADDRESSES_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Endereço não encontrado' }, { status: 404 });
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
        if (doc.id !== id) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    await adminDb.collection(ADDRESSES_COLLECTION).doc(id).update(data);

    const updatedDoc = await adminDb.collection(ADDRESSES_COLLECTION).doc(id).get();

    return NextResponse.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar endereco da loja:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/store-addresses/[id] - Delete a store address (soft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'update')) {
      return forbiddenResponse('Sem permissao para excluir enderecos da loja');
    }

    const docSnapshot = await adminDb.collection(ADDRESSES_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Endereço não encontrado' }, { status: 404 });
    }

    const addressData = docSnapshot.data()!;

    await adminDb.collection(ADDRESSES_COLLECTION).doc(id).update({
      isActive: false,
    });

    // If deleted address was default, set another as default
    if (addressData.isDefault) {
      const remaining = await adminDb
        .collection(ADDRESSES_COLLECTION)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!remaining.empty) {
        await remaining.docs[0].ref.update({ isDefault: true });
      }
    }

    return NextResponse.json({ success: true, message: 'Endereço excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir endereco da loja:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
