import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ConsumptionPattern, UsageHeatmap, IngredientUsage, Ingredient } from '@/types/ingredient';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const ingredientId = searchParams.get('ingredientId');
    const type = searchParams.get('type') || 'patterns'; // patterns, heatmap

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Build query
    let usageQuery = query(
      collection(db, 'ingredientUsage'),
      where('date', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('date', '<=', Timestamp.fromDate(endOfDay(endDate))),
      orderBy('date', 'asc')
    );

    if (ingredientId) {
      usageQuery = query(usageQuery, where('ingredientId', '==', ingredientId));
    }

    const usageSnapshot = await getDocs(usageQuery);
    const usage = usageSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    })) as IngredientUsage[];

    // Get ingredients data
    const ingredientsQuery = query(collection(db, 'ingredients'));
    const ingredientsSnapshot = await getDocs(ingredientsQuery);
    const ingredients = ingredientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ingredient[];

    if (type === 'heatmap') {
      // Generate usage heatmap
      const heatmaps: UsageHeatmap[] = [];
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      const ingredientIds = ingredientId ? [ingredientId] : [...new Set(usage.map(u => u.ingredientId))];
      
      ingredientIds.forEach(id => {
        const ingredient = ingredients.find(i => i.id === id);
        if (!ingredient) return;

        const dailyUsage = dateRange.map(date => {
          const dayUsage = usage.filter(u => 
            u.ingredientId === id && 
            format(u.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          );

          const totalUsage = dayUsage.reduce((sum, u) => sum + u.quantity, 0);
          return {
            date,
            usage: totalUsage,
            intensity: Math.min(totalUsage / 100, 1), // Normalize to 0-1 scale
          };
        });

        heatmaps.push({
          ingredientId: id,
          ingredientName: ingredient.name,
          dailyUsage,
        });
      });

      return NextResponse.json({ heatmaps });
    }

    // Generate consumption patterns
    const patterns: ConsumptionPattern[] = [];
    const ingredientIds = ingredientId ? [ingredientId] : [...new Set(usage.map(u => u.ingredientId))];

    ingredientIds.forEach(id => {
      const ingredientUsage = usage.filter(u => u.ingredientId === id);
      if (ingredientUsage.length === 0) return;

      // Calculate daily usage
      const dailyUsage: { [key: string]: number } = {};
      ingredientUsage.forEach(u => {
        const day = format(u.date, 'yyyy-MM-dd');
        dailyUsage[day] = (dailyUsage[day] || 0) + u.quantity;
      });

      const usageValues = Object.values(dailyUsage);
      const averageUsage = usageValues.reduce((sum, val) => sum + val, 0) / usageValues.length;
      const peakUsage = Math.max(...usageValues);
      const lowUsage = Math.min(...usageValues);

      // Simple trend calculation (compare first half vs second half)
      const midPoint = Math.floor(usageValues.length / 2);
      const firstHalfAvg = usageValues.slice(0, midPoint).reduce((sum, val) => sum + val, 0) / midPoint;
      const secondHalfAvg = usageValues.slice(midPoint).reduce((sum, val) => sum + val, 0) / (usageValues.length - midPoint);
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const changePercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      if (changePercentage > 10) {
        trend = 'increasing';
      } else if (changePercentage < -10) {
        trend = 'decreasing';
      }

      // Check for seasonal patterns (simplified - check for variance)
      const variance = usageValues.reduce((sum, val) => sum + Math.pow(val - averageUsage, 2), 0) / usageValues.length;
      const standardDeviation = Math.sqrt(variance);
      const seasonalPattern = standardDeviation > (averageUsage * 0.3); // High variance suggests seasonality

      patterns.push({
        ingredientId: id,
        period: 'daily',
        averageUsage,
        peakUsage,
        lowUsage,
        trend,
        seasonalPattern,
      });
    });

    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('Error fetching usage patterns:', error);
    return NextResponse.json({ error: 'Failed to fetch usage patterns' }, { status: 500 });
  }
}