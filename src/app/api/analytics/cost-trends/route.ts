import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CostTrend, Ingredient, PriceHistory } from '@/types/ingredient';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Get price history within the date range
    const priceHistoryQuery = query(
      collection(db, 'priceHistory'),
      where('date', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('date', '<=', Timestamp.fromDate(endOfDay(endDate))),
      orderBy('date', 'asc')
    );

    const priceHistorySnapshot = await getDocs(priceHistoryQuery);
    const priceHistory = priceHistorySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ingredientId: data.ingredientId,
        price: data.price,
        supplierId: data.supplierId,
        date: data.date.toDate(),
        changePercentage: data.changePercentage,
        notes: data.notes,
        createdBy: data.createdBy,
      } as PriceHistory;
    });

    // Get all ingredients for cost calculations
    const ingredientsQuery = query(collection(db, 'ingredients'));
    const ingredientsSnapshot = await getDocs(ingredientsQuery);
    const ingredients = ingredientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ingredient[];

    // Group price history by period
    const costTrends: CostTrend[] = [];
    const groupedData: { [key: string]: PriceHistory[] } = {};

    priceHistory.forEach(entry => {
      const periodKey = format(entry.date, period === 'daily' ? 'yyyy-MM-dd' : 
                                       period === 'weekly' ? 'yyyy-ww' : 'yyyy-MM');
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = [];
      }
      groupedData[periodKey].push(entry);
    });

    // Calculate cost trends for each period
    Object.entries(groupedData).forEach(([periodKey, entries]) => {
      const totalCost = entries.reduce((sum, entry) => sum + entry.price, 0);
      const averageCost = totalCost / entries.length;
      
      // Find top expensive ingredients for this period
      const ingredientCosts = entries.reduce((acc, entry) => {
        const ingredient = ingredients.find(i => i.id === entry.ingredientId);
        if (ingredient) {
          if (!acc[entry.ingredientId]) {
            acc[entry.ingredientId] = {
              ingredientId: entry.ingredientId,
              name: ingredient.name,
              cost: 0,
              count: 0,
            };
          }
          acc[entry.ingredientId].cost += entry.price;
          acc[entry.ingredientId].count++;
        }
        return acc;
      }, {} as Record<string, {
        ingredientId: string;
        name: string;
        cost: number;
        count: number;
      }>);

      const topExpensiveIngredients = Object.values(ingredientCosts)
        .map(item => ({
          ingredientId: item.ingredientId,
          name: item.name,
          cost: item.cost / item.count,
          percentage: ((item.cost / item.count) / totalCost) * 100,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      costTrends.push({
        period: new Date(periodKey),
        totalCost,
        averageCost,
        ingredientCount: entries.length,
        topExpensiveIngredients,
      });
    });

    // Sort by period
    costTrends.sort((a, b) => a.period.getTime() - b.period.getTime());

    return NextResponse.json({ costTrends });
  } catch (error) {
    console.error('Error fetching cost trends:', error);
    return NextResponse.json({ error: 'Failed to fetch cost trends' }, { status: 500 });
  }
}