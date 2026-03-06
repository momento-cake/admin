import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getAuthFromRequest, unauthorizedResponse } from '@/lib/api-auth'

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    const [usersSnap, clientsSnap, ingredientsSnap, recipesSnap] = await Promise.all([
      adminDb.collection('users').where('isActive', '==', true).count().get(),
      adminDb.collection('clients').where('isActive', '==', true).count().get(),
      adminDb.collection('ingredients').where('isActive', '==', true).count().get(),
      adminDb.collection('recipes').where('isActive', '==', true).count().get(),
    ])

    const stats = {
      users: usersSnap.data().count,
      clients: clientsSnap.data().count,
      ingredients: ingredientsSnap.data().count,
      recipes: recipesSnap.data().count,
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar estatísticas do dashboard',
      },
      { status: 500 }
    )
  }
}
