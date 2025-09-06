'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { createIngredient } from '@/lib/ingredients';
import { IngredientFormData } from '@/lib/validators/ingredient';
import { ArrowLeft } from 'lucide-react';

export default function NewIngredientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: IngredientFormData) => {
    try {
      setIsSubmitting(true);
      const newIngredient = await createIngredient(data);
      console.log(`Ingrediente criado: ${newIngredient.name}`);
      router.push(`/ingredients/${newIngredient.id}`);
    } catch (error) {
      console.error('Erro ao criar ingrediente:', error);
      alert('Erro ao criar ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/ingredients');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/ingredients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Novo Ingrediente</h1>
          <p className="text-muted-foreground">
            Adicione um novo ingrediente ao seu catálogo
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <IngredientForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}