import { Badge } from '@/components/ui/badge';
import { 
  getStockStatus, 
  getStockStatusColor, 
  getStockStatusText,
  formatStock
} from '@/lib/ingredients';
import { IngredientUnit, StockStatus } from '@/types/ingredient';
import { cn } from '@/lib/utils';

interface StockLevelIndicatorProps {
  currentStock: number;
  minStock: number;
  unit: IngredientUnit;
  className?: string;
  showNumbers?: boolean;
}

export function StockLevelIndicator({
  currentStock,
  minStock,
  unit,
  className,
  showNumbers = true
}: StockLevelIndicatorProps) {
  const status = getStockStatus(currentStock, minStock);
  const statusText = getStockStatusText(status);
  const colorClasses = getStockStatusColor(status);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn(
          'border text-xs font-medium',
          colorClasses
        )}
      >
        {statusText}
      </Badge>
      
      {showNumbers && (
        <span className="text-sm text-muted-foreground">
          {formatStock(currentStock, unit)}
          {minStock > 0 && (
            <span className="text-xs">
              {' '}(mín: {formatStock(minStock, unit)})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Simplified version for compact displays
export function StockLevelDot({
  currentStock,
  minStock,
  className
}: {
  currentStock: number;
  minStock: number;
  className?: string;
}) {
  const status = getStockStatus(currentStock, minStock);
  
  const dotColors = {
    good: 'bg-green-500',
    low: 'bg-yellow-500',
    critical: 'bg-red-500',
    out: 'bg-gray-400'
  };
  
  return (
    <div 
      className={cn(
        'w-2 h-2 rounded-full',
        dotColors[status],
        className
      )}
      title={getStockStatusText(status)}
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
  
  const progressColors = {
    good: 'bg-green-500',
    low: 'bg-yellow-500',
    critical: 'bg-red-500',
    out: 'bg-gray-400'
  };
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{getStockStatusText(status)}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            progressColors[status]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}