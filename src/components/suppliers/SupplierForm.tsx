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
import { validatePhone, validateCPFOrCNPJ, validateCEP, formatCPFOrCNPJ, formatCEP, getCategoryLabel } from '@/lib/suppliers';

const supplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  contactPerson: z.string().optional(),
  phone: z.string().optional().refine((phone) => {
    return !phone || validatePhone(phone);
  }, 'Telefone deve ter 10 ou 11 dígitos'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  // Brazilian address fields
  cep: z.string().optional().refine((cep) => {
    return !cep || validateCEP(cep);
  }, 'CEP deve ter 8 dígitos'),
  estado: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  // Legacy address field
  address: z.string().optional(),
  // Brazilian business fields
  cpfCnpj: z.string().optional().refine((doc) => {
    return !doc || validateCPFOrCNPJ(doc);
  }, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'),
  inscricaoEstadual: z.string().optional(),
  // Existing fields
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
      // Brazilian address fields
      cep: initialData?.cep || '',
      estado: initialData?.estado || '',
      cidade: initialData?.cidade || '',
      bairro: initialData?.bairro || '',
      endereco: initialData?.endereco || '',
      numero: initialData?.numero || '',
      complemento: initialData?.complemento || '',
      // Legacy address field
      address: initialData?.address || '',
      // Brazilian business fields
      cpfCnpj: initialData?.cpfCnpj || '',
      inscricaoEstadual: initialData?.inscricaoEstadual || '',
      // Existing fields
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="name">Nome do Fornecedor *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ex: Distribuidora ABC"
                className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
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
                className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Ex: contato@fornecedor.com"
                className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Brazilian Business Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Documentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                <Input
                  id="cpfCnpj"
                  {...register('cpfCnpj')}
                  placeholder="Ex: 123.456.789-00 ou 12.345.678/0001-00"
                  className={errors.cpfCnpj ? 'border-red-500 focus:border-red-500' : ''}
                  onChange={(e) => {
                    const formatted = formatCPFOrCNPJ(e.target.value);
                    setValue('cpfCnpj', formatted);
                  }}
                />
                {errors.cpfCnpj && (
                  <p className="text-sm text-red-600">{errors.cpfCnpj.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                <Input
                  id="inscricaoEstadual"
                  {...register('inscricaoEstadual')}
                  placeholder="Ex: 123.456.789.123"
                />
                {errors.inscricaoEstadual && (
                  <p className="text-sm text-red-600">{errors.inscricaoEstadual.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Brazilian Address Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  {...register('cep')}
                  placeholder="12345-678"
                  className={errors.cep ? 'border-red-500 focus:border-red-500' : ''}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    setValue('cep', formatted);
                  }}
                />
                {errors.cep && (
                  <p className="text-sm text-red-600">{errors.cep.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  {...register('estado')}
                  placeholder="Ex: SP"
                />
                {errors.estado && (
                  <p className="text-sm text-red-600">{errors.estado.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  {...register('cidade')}
                  placeholder="Ex: São Paulo"
                />
                {errors.cidade && (
                  <p className="text-sm text-red-600">{errors.cidade.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  {...register('bairro')}
                  placeholder="Ex: Centro"
                />
                {errors.bairro && (
                  <p className="text-sm text-red-600">{errors.bairro.message}</p>
                )}
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="endereco">Logradouro</Label>
                <Input
                  id="endereco"
                  {...register('endereco')}
                  placeholder="Ex: Rua das Flores"
                />
                {errors.endereco && (
                  <p className="text-sm text-red-600">{errors.endereco.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  {...register('numero')}
                  placeholder="Ex: 123"
                />
                {errors.numero && (
                  <p className="text-sm text-red-600">{errors.numero.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  {...register('complemento')}
                  placeholder="Ex: Apto 45, Bloco B"
                />
                {errors.complemento && (
                  <p className="text-sm text-red-600">{errors.complemento.message}</p>
                )}
              </div>
            </div>

            {/* Legacy Address Field (for backward compatibility) */}
            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo (Opcional)</Label>
              <Textarea
                id="address"
                {...register('address')}
                placeholder="Endereço completo em formato livre"
                rows={2}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use este campo se preferir inserir o endereço em formato livre ao invés dos campos estruturados acima.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Avaliação *</Label>
            {renderStarRating()}
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating.message}</p>
            )}
          </div>

          <div className={`space-y-4 p-4 rounded-md ${errors.categories ? 'border-2 border-red-500 bg-red-50' : 'border border-gray-200 bg-gray-50'}`}>
            <Label>Categorias de Produtos *</Label>
            
            {/* Selected Categories */}
            {watchedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="default"
                    className="bg-primary hover:bg-secondary text-primary-foreground"
                  >
                    {getCategoryLabel(category)}
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
              className="bg-primary hover:bg-secondary text-primary-foreground"
            >
              {loading ? 'Salvando...' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}