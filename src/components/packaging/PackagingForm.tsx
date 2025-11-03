'use client';

import { useState, useEffect, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { packagingValidation, type PackagingFormData } from '@/lib/validators/packaging';
import { PackagingUnit, PackagingCategory, Packaging } from '@/types/packaging';
import { Supplier } from '@/types/ingredient';
import { fetchSuppliers } from '@/lib/suppliers';
import { Loader2, Plus } from 'lucide-react';
import { getUnitDisplayName, getCategoryDisplayName } from '@/lib/packaging';

interface PackagingFormProps {
  packaging?: Packaging;
  onSubmit: (data: PackagingFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PackagingForm({
  packaging,
  onSubmit,
  onCancel,
  isSubmitting = false
}: PackagingFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Helper functions for price formatting (calculator-style)
  const decimalToCents = (decimal: number): number => {
    return Math.round(decimal * 100);
  };

  const centsToDecimal = (cents: number): number => {
    return cents / 100;
  };

  const formatPriceDisplay = (cents: number): string => {
    if (cents === 0) return '0,00';
    const reais = Math.floor(cents / 100);
    const centavos = cents % 100;
    return `${reais},${centavos.toString().padStart(2, '0')}`;
  };

  // Price input state in cents
  const [priceCents, setPriceCents] = useState<number>(() =>
    packaging?.currentPrice ? decimalToCents(packaging.currentPrice) : 0
  );

  const formatInteger = (value: number | string): string => {
    if (value === '' || value === null || value === undefined) return '';
    if (value === 0) return '0';
    const numValue = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toString();
  };

  const parseBrazilianInteger = (value: string): number => {
    if (!value || value === '') return 0;
    const numValue = parseInt(value.replace(/\D/g, ''));
    return isNaN(numValue) ? 0 : numValue;
  };

  // Calculator-style price input handler
  const handlePriceInput = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const key = e.target.value.slice(-1);
    const currentValue = e.target.value;

    // Handle backspace/delete
    if (currentValue.length < formatPriceDisplay(priceCents).length) {
      const newCents = Math.floor(priceCents / 10);
      setPriceCents(newCents);
      field.onChange(centsToDecimal(newCents));
      return;
    }

    // Handle new digit input
    if (/^\d$/.test(key)) {
      const digit = parseInt(key);
      const newCents = (priceCents * 10) + digit;

      // Limit to reasonable maximum
      if (newCents <= 99999999) {
        setPriceCents(newCents);
        field.onChange(centsToDecimal(newCents));
      }
    }
  };

  const handlePriceClear = (field: any) => {
    setPriceCents(0);
    field.onChange(0);
  };

  const form = useForm<PackagingFormData>({
    resolver: zodResolver(packagingValidation),
    defaultValues: {
      name: packaging?.name || '',
      description: packaging?.description || undefined,
      unit: packaging?.unit || PackagingUnit.UNIT,
      measurementValue: packaging?.measurementValue || 1,
      brand: packaging?.brand || '',
      currentPrice: packaging?.currentPrice || 0,
      supplierId: packaging?.supplierId || '',
      minStock: packaging?.minStock || 0,
      currentStock: packaging?.currentStock || 0,
      category: packaging?.category || PackagingCategory.OTHER
    }
  });

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await fetchSuppliers();
        setSuppliers(response.suppliers || []);
      } catch (error) {
        console.error('Error loading suppliers:', error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  // Sync price cents with form value when packaging changes
  useEffect(() => {
    if (packaging?.currentPrice !== undefined) {
      const cents = decimalToCents(packaging.currentPrice);
      setPriceCents(cents);
    }
  }, [packaging?.currentPrice]);

  const handleSubmit = async (data: PackagingFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Embalagem *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Caixa nº 5 alta" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca/Fabricante</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Silver Plast" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição opcional da embalagem"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medidas e Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!packaging}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PackagingUnit).map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {getUnitDisplayName(unit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurementValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Medida *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="1"
                        disabled={!!packaging}
                        value={field.value === 0 ? '' : formatInteger(field.value)}
                        onChange={(e) => {
                          if (packaging) return;
                          const rawValue = e.target.value;

                          if (rawValue === '') {
                            field.onChange(0);
                            return;
                          }

                          const cleanValue = rawValue.replace(/[^\d,\.]/g, '').replace(',', '.');
                          const numValue = parseFloat(cleanValue);
                          if (!isNaN(numValue)) {
                            field.onChange(numValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(PackagingCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {getCategoryDisplayName(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preço e Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço por Unidade (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={formatPriceDisplay(priceCents)}
                        onChange={(e) => handlePriceInput(e, field)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' || (e.key === 'Delete' && e.ctrlKey)) {
                            e.preventDefault();
                            handlePriceClear(field);
                          }
                          if (!/[\d]/.test(e.key) &&
                            !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="w-full truncate">
                          <SelectValue placeholder={
                            loadingSuppliers
                              ? "Carregando fornecedores..."
                              : "Selecione um fornecedor"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="item-aligned" className="max-h-[200px]">
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controle de Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Atual (Unidades) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={field.value === 0 ? '' : formatInteger(field.value)}
                        onChange={(e) => {
                          const rawValue = e.target.value;

                          if (rawValue === '') {
                            field.onChange(0);
                            return;
                          }

                          const cleanValue = rawValue.replace(/\D/g, '');
                          field.onChange(parseBrazilianInteger(cleanValue));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Quantidade atual em estoque
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo (Unidades) *</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={field.value === 0 ? '' : formatInteger(field.value)}
                        onChange={(e) => {
                          const rawValue = e.target.value;

                          if (rawValue === '') {
                            field.onChange(0);
                            return;
                          }

                          const cleanValue = rawValue.replace(/\D/g, '');
                          field.onChange(parseBrazilianInteger(cleanValue));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Limite para alertar sobre reordenação
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {packaging ? 'Atualizar' : 'Criar'} Embalagem
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Memoize to prevent unnecessary re-renders when parent component updates
// but props haven't changed
export const MemoizedPackagingForm = memo(PackagingForm);
