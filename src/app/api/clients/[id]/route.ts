import { NextRequest, NextResponse } from 'next/server'
import { fetchClient, updateClient, deleteClient } from '@/lib/clients'
import { updateClientSchema } from '@/lib/validators/client'

// GET /api/clients/[id] - Get single client
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`🔍 GET /api/clients/${id} - Fetching client`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const client = await fetchClient(id)

    console.log(`✅ Successfully fetched client: ${client.name} (${client.id})`)

    return NextResponse.json({
      success: true,
      data: client
    })
  } catch (error) {
    console.error(`❌ Error fetching client ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

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
    console.log(`🔄 PUT /api/clients/${id} - Updating client`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('Update request body:', body)

    // Add the ID to the body for validation
    const dataWithId = { ...body, id }

    // Validate the client data
    const validationResult = updateClientSchema.safeParse(dataWithId)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
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

    const updateData = validationResult.data

    const client = await updateClient(id, updateData as any)

    console.log(`✅ Successfully updated client: ${client.name} (${client.id})`)

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente atualizado com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error updating client ${id}:`, error)

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
    console.log(`🗑️ DELETE /api/clients/${id} - Deleting client`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    await deleteClient(id)

    console.log(`✅ Successfully deleted client: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Cliente removido com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error deleting client ${id}:`, error)

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
