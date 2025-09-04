import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp, startAt, endAt } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IngredientUsage } from '@/types/ingredient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ingredientId = searchParams.get('ingredientId');
    const limitParam = searchParams.get('limit');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const usageType = searchParams.get('usageType');

    let q = query(collection(db, 'ingredientUsage'), orderBy('date', 'desc'));

    if (ingredientId) {
      q = query(q, where('ingredientId', '==', ingredientId));
    }

    if (usageType) {
      q = query(q, where('usageType', '==', usageType));
    }

    if (limitParam) {
      q = query(q, limit(parseInt(limitParam)));
    }

    const querySnapshot = await getDocs(q);
    let usage: IngredientUsage[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    })) as IngredientUsage[];

    // Apply date filtering if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      usage = usage.filter(entry => {
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      });
    }

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching ingredient usage:', error);
    return NextResponse.json({ error: 'Failed to fetch ingredient usage' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientId, quantity, unit, usageType, recipeId, notes, createdBy } = body;

    if (!ingredientId || quantity === undefined || !unit || !usageType || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const usageEntry = {
      ingredientId,
      quantity,
      unit,
      date: Timestamp.now(),
      usageType,
      recipeId: recipeId || null,
      notes: notes || null,
      createdBy,
    };

    const docRef = await addDoc(collection(db, 'ingredientUsage'), usageEntry);

    return NextResponse.json({
      id: docRef.id,
      ...usageEntry,
      date: usageEntry.date.toDate(),
    });
  } catch (error) {
    console.error('Error creating usage entry:', error);
    return NextResponse.json({ error: 'Failed to create usage entry' }, { status: 500 });
  }
}