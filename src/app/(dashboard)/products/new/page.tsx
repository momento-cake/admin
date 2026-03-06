'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProductForm } from '@/components/products/ProductForm';
import { createProduct } from '@/lib/products';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatErrorMessage } from '@/lib/error-handler';

export default function CreateProductPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      if (!user?.uid) {
        throw new Error('Usuário não autenticado');
      }

      await createProduct(data, user.uid);

      toast.success('Produto criado com sucesso!', {
        description: `O produto "${data.name}" foi adicionado ao catálogo`
      });

      router.push(`/products`);
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      toast.error('Erro ao criar produto', {
        description: errorMessage
      });
      console.error('Error creating product:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Novo Produto</h1>
        <p className="text-muted-foreground">Crie um novo produto no catálogo</p>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
