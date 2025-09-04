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

  const form = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientValidation),
    defaultValues: {
      name: ingredient?.name || '',
      description: ingredient?.description || undefined,
      unit: ingredient?.unit || IngredientUnit.KILOGRAM,
      currentPrice: ingredient?.currentPrice || 0,
      supplierId: ingredient?.supplierId || undefined,
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
                      <Input placeholder="Ex: Farinha de trigo" {...field} />
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

        <Card>
          <CardHeader>
            <CardTitle>Preço e Unidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Atual (R$) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
          </CardContent>
        </Card>

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
                    <FormLabel>Estoque Atual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
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
                      <SelectItem value="">Nenhum fornecedor</SelectItem>
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