import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PriceHistory } from '@/types/ingredient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ingredientId = searchParams.get('ingredientId');
    const limitParam = searchParams.get('limit');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!ingredientId) {
      return NextResponse.json({ error: 'Ingredient ID is required' }, { status: 400 });
    }

    let q = query(
      collection(db, 'priceHistory'),
      where('ingredientId', '==', ingredientId),
      orderBy('date', 'desc')
    );

    if (limitParam) {
      q = query(q, limit(parseInt(limitParam)));
    }

    // Note: Firestore doesn't support range queries with orderBy on different fields
    // We'll filter dates in memory if needed
    const querySnapshot = await getDocs(q);
    let priceHistory: PriceHistory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    })) as PriceHistory[];

    // Apply date filtering if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      
      priceHistory = priceHistory.filter(entry => {
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      });
    }

    return NextResponse.json({ priceHistory });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientId, price, supplierId, notes, createdBy } = body;

    if (!ingredientId || price === undefined || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the latest price for percentage calculation
    const latestPriceQuery = query(
      collection(db, 'priceHistory'),
      where('ingredientId', '==', ingredientId),
      orderBy('date', 'desc'),
      limit(1)
    );

    const latestSnapshot = await getDocs(latestPriceQuery);
    let changePercentage = undefined;

    if (!latestSnapshot.empty) {
      const latestPrice = latestSnapshot.docs[0].data().price;
      changePercentage = ((price - latestPrice) / latestPrice) * 100;
    }

    const priceHistoryEntry = {
      ingredientId,
      price,
      supplierId: supplierId || null,
      date: Timestamp.now(),
      changePercentage,
      notes: notes || null,
      createdBy,
    };

    const docRef = await addDoc(collection(db, 'priceHistory'), priceHistoryEntry);

    return NextResponse.json({
      id: docRef.id,
      ...priceHistoryEntry,
      date: priceHistoryEntry.date.toDate(),
    });
  } catch (error) {
    console.error('Error creating price history entry:', error);
    return NextResponse.json({ error: 'Failed to create price history entry' }, { status: 500 });
  }
}