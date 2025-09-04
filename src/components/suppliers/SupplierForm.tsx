'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateSupplierData, IngredientCategory } from '@/types/ingredient';
import { validatePhone } from '@/lib/suppliers';

const supplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  contactPerson: z.string().optional(),
  phone: z.string().optional().refine((phone) => {
    return !phone || validatePhone(phone);
  }, 'Telefone deve ter 10 ou 11 dígitos'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  rating: z.number().min(1, 'Avaliação deve ser entre 1 e 5').max(5, 'Avaliação deve ser entre 1 e 5'),
  categories: z.array(z.string()).min(1, 'Selecione pelo menos uma categoria')
});

interface SupplierFormProps {
  initialData?: Partial<CreateSupplierData>;
  onSubmit: (data: CreateSupplierData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

const availableCategories = Object.values(IngredientCategory).map(category => ({
  value: category,
  label: getCategoryLabel(category)
}));

function getCategoryLabel(category: IngredientCategory): string {
  const labels = {
    [IngredientCategory.FLOUR]: 'Farinhas',
    [IngredientCategory.SUGAR]: 'Açúcares',
    [IngredientCategory.DAIRY]: 'Laticínios',
    [IngredientCategory.EGGS]: 'Ovos',
    [IngredientCategory.FATS]: 'Gorduras',
    [IngredientCategory.LEAVENING]: 'Fermentos',
    [IngredientCategory.FLAVORING]: 'Aromatizantes',
    [IngredientCategory.NUTS]: 'Castanhas e Nozes',
    [IngredientCategory.FRUITS]: 'Frutas',
    [IngredientCategory.CHOCOLATE]: 'Chocolate',
    [IngredientCategory.SPICES]: 'Temperos',
    [IngredientCategory.PRESERVATIVES]: 'Conservantes',
    [IngredientCategory.OTHER]: 'Outros'
  };
  return labels[category] || category;
}

export function SupplierForm({
  initialData,
  onSubmit,
  loading = false,
  submitLabel = 'Salvar Fornecedor'
}: SupplierFormProps) {
  const [customCategory, setCustomCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError: setFormError
  } = useForm<CreateSupplierData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: initialData?.name || '',
      contactPerson: initialData?.contactPerson || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      rating: initialData?.rating || 3,
      categories: initialData?.categories || []
    }
  });

  const watchedCategories = watch('categories');
  const watchedRating = watch('rating');

  const handleFormSubmit = async (data: CreateSupplierData) => {
    try {
      setError(null);
      await onSubmit(data);
    } catch (error: any) {
      setError(error.message || 'Erro ao salvar fornecedor');
    }
  };

  const addCategory = (category: string) => {
    if (!watchedCategories.includes(category)) {
      setValue('categories', [...watchedCategories, category]);
    }
  };

  const removeCategory = (category: string) => {
    setValue('categories', watchedCategories.filter(c => c !== category));
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !watchedCategories.includes(customCategory.trim())) {
      setValue('categories', [...watchedCategories, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setValue('rating', star)}
            className={`p-1 rounded transition-colors ${
              star <= watchedRating
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star className="h-5 w-5 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {watchedRating}/5
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Fornecedor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fornecedor *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: Distribuidora ABC"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">Pessoa de Contato</Label>
              <Input
                id="contactPerson"
                {...register('contactPerson')}
                placeholder="Ex: João Silva"
              />
              {errors.contactPerson && (
                <p className="text-sm text-red-600">{errors.contactPerson.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Ex: (11) 99999-9999"
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Ex: contato@fornecedor.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Endereço completo do fornecedor"
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Avaliação *</Label>
            {renderStarRating()}
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label>Categorias de Produtos *</Label>
            
            {/* Selected Categories */}
            {watchedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="default"
                    className="bg-momento-primary hover:bg-momento-secondary text-white"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => removeCategory(category)}
                      className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Available Categories */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Categorias Disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                {availableCategories
                  .filter(cat => !watchedCategories.includes(cat.value))
                  .map((category) => (
                    <Button
                      key={category.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCategory(category.value)}
                      className="h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {category.label}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Custom Category */}
            <div className="flex gap-2">
              <Input
                placeholder="Categoria personalizada"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomCategory();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomCategory}
                disabled={!customCategory.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {errors.categories && (
              <p className="text-sm text-red-600">{errors.categories.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-momento-primary hover:bg-momento-secondary text-white"
            >
              {loading ? 'Salvando...' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}