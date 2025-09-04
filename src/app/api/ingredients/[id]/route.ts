import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateIngredientValidation } from '@/lib/validators/ingredient';
import { Ingredient } from '@/types/ingredient';

// GET /api/ingredients/[id] - Get specific ingredient
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const docRef = doc(db, 'ingredients', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado' },
        { status: 404 }
      );
    }
    
    const data = docSnap.data();
    const ingredient: Ingredient = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastUpdated: data.lastUpdated?.toDate() || new Date()
    } as Ingredient;
    
    return NextResponse.json(ingredient);
    
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ingrediente' },
      { status: 500 }
    );
  }
}

// PUT /api/ingredients/[id] - Update ingredient
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate input data
    const validatedData = updateIngredientValidation.parse({ ...body, id });
    
    // Remove id from the data to update (Firestore doesn't allow updating the document ID)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _idToRemove, ...updateData } = validatedData;
    
    // Check if ingredient exists
    const docRef = doc(db, 'ingredients', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado' },
        { status: 404 }
      );
    }
    
    // Update the document
    const updatedData = {
      ...updateData,
      lastUpdated: serverTimestamp()
    };
    
    await updateDoc(docRef, updatedData);
    
    // Return updated ingredient
    const updatedIngredient: Ingredient = {
      id,
      ...docSnap.data(),
      ...updateData,
      lastUpdated: new Date()
    } as Ingredient;
    
    return NextResponse.json(updatedIngredient);
    
  } catch (error) {
    console.error('Error updating ingredient:', error);
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar ingrediente' },
      { status: 500 }
    );
  }
}

// DELETE /api/ingredients/[id] - Delete ingredient (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Check if ingredient exists
    const docRef = doc(db, 'ingredients', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado' },
        { status: 404 }
      );
    }
    
    // Soft delete by setting isActive to false
    await updateDoc(docRef, {
      isActive: false,
      lastUpdated: serverTimestamp()
    });
    
    return NextResponse.json({ message: 'Ingrediente removido com sucesso' });
    
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json(
      { error: 'Erro ao remover ingrediente' },
      { status: 500 }
    );
  }
}