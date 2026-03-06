import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateProductValidation } from '@/lib/validators/product';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'productCategories';
const SUBCATEGORIES_COLLECTION = 'productSubcategories';

// GET /api/products/[id] - Fetch a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'products', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar produtos');
    }

    const docSnapshot = await adminDb.collection(PRODUCTS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { id: docSnapshot.id, ...docSnapshot.data() },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a product
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

    if (!canPerformActionFromRequest(auth, 'products', 'update')) {
      return forbiddenResponse('Sem permissao para atualizar produtos');
    }

    const body = await request.json();

    // Validate request body
    const validation = updateProductValidation.safeParse({ id, ...body });
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

    // Fetch existing product
    const existingDoc = await adminDb.collection(PRODUCTS_COLLECTION).doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const existingData = existingDoc.data()!;
    const { id: _validatedId, ...validatedData } = validation.data;

    // Merge with existing data for cost calculation
    const mergedData = { ...existingData, ...validatedData };

    // Recalculate costs
    let costPrice = 0;
    if (mergedData.productRecipes) {
      costPrice += mergedData.productRecipes.reduce(
        (sum: number, r: { recipeCost?: number }) => sum + (r.recipeCost || 0),
        0
      );
    }
    if (mergedData.productPackages) {
      costPrice += mergedData.productPackages.reduce(
        (sum: number, p: { packageCost?: number }) => sum + (p.packageCost || 0),
        0
      );
    }

    const markup = mergedData.markup || 0;
    const price = mergedData.price || 0;
    const suggestedPrice = costPrice * (1 + markup / 100);
    const profitMargin = price > 0 ? (price - costPrice) / price : 0;

    // If category or subcategory changed, update denormalized names
    let categoryName = existingData.categoryName;
    let subcategoryName = existingData.subcategoryName;

    if (validatedData.categoryId && validatedData.categoryId !== existingData.categoryId) {
      const categoryDoc = await adminDb
        .collection(CATEGORIES_COLLECTION)
        .doc(validatedData.categoryId)
        .get();
      if (categoryDoc.exists) {
        categoryName = categoryDoc.data()!.name;
      }
    }

    if (validatedData.subcategoryId && validatedData.subcategoryId !== existingData.subcategoryId) {
      const subcategoryDoc = await adminDb
        .collection(SUBCATEGORIES_COLLECTION)
        .doc(validatedData.subcategoryId)
        .get();
      if (subcategoryDoc.exists) {
        subcategoryName = subcategoryDoc.data()!.name;
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      ...validatedData,
      categoryName,
      subcategoryName,
      costPrice,
      suggestedPrice,
      profitMargin,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await adminDb.collection(PRODUCTS_COLLECTION).doc(id).update(updatePayload);

    // Return the merged result
    const updatedProduct = {
      id,
      ...existingData,
      ...updatePayload,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product (soft delete)
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

    if (!canPerformActionFromRequest(auth, 'products', 'delete')) {
      return forbiddenResponse('Sem permissao para excluir produtos');
    }

    // Verify product exists
    const docSnapshot = await adminDb.collection(PRODUCTS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Soft delete: set isActive = false
    await adminDb.collection(PRODUCTS_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: 'Produto excluido com sucesso' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
