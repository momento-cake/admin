import { NextRequest, NextResponse } from 'next/server'
import { fetchPublicFolder } from '@/lib/folders'

// GET /api/public/folders/[slug] - Get public folder by slug (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    console.log(`🌐 GET /api/public/folders/${slug} - Fetching public folder`)

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug da pasta é obrigatório' },
        { status: 400 }
      )
    }

    const folder = await fetchPublicFolder(slug)

    if (!folder) {
      console.log(`⚠️ Public folder not found: ${slug}`)
      return NextResponse.json(
        { success: false, error: 'Galeria não encontrada' },
        { status: 404 }
      )
    }

    console.log(`✅ Successfully fetched public folder: ${folder.name} with ${folder.imageCount} images`)

    // Set cache headers for public content
    const response = NextResponse.json({
      success: true,
      data: folder
    })

    // Cache for 5 minutes on CDN, 1 minute in browser
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')

    return response
  } catch (error) {
    console.error(`❌ Error fetching public folder ${slug}:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar galeria'
      },
      { status: 500 }
    )
  }
}
