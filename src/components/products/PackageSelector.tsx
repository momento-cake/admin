'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductPackageItem } from '@/types/product';
import { Packaging } from '@/types/packaging';
import { fetchPackaging } from '@/lib/packaging';
import { formatPrice } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatErrorMessage, logError } from '@/lib/error-handler';

interface PackageSelectorProps {
  isOpen: boolean;
  selectedPackages?: ProductPackageItem[];
  onSelect: (packages: ProductPackageItem[]) => void;
  onCancel: () => void;
}

export function PackageSelector({
  isOpen,
  selectedPackages = [],
  onSelect,
  onCancel
}: PackageSelectorProps) {
  const [packages, setPackages] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    new Set(selectedPackages.map(p => p.packagingId))
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    selectedPackages.reduce((acc, p) => ({ ...acc, [p.packagingId]: p.quantity }), {})
  );

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load packages on mount
  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoading(true);
        setError(null);
        const allPackages = await fetchPackaging();
        setPackages(allPackages);
      } catch (err) {
        const errorMessage = formatErrorMessage(err);
        setError(errorMessage);
        logError('PackageSelector.loadPackages', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadPackages();
    }
  }, [isOpen]);

  // Filter packages based on search
  const filteredPackages = useMemo(() => {
    if (!debouncedSearch) return packages;
    const query = debouncedSearch.toLowerCase();
    return packages.filter(pkg =>
      pkg.name.toLowerCase().includes(query) ||
      (pkg.category && pkg.category.toLowerCase().includes(query)) ||
      (pkg.brand && pkg.brand.toLowerCase().includes(query))
    );
  }, [packages, debouncedSearch]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    let total = 0;
    selectedPackageIds.forEach(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        const quantity = quantities[packageId] || 1;
        total += pkg.currentPrice * quantity;
      }
    });
    return total;
  }, [selectedPackageIds, quantities, packages]);

  // Handle package selection
  const handlePackageToggle = (packageId: string) => {
    const newSelectedIds = new Set(selectedPackageIds);
    if (newSelectedIds.has(packageId)) {
      newSelectedIds.delete(packageId);
      const newQuantities = { ...quantities };
      delete newQuantities[packageId];
      setQuantities(newQuantities);
    } else {
      newSelectedIds.add(packageId);
      setQuantities(prev => ({ ...prev, [packageId]: 1 }));
    }
    setSelectedPackageIds(newSelectedIds);
  };

  // Handle quantity change
  const handleQuantityChange = (packageId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 1 && numValue <= 999) {
      setQuantities(prev => ({ ...prev, [packageId]: numValue }));
    }
  };

  // Handle save
  const handleSave = () => {
    // Build product package items
    const productPackages: ProductPackageItem[] = Array.from(selectedPackageIds).map(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) throw new Error(`Package ${packageId} not found`);

      const quantity = quantities[packageId] || 1;
      const packageCost = pkg.currentPrice * quantity;

      return {
        id: `${packageId}-${Date.now()}`, // Generate unique ID
        packagingId: packageId,
        packagingName: pkg.name,
        quantity,
        packageCost
      };
    });

    onSelect(productPackages);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Embalagens</DialogTitle>
          <DialogDescription>
            Selecione as embalagens necessárias e especifique a quantidade para cada uma (opcional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <Input
            placeholder="Buscar embalagens por nome, marca ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />

          {/* Error State */}
          {error && !loading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando embalagens...</span>
            </div>
          )}

          {/* Packages List */}
          {!loading && filteredPackages.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPackages.map(pkg => (
                <Card key={pkg.id} className={selectedPackageIds.has(pkg.id) ? 'border-blue-500' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          id={`package-${pkg.id}`}
                          checked={selectedPackageIds.has(pkg.id)}
                          onCheckedChange={() => handlePackageToggle(pkg.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`package-${pkg.id}`} className="cursor-pointer">
                            <p className="font-medium">{pkg.name}</p>
                            {pkg.brand && (
                              <p className="text-sm text-muted-foreground">
                                Marca: {pkg.brand}
                              </p>
                            )}
                            {pkg.category && (
                              <p className="text-sm text-muted-foreground">
                                Categoria: {pkg.category}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Preço: {formatPrice(pkg.currentPrice)} / {pkg.measurementValue} {pkg.unit}
                            </p>
                          </Label>
                        </div>
                      </div>

                      {/* Quantity Input - Only show when selected */}
                      {selectedPackageIds.has(pkg.id) && (
                        <div className="flex flex-col gap-1 ml-4">
                          <Label htmlFor={`quantity-${pkg.id}`} className="text-xs font-medium">
                            Quantidade
                          </Label>
                          <Input
                            id={`quantity-${pkg.id}`}
                            type="number"
                            step="1"
                            min="1"
                            max="999"
                            value={quantities[pkg.id] || 1}
                            onChange={(e) => handleQuantityChange(pkg.id, e.target.value)}
                            className="w-20"
                          />
                          <div className="text-xs text-muted-foreground">
                            {formatPrice((quantities[pkg.id] || 1) * pkg.currentPrice)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPackages.length === 0 && packages.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma embalagem encontrada com o termo "{debouncedSearch}"
              </AlertDescription>
            </Alert>
          )}

          {/* No Packages State */}
          {!loading && packages.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma embalagem disponível. Crie uma embalagem primeiro.
              </AlertDescription>
            </Alert>
          )}

          {/* Cost Summary */}
          {selectedPackageIds.size > 0 && (
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-base">Custo Total de Embalagens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(totalCost)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {selectedPackageIds.size > 0 ? `Confirmar (${selectedPackageIds.size})` : 'Confirmar (Nenhuma)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
