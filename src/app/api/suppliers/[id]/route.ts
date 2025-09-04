import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateSupplierValidation } from '@/lib/validators/ingredient';
import { Supplier } from '@/types/ingredient';

// GET /api/suppliers/[id] - Get specific supplier
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      );
    }
    
    const data = docSnap.data();
    const supplier: Supplier = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Supplier;
    
    return NextResponse.json(supplier);
    
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar fornecedor' },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate input data
    const validatedData = updateSupplierValidation.parse({ ...body, id });
    
    // Remove id from the data to update
    const { id: _, ...updateData } = validatedData;
    
    // Check if supplier exists
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      );
    }
    
    // Update the document
    await updateDoc(docRef, updateData);
    
    // Return updated supplier
    const updatedSupplier: Supplier = {
      id,
      ...docSnap.data(),
      ...updateData
    } as Supplier;
    
    return NextResponse.json(updatedSupplier);
    
  } catch (error) {
    console.error('Error updating supplier:', error);
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar fornecedor' },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Delete supplier (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Check if supplier exists
    const docRef = doc(db, 'suppliers', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      );
    }
    
    // Soft delete by setting isActive to false
    await updateDoc(docRef, {
      isActive: false
    });
    
    return NextResponse.json({ message: 'Fornecedor removido com sucesso' });
    
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Erro ao remover fornecedor' },
      { status: 500 }
    );
  }
}