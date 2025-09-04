import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Recipe } from '@/types/ingredient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    let q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));

    if (category) {
      q = query(q, where('category', '==', category));
    }

    if (isActive !== null) {
      q = query(q, where('isActive', '==', isActive === 'true'));
    }

    const querySnapshot = await getDocs(q);
    const recipes: Recipe[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      lastCalculated: doc.data().lastCalculated?.toDate(),
    })) as Recipe[];

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      servings,
      prepTime,
      bakeTime,
      difficulty,
      ingredients,
      instructions,
      createdBy
    } = body;

    if (!name || !category || !servings || !ingredients || !instructions || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recipe = {
      name,
      description: description || null,
      category,
      servings,
      prepTime: prepTime || 0,
      bakeTime: bakeTime || 0,
      difficulty: difficulty || 'medium',
      ingredients,
      instructions,
      totalCost: null,
      costPerServing: null,
      isActive: true,
      createdAt: Timestamp.now(),
      createdBy,
      lastCalculated: null,
    };

    const docRef = await addDoc(collection(db, 'recipes'), recipe);

    return NextResponse.json({
      id: docRef.id,
      ...recipe,
      createdAt: recipe.createdAt.toDate(),
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}