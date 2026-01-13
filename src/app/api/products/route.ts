import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { fetchProducts, createProduct } from '@/lib/products';
import { createProductValidation } from '@/lib/validators/product';
import { ProductFilters } from '@/types/product';

// GET /api/products - Fetch products with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Get current user for auth check
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const subcategoryId = searchParams.get('subcategoryId') || undefined;
    const limitStr = searchParams.get('limit') || '20';
    const offsetStr = searchParams.get('offset') || '0';

    const limit = Math.min(parseInt(limitStr), 100); // Max 100 per request
    const offset = Math.max(parseInt(offsetStr), 0);

    const filters: ProductFilters = {
      ...(searchQuery && { searchQuery }),
      ...(categoryId && { categoryId }),
      ...(subcategoryId && { subcategoryId })
    };

    const result = await fetchProducts(filters, limit, offset);

    return NextResponse.json({
      success: true,
      data: result.products,
      count: result.products.length,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    // Get current user for auth check
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (this is checked in Firestore rules as well)
    const idTokenResult = await user.getIdTokenResult();
    const isAdmin = idTokenResult.claims.isAdmin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const validation = createProductValidation.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Create product - cast to expected type as Zod schema may have optional id
    const product = await createProduct(validation.data as Parameters<typeof createProduct>[0], user.uid);

    return NextResponse.json(
      { success: true, data: product },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
