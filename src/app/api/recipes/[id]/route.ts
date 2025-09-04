import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Recipe } from '@/types/ingredient';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docRef = doc(db, 'recipes', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const recipe = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data()?.createdAt.toDate(),
      lastCalculated: docSnap.data()?.lastCalculated?.toDate(),
    } as Recipe;

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const docRef = doc(db, 'recipes', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const updateData = {
      ...body,
      lastCalculated: body.totalCost !== undefined ? Timestamp.now() : docSnap.data()?.lastCalculated,
    };

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    const recipe = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt.toDate(),
      lastCalculated: updatedDoc.data()?.lastCalculated?.toDate(),
    } as Recipe;

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docRef = doc(db, 'recipes', id);
    
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    await deleteDoc(docRef);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}