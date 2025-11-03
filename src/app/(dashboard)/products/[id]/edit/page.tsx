'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Product } from '@/types/product';
import { ProductForm } from '@/components/products/ProductForm';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatErrorMessage } from '@/lib/error-handler';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productId = params.id as string;

  // Load product
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
          throw new Error('Produto não encontrado');
        }

        const result = await response.json();
        setProduct(result.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  const handleSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar produto');
      }

      toast.success('Produto atualizado com sucesso!', {
        description: `As alterações em "${data.name}" foram salvas`
      });

      router.push(`/products`);
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      toast.error('Erro ao atualizar produto', {
        description: errorMessage
      });
      console.error('Error updating product:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando produto...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Produto não encontrado'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/products" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Produtos
        </Link>
        <h1 className="text-3xl font-bold">Editar Produto</h1>
        <p className="text-muted-foreground">Atualize as informações de {product.name}</p>
      </div>

      <ProductForm
        product={product}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    </div>
  );
}
