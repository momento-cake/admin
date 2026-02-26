'use client';

import { Badge } from '@/components/ui/badge';
import { StockStatus } from '@/types/packaging';
import { cn } from '@/lib/utils';

interface StockLevelIndicatorProps {
  currentStock: number;
  minStock: number;
  status?: StockStatus;
  showNumbers?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<StockStatus, string> = {
  good: 'bg-success/10 text-success border-success/30',
  low: 'bg-warning/10 text-warning border-warning/30',
  critical: 'bg-warning/20 text-warning border-warning/50',
  out: 'bg-destructive/10 text-destructive border-destructive/30'
};

const STATUS_LABELS: Record<StockStatus, string> = {
  good: 'Bom',
  low: 'Baixo',
  critical: 'Crítico',
  out: 'Sem Estoque'
};

const STATUS_DOTS: Record<StockStatus, string> = {
  good: 'bg-success',
  low: 'bg-warning',
  critical: 'bg-warning',
  out: 'bg-destructive'
};

function getStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock === 0) return 'out';
  if (currentStock < minStock) {
    const percentage = minStock > 0 ? (currentStock / minStock) * 100 : 0;
    return percentage < 50 ? 'critical' : 'low';
  }
  return 'good';
}

export function StockLevelIndicator({
  currentStock,
  minStock,
  status,
  showNumbers = true,
  className
}: StockLevelIndicatorProps) {
  const stockStatus = status || getStockStatus(currentStock, minStock);
  const statusLabel = STATUS_LABELS[stockStatus];
  const colorClass = STATUS_COLORS[stockStatus];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className={cn('border text-xs font-medium', colorClass)}>
        {statusLabel}
      </Badge>

      {showNumbers && (
        <span className="text-xs text-muted-foreground">
          {currentStock}/{minStock}
        </span>
      )}
    </div>
  );
}

// Compact dot indicator for tables/lists
export function StockStatusDot({
  currentStock,
  minStock,
  title
}: {
  currentStock: number;
  minStock: number;
  title?: string;
}) {
  const status = getStockStatus(currentStock, minStock);
  const dotColor = STATUS_DOTS[status];
  const label = STATUS_LABELS[status];

  return (
    <div
      className={cn('w-3 h-3 rounded-full', dotColor)}
      title={title || label}
    />
  );
}

// Progress bar version
export function StockLevelProgress({
  currentStock,
  minStock,
  className
}: {
  currentStock: number;
  minStock: number;
  className?: string;
}) {
  const status = getStockStatus(currentStock, minStock);
  const percentage = minStock > 0 ? Math.min((currentStock / minStock) * 100, 100) : 0;
  const colorClass = STATUS_COLORS[status];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{STATUS_LABELS[status]}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            status === 'good' && 'bg-success',
            status === 'low' && 'bg-warning',
            status === 'critical' && 'bg-warning',
            status === 'out' && 'bg-destructive'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
