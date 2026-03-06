import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { updateClientSchema } from '@/lib/validators/client'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

const CLIENTS_COLLECTION = 'clients'

// GET /api/clients/[id] - Get single client
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'clients', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar clientes')
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const docSnapshot = await adminDb.collection(CLIENTS_COLLECTION).doc(id).get()

    if (!docSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { id: docSnapshot.id, ...docSnapshot.data() }
    })
  } catch (error) {
    console.error(`Error fetching client ${id}:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar cliente'
      },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'clients', 'update')) {
      return forbiddenResponse('Sem permissão para editar clientes')
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Add the ID to the body for validation
    const dataWithId = { ...body, id }

    // Validate the client data
    const validationResult = updateClientSchema.safeParse(dataWithId)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Fetch existing client
    const existingDoc = await adminDb.collection(CLIENTS_COLLECTION).doc(id).get()
    if (!existingDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    const existingData = existingDoc.data()!

    // Prevent editing inactive clients
    if (!existingData.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cliente inativo não pode ser editado. Restaure primeiro.' },
        { status: 400 }
      )
    }

    const { id: _validatedId, ...updateFields } = validationResult.data

    // If updating CPF/CNPJ, check for duplicates
    if (updateFields.cpfCnpj && updateFields.cpfCnpj !== existingData.cpfCnpj) {
      const existingSnapshot = await adminDb
        .collection(CLIENTS_COLLECTION)
        .where('cpfCnpj', '==', updateFields.cpfCnpj)
        .where('isActive', '==', true)
        .get()

      const isDuplicate = existingSnapshot.docs.some((doc) => doc.id !== id)
      if (isDuplicate) {
        const label = existingData.type === 'business' ? 'CNPJ' : 'CPF'
        return NextResponse.json(
          { success: false, error: `Já existe outro cliente com esse ${label}` },
          { status: 409 }
        )
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      ...updateFields,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid
    }

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key]
      }
    })

    await adminDb.collection(CLIENTS_COLLECTION).doc(id).update(updatePayload)

    // Return merged result
    const updatedClient = {
      id,
      ...existingData,
      ...updatePayload,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Cliente atualizado com sucesso'
    })
  } catch (error) {
    console.error(`Error updating client ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar cliente'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Soft delete client
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    if (!canPerformActionFromRequest(auth, 'clients', 'delete')) {
      return forbiddenResponse('Sem permissão para excluir clientes')
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Verify client exists
    const docSnapshot = await adminDb.collection(CLIENTS_COLLECTION).doc(id).get()
    if (!docSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete: set isActive = false
    await adminDb.collection(CLIENTS_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso'
    })
  } catch (error) {
    console.error(`Error deleting client ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar cliente'
      },
      { status: 500 }
    )
  }
}
