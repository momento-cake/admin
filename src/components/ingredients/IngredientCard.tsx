import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StockLevelIndicator } from './StockLevelIndicator';
import { Ingredient } from '@/types/ingredient';
import { formatPrice, getUnitDisplayName } from '@/lib/ingredients';
import { MoreHorizontal, Edit, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit?: (ingredient: Ingredient) => void;
  onDelete?: (ingredient: Ingredient) => void;
  onView?: (ingredient: Ingredient) => void;
  className?: string;
}

export function IngredientCard({
  ingredient,
  onEdit,
  onDelete,
  onView,
  className
}: IngredientCardProps) {
  const handleCardClick = () => {
    if (onView) {
      onView(ingredient);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(ingredient);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(ingredient);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      flour: 'bg-amber-100 text-amber-800',
      sugar: 'bg-pink-100 text-pink-800',
      dairy: 'bg-blue-100 text-blue-800',
      eggs: 'bg-yellow-100 text-yellow-800',
      fats: 'bg-orange-100 text-orange-800',
      leavening: 'bg-green-100 text-green-800',
      flavoring: 'bg-purple-100 text-purple-800',
      nuts: 'bg-brown-100 text-brown-800',
      fruits: 'bg-red-100 text-red-800',
      chocolate: 'bg-amber-100 text-amber-800',
      spices: 'bg-emerald-100 text-emerald-800',
      preservatives: 'bg-gray-100 text-gray-800',
      other: 'bg-slate-100 text-slate-800'
    };
    
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryName = (category: string) => {
    const names = {
      flour: 'Farinha',
      sugar: 'Açúcar',
      dairy: 'Laticínios',
      eggs: 'Ovos',
      fats: 'Gorduras',
      leavening: 'Fermentos',
      flavoring: 'Aromas',
      nuts: 'Castanhas',
      fruits: 'Frutas',
      chocolate: 'Chocolate',
      spices: 'Temperos',
      preservatives: 'Conservantes',
      other: 'Outros'
    };
    
    return names[category as keyof typeof names] || category;
  };

  return (
    <Card 
      className={cn(
        'hover:shadow-md transition-shadow cursor-pointer group',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {ingredient.measurementValue} {getUnitDisplayName(ingredient.unit)} {ingredient.name}
                {ingredient.brand && <span className="text-muted-foreground"> - {ingredient.brand}</span>}
              </h3>
              {ingredient.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {ingredient.description}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price and Unit */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {formatPrice(ingredient.currentPrice)}
            </p>
            <p className="text-sm text-muted-foreground">
              por {getUnitDisplayName(ingredient.unit)}
            </p>
          </div>
          
          <Badge 
            variant="secondary" 
            className={getCategoryColor(ingredient.category)}
          >
            {getCategoryName(ingredient.category)}
          </Badge>
        </div>
        
        {/* Stock Level */}
        <StockLevelIndicator
          currentStock={ingredient.currentStock}
          minStock={ingredient.minStock}
          unit={ingredient.unit}
          showNumbers={true}
        />
        
        {/* Allergens */}
        {ingredient.allergens && ingredient.allergens.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Alérgenos:</p>
            <div className="flex flex-wrap gap-1">
              {ingredient.allergens.slice(0, 3).map((allergen) => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
              {ingredient.allergens.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{ingredient.allergens.length - 3} mais
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Last Updated */}
        <div className="text-xs text-muted-foreground">
          Atualizado em {new Date(ingredient.lastUpdated).toLocaleDateString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for lists
export function IngredientCardCompact({
  ingredient,
  onEdit,
  onDelete,
  onView,
  className
}: IngredientCardProps) {
  return (
    <Card 
      className={cn(
        'hover:shadow-sm transition-shadow cursor-pointer group',
        className
      )}
      onClick={() => onView?.(ingredient)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-1.5 bg-primary/10 rounded">
              <Package className="h-3 w-3 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">
                {ingredient.measurementValue} {getUnitDisplayName(ingredient.unit)} {ingredient.name}
                {ingredient.brand && <span className="text-muted-foreground"> - {ingredient.brand}</span>}
              </h4>
              <p className="text-xs text-muted-foreground">
                {formatPrice(ingredient.currentPrice)} / {getUnitDisplayName(ingredient.unit)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <StockLevelIndicator
              currentStock={ingredient.currentStock}
              minStock={ingredient.minStock}
              unit={ingredient.unit}
              showNumbers={false}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(ingredient);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(ingredient);
                  }} 
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}