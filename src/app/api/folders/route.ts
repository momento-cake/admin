import { NextRequest, NextResponse } from 'next/server'
import { fetchFolders, createFolder } from '@/lib/folders'
import { createFolderSchema, folderQuerySchema } from '@/lib/validators/folder'
import { FolderQueryFilters } from '@/types/folder'

// GET /api/folders - Get all folders with filters
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/folders - Fetching folders')

    const searchParams = request.nextUrl.searchParams

    const filters: FolderQueryFilters = {
      searchQuery: searchParams.get('searchQuery') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : searchParams.get('isPublic') === 'false' ? false : undefined,
      sortBy: (searchParams.get('sortBy') as 'createdAt' | 'name' | 'updatedAt') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    }

    // Validate query parameters
    const validationResult = folderQuerySchema.safeParse(filters)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetros de consulta inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const result = await fetchFolders(filters)

    console.log(`✅ Successfully fetched ${result.folders.length} folders`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error fetching folders:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar pastas'
      },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create new folder
export async function POST(request: NextRequest) {
  try {
    console.log('➕ POST /api/folders - Creating folder')

    const body = await request.json()
    // Request body log removed to avoid logging potentially sensitive data

    // Validate the folder data
    const validationResult = createFolderSchema.safeParse(body)
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

    const folderData = validationResult.data

    // TODO: Get actual user ID from auth context
    const userId = body.userId || 'system'

    const folder = await createFolder(folderData, userId)

    console.log(`✅ Successfully created folder: ${folder.name} (${folder.id})`)

    return NextResponse.json(
      {
        success: true,
        data: folder,
        message: 'Pasta criada com sucesso'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating folder:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pasta'
      },
      { status: 500 }
    )
  }
}
