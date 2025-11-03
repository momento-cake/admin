'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ProductSubcategory,
  CreateProductSubcategoryData,
  UpdateProductSubcategoryData
} from '@/types/product';

interface ProductSubcategoryFormProps {
  subcategory?: ProductSubcategory;
  parentCategoryId: string;
  parentCategoryName?: string;
  onSubmit: (data: CreateProductSubcategoryData | UpdateProductSubcategoryData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductSubcategoryForm({
  subcategory,
  parentCategoryId,
  parentCategoryName,
  onSubmit,
  onCancel,
  isLoading = false
}: ProductSubcategoryFormProps) {
  const [formData, setFormData] = useState({
    categoryId: parentCategoryId,
    name: subcategory?.name || '',
    code: subcategory?.code || '',
    description: subcategory?.description || '',
    displayOrder: subcategory?.displayOrder || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      categoryId: parentCategoryId
    }));
  }, [parentCategoryId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nome não pode ter mais de 100 caracteres';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (formData.code.length < 1) {
      newErrors.code = 'Código é obrigatório';
    } else if (formData.code.length > 10) {
      newErrors.code = 'Código não pode ter mais de 10 caracteres';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição não pode ter mais de 500 caracteres';
    }

    if (formData.displayOrder < 0) {
      newErrors.displayOrder = 'Ordem de exibição não pode ser negativa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = subcategory
        ? ({
            id: subcategory.id,
            categoryId: formData.categoryId,
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || undefined,
            displayOrder: formData.displayOrder
          } as UpdateProductSubcategoryData)
        : ({
            categoryId: formData.categoryId,
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || undefined,
            displayOrder: formData.displayOrder
          } as CreateProductSubcategoryData);

      await onSubmit(submitData);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar subcategoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Categoria Pai</Label>
        <div className="p-3 bg-muted rounded-md text-sm">
          {parentCategoryName || 'Carregando...'}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Chocolate"
          disabled={isDisabled}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código *</Label>
        <div className="text-sm text-muted-foreground mb-2">
          Usado para gerar SKU (ex: CHOC, VANILLA)
        </div>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
          placeholder="Ex: CHOC"
          disabled={isDisabled}
          maxLength={10}
          className={errors.code ? 'border-destructive' : ''}
        />
        {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição opcional da subcategoria"
          disabled={isDisabled}
          rows={3}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Ordem de Exibição</Label>
        <Input
          id="displayOrder"
          type="number"
          value={formData.displayOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
          min="0"
          disabled={isDisabled}
          className={errors.displayOrder ? 'border-destructive' : ''}
        />
        {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder}</p>}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isDisabled}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isDisabled}
          className="gap-2"
        >
          {isDisabled && <Loader2 className="h-4 w-4 animate-spin" />}
          {subcategory ? 'Atualizar Subcategoria' : 'Criar Subcategoria'}
        </Button>
      </div>
    </form>
  );
}
