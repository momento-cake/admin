import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createProductValidation } from '@/lib/validators/product';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'productCategories';
const SUBCATEGORIES_COLLECTION = 'productSubcategories';
const SKU_COUNTER_COLLECTION = 'skuCounters';

// GET /api/products - Fetch products with optional filtering
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'products', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar produtos');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const subcategoryId = searchParams.get('subcategoryId') || undefined;
    const limitStr = searchParams.get('limit') || '20';

    const limit = Math.min(parseInt(limitStr), 100);

    let q: FirebaseFirestore.Query = adminDb
      .collection(PRODUCTS_COLLECTION)
      .where('isActive', '==', true);

    if (searchQuery) {
      q = q
        .where('name', '>=', searchQuery)
        .where('name', '<=', searchQuery + '\uf8ff');
    } else if (categoryId) {
      q = q.where('categoryId', '==', categoryId);
      if (subcategoryId) {
        q = q.where('subcategoryId', '==', subcategoryId);
      }
      q = q.orderBy('name');
    } else {
      q = q.orderBy('name');
    }

    q = q.limit(limit);

    const snapshot = await q.get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count
    let totalQuery: FirebaseFirestore.Query = adminDb
      .collection(PRODUCTS_COLLECTION)
      .where('isActive', '==', true);

    if (searchQuery) {
      totalQuery = totalQuery
        .where('name', '>=', searchQuery)
        .where('name', '<=', searchQuery + '\uf8ff');
    } else if (categoryId) {
      totalQuery = totalQuery.where('categoryId', '==', categoryId);
      if (subcategoryId) {
        totalQuery = totalQuery.where('subcategoryId', '==', subcategoryId);
      }
    }

    const totalSnapshot = await totalQuery.get();
    const total = totalSnapshot.size;

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
      total,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'products', 'create')) {
      return forbiddenResponse('Sem permissao para criar produtos');
    }

    const body = await request.json();

    // Validate request body
    const validation = createProductValidation.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Fetch category and subcategory for denormalized names and SKU codes
    const [categoryDoc, subcategoryDoc] = await Promise.all([
      adminDb.collection(CATEGORIES_COLLECTION).doc(data.categoryId).get(),
      adminDb.collection(SUBCATEGORIES_COLLECTION).doc(data.subcategoryId).get(),
    ]);

    if (!categoryDoc.exists || !subcategoryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Category or subcategory not found' },
        { status: 400 }
      );
    }

    const categoryData = categoryDoc.data()!;
    const subcategoryData = subcategoryDoc.data()!;

    // Generate SKU using transaction for atomic counter increment
    const skuCounterRef = adminDb
      .collection(SKU_COUNTER_COLLECTION)
      .doc(`${data.categoryId}-${data.subcategoryId}`);

    const sku = await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(skuCounterRef);
      const currentCounter = counterDoc.exists ? counterDoc.data()!.count : 0;
      const nextCounter = currentCounter + 1;

      transaction.set(skuCounterRef, { count: nextCounter }, { merge: true });

      const paddedCounter = String(nextCounter).padStart(3, '0');
      return `${categoryData.code}-${subcategoryData.code}-${paddedCounter}`;
    });

    // Calculate cost from recipes + packages
    let costPrice = 0;
    if (data.productRecipes) {
      costPrice += data.productRecipes.reduce((sum, r) => sum + (r.recipeCost || 0), 0);
    }
    if (data.productPackages) {
      costPrice += data.productPackages.reduce((sum, p) => sum + (p.packageCost || 0), 0);
    }

    const suggestedPrice = costPrice * (1 + data.markup / 100);
    const profitMargin = data.price > 0 ? (data.price - costPrice) / data.price : 0;

    const now = FieldValue.serverTimestamp();
    const productData = {
      name: data.name,
      description: data.description || null,
      categoryId: data.categoryId,
      categoryName: categoryData.name,
      subcategoryId: data.subcategoryId,
      subcategoryName: subcategoryData.name,
      sku,
      price: data.price,
      costPrice,
      suggestedPrice,
      markup: data.markup,
      profitMargin,
      productRecipes: data.productRecipes,
      productPackages: data.productPackages || [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid,
    };

    const docRef = await adminDb.collection(PRODUCTS_COLLECTION).add(productData);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: docRef.id,
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
