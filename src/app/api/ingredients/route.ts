import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ingredientValidation, ingredientFiltersValidation } from '@/lib/validators/ingredient';
import { Ingredient } from '@/types/ingredient';

// GET /api/ingredients - List ingredients with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const filters = ingredientFiltersValidation.parse({
      category: searchParams.get('category') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
      stockStatus: searchParams.get('stockStatus') || undefined,
      searchQuery: searchParams.get('searchQuery') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    });

    // Build Firestore query
    let ingredientsQuery = query(
      collection(db, 'ingredients'),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );

    // Apply category filter
    if (filters.category) {
      ingredientsQuery = query(
        collection(db, 'ingredients'),
        where('isActive', '==', true),
        where('category', '==', filters.category),
        orderBy('name', 'asc')
      );
    }

    // Apply supplier filter
    if (filters.supplierId) {
      ingredientsQuery = query(
        ingredientsQuery,
        where('supplierId', '==', filters.supplierId)
      );
    }

    // Apply pagination
    if (filters.page > 1) {
      // For real pagination, we'd need to implement cursor-based pagination
      // For now, we'll use limit with offset simulation
      ingredientsQuery = query(ingredientsQuery, limit(filters.limit));
    } else {
      ingredientsQuery = query(ingredientsQuery, limit(filters.limit));
    }

    const querySnapshot = await getDocs(ingredientsQuery);
    let ingredients: Ingredient[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ingredients.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as Ingredient);
    });

    // Apply stock status filter (client-side for now)
    if (filters.stockStatus) {
      ingredients = ingredients.filter((ingredient) => {
        const stockRatio = ingredient.currentStock / ingredient.minStock;
        switch (filters.stockStatus) {
          case 'good':
            return stockRatio > 1;
          case 'low':
            return stockRatio <= 1 && stockRatio > 0.5;
          case 'critical':
            return stockRatio <= 0.5 && ingredient.currentStock > 0;
          case 'out':
            return ingredient.currentStock === 0;
          default:
            return true;
        }
      });
    }

    // Apply search filter (client-side for now)
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      ingredients = ingredients.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(searchTerm) ||
        ingredient.description?.toLowerCase().includes(searchTerm) ||
        ingredient.category.toLowerCase().includes(searchTerm)
      );
    }

    return NextResponse.json({
      ingredients,
      total: ingredients.length,
      page: filters.page,
      limit: filters.limit
    });

  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ingredientes' },
      { status: 500 }
    );
  }
}

// POST /api/ingredients - Create new ingredient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = ingredientValidation.parse(body);
    
    // TODO: Get user ID from authentication context
    const userId = 'current-user-id'; // This should come from auth middleware
    
    // Create ingredient document
    const ingredientData = {
      ...validatedData,
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: userId,
      lastUpdated: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'ingredients'), ingredientData);
    
    // Return the created ingredient with the generated ID
    const newIngredient: Ingredient = {
      id: docRef.id,
      ...validatedData,
      isActive: true,
      createdAt: new Date(),
      createdBy: userId,
      lastUpdated: new Date()
    };

    return NextResponse.json(newIngredient, { status: 201 });

  } catch (error) {
    console.error('Error creating ingredient:', error);
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar ingrediente' },
      { status: 500 }
    );
  }
}