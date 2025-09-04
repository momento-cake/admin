import { PriceHistory } from '@/types/ingredient';

export async function fetchPriceHistory(
  ingredientId: string,
  limit?: number,
  fromDate?: Date,
  toDate?: Date
): Promise<{ priceHistory: PriceHistory[] }> {
  const params = new URLSearchParams();
  params.set('ingredientId', ingredientId);
  
  if (limit) params.set('limit', limit.toString());
  if (fromDate) params.set('from', fromDate.toISOString());
  if (toDate) params.set('to', toDate.toISOString());

  const response = await fetch(`/api/ingredients/price-history?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch price history');
  }

  const data = await response.json();
  return {
    priceHistory: data.priceHistory.map((entry: { date: string; [key: string]: unknown }) => ({
      ...entry,
      date: new Date(entry.date),
    })),
  };
}

export async function addPriceEntry(
  ingredientId: string,
  price: number,
  supplierId?: string,
  notes?: string,
  createdBy: string = 'system'
): Promise<PriceHistory> {
  const response = await fetch('/api/ingredients/price-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredientId,
      price,
      supplierId,
      notes,
      createdBy,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add price entry');
  }

  const data = await response.json();
  return {
    ...data,
    date: new Date(data.date),
  };
}

export function calculatePriceChange(current: number, previous: number): {
  change: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  const change = current - previous;
  const percentage = (change / previous) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentage) > 1) { // Consider changes > 1% as significant
    trend = percentage > 0 ? 'up' : 'down';
  }

  return { change, percentage, trend };
}

export function getAveragePrice(priceHistory: PriceHistory[], days: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentPrices = priceHistory.filter(entry => entry.date >= cutoffDate);
  
  if (recentPrices.length === 0) return 0;
  
  return recentPrices.reduce((sum, entry) => sum + entry.price, 0) / recentPrices.length;
}

export function detectPriceAlerts(
  priceHistory: PriceHistory[],
  threshold: number = 20
): Array<{ type: 'increase' | 'decrease'; percentage: number; current: number; previous: number }> {
  if (priceHistory.length < 2) return [];

  const alerts = [];
  const latest = priceHistory[0];
  const previous = priceHistory[1];

  if (latest.changePercentage && Math.abs(latest.changePercentage) > threshold) {
    alerts.push({
      type: latest.changePercentage > 0 ? 'increase' as const : 'decrease' as const,
      percentage: latest.changePercentage,
      current: latest.price,
      previous: previous.price,
    });
  }

  return alerts;
}

export function generatePriceTrendData(priceHistory: PriceHistory[], days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return priceHistory
    .filter(entry => entry.date >= cutoffDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(entry => ({
      date: entry.date.toLocaleDateString(),
      price: entry.price,
      change: entry.changePercentage || 0,
    }));
}