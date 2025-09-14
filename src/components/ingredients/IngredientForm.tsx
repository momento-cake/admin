'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ingredientValidation, type IngredientFormData } from '@/lib/validators/ingredient';
import { IngredientUnit, IngredientCategory, Ingredient, Supplier } from '@/types/ingredient';
import { fetchSuppliers } from '@/lib/suppliers';
import { getUnitDisplayName } from '@/lib/ingredients';
import { Loader2, Plus } from 'lucide-react';

interface IngredientFormProps {
  ingredient?: Ingredient;
  onSubmit: (data: IngredientFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const commonAllergens = [
  'Glúten',
  'Leite',
  'Ovos',
  'Castanhas',
  'Amendoim',
  'Soja',
  'Gergelim',
  'Sulfitos',
  'Peixe',
  'Crustáceos'
];

export function IngredientForm({
  ingredient,
  onSubmit,
  onCancel,
  isSubmitting = false
}: IngredientFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    ingredient?.allergens || []
  );

  // Helper functions for price formatting
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
  
  // Price input state in cents for calculator-style behavior
  const [priceCents, setPriceCents] = useState<number>(() => 
    ingredient?.currentPrice ? decimalToCents(ingredient.currentPrice) : 0
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
    const key = e.target.value.slice(-1); // Get the last typed character
    const currentValue = e.target.value;
    
    // Handle backspace/delete (when input is shorter than display)
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
      
      // Limit to reasonable maximum (999999.99 = 99999999 cents)
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

  const form = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientValidation),
    defaultValues: {
      name: ingredient?.name || '',
      description: ingredient?.description || undefined,
      unit: ingredient?.unit || IngredientUnit.KILOGRAM,
      measurementValue: ingredient?.measurementValue || 1,
      brand: ingredient?.brand || '',
      currentPrice: ingredient?.currentPrice || 0,
      supplierId: ingredient?.supplierId || "",
      minStock: ingredient?.minStock || 0,
      currentStock: ingredient?.currentStock || 0,
      category: ingredient?.category || IngredientCategory.OTHER,
      allergens: ingredient?.allergens || []
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

  useEffect(() => {
    form.setValue('allergens', selectedAllergens);
  }, [selectedAllergens, form]);

  // Sync price cents with form value when ingredient changes
  useEffect(() => {
    if (ingredient?.currentPrice !== undefined) {
      const cents = decimalToCents(ingredient.currentPrice);
      setPriceCents(cents);
    }
  }, [ingredient?.currentPrice]);

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    if (checked) {
      setSelectedAllergens(prev => [...prev, allergen]);
    } else {
      setSelectedAllergens(prev => prev.filter(a => a !== allergen));
    }
  };

  const getCategoryName = (category: IngredientCategory) => {
    const names = {
      [IngredientCategory.FLOUR]: 'Farinha',
      [IngredientCategory.SUGAR]: 'Açúcar',
      [IngredientCategory.DAIRY]: 'Laticínios',
      [IngredientCategory.EGGS]: 'Ovos',
      [IngredientCategory.FATS]: 'Gorduras',
      [IngredientCategory.LEAVENING]: 'Fermentos',
      [IngredientCategory.FLAVORING]: 'Aromas',
      [IngredientCategory.NUTS]: 'Castanhas',
      [IngredientCategory.FRUITS]: 'Frutas',
      [IngredientCategory.CHOCOLATE]: 'Chocolate',
      [IngredientCategory.SPICES]: 'Temperos',
      [IngredientCategory.PRESERVATIVES]: 'Conservantes',
      [IngredientCategory.OTHER]: 'Outros'
    };
    return names[category];
  };

  const handleSubmit = async (data: IngredientFormData) => {
    // Supplier is now required, so no need to handle "none" case
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
                    <FormLabel>Nome do Ingrediente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Açúcar cristal" {...field} />
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
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: União, Crystal, Nestlé" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(IngredientCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          {getCategoryName(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6">
              <h4 className="font-medium mb-3">Medidas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          disabled={!!ingredient} // Read-only in edit mode
                          value={field.value === 0 ? '' : formatInteger(field.value)}
                          onChange={(e) => {
                            if (ingredient) return; // Prevent changes in edit mode
                            const rawValue = e.target.value;
                            
                            // If user clears the field completely
                            if (rawValue === '') {
                              field.onChange(0);
                              return;
                            }
                            
                            // Allow decimal numbers for measurements
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
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!ingredient}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(IngredientUnit).map((unit) => (
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
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição opcional do ingrediente"
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

        {!ingredient && (
          <Card>
            <CardHeader>
              <CardTitle>Preço Inicial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingSuppliers 
                              ? "Carregando fornecedores..." 
                              : "Selecione um fornecedor"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                          // Handle Escape or Delete key to clear
                          if (e.key === 'Escape' || (e.key === 'Delete' && e.ctrlKey)) {
                            e.preventDefault();
                            handlePriceClear(field);
                          }
                          // Only allow numeric keys and navigation/editing keys
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

              <p className="text-xs text-muted-foreground">
                O fornecedor e preço inicial serão usados para criar o primeiro registro no histórico de preços. 
                Para adicionar novos preços, use a funcionalidade de compras após criar o ingrediente.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Inicial (Unidades) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="0"
                        value={field.value === 0 ? '' : formatInteger(field.value)}
                        onChange={(e) => {
                          const rawValue = e.target.value;
                          
                          // If user clears the field completely
                          if (rawValue === '') {
                            field.onChange(0);
                            return;
                          }
                          
                          // Allow only numbers
                          const cleanValue = rawValue.replace(/\D/g, '');
                          field.onChange(parseBrazilianInteger(cleanValue));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Número de pacotes/unidades em estoque
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
                          
                          // If user clears the field completely
                          if (rawValue === '') {
                            field.onChange(0);
                            return;
                          }
                          
                          // Allow only numbers
                          const cleanValue = rawValue.replace(/\D/g, '');
                          field.onChange(parseBrazilianInteger(cleanValue));
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Número mínimo de unidades antes de reordenar
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Alérgenos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {commonAllergens.map((allergen) => (
                <div key={allergen} className="flex items-center space-x-2">
                  <Checkbox
                    id={allergen}
                    checked={selectedAllergens.includes(allergen)}
                    onCheckedChange={(checked) => 
                      handleAllergenChange(allergen, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={allergen}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {allergen}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ingredient ? 'Atualizar' : 'Criar'} Ingrediente
          </Button>
        </div>
      </form>
    </Form>
  );
}