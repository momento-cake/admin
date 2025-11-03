'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Product } from '@/types/product';
import { ProductList } from '@/components/products/ProductList';
import { formatErrorMessage } from '@/lib/error-handler';

export default function ProductsPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProductCreate = () => {
    router.push('/products/new');
  };

  const handleProductEdit = (product: Product) => {
    router.push(`/products/${product.id}/edit`);
  };

  const handleProductDelete = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      toast.success('Produto excluído com sucesso!', {
        description: `O produto "${product.name}" foi removido do catálogo`
      });

      // Refresh the list
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      const errorMessage = formatErrorMessage(error);
      toast.error('Erro ao excluir produto', {
        description: errorMessage
      });
      console.error('Error deleting product:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Produtos</h1>
        <p className="text-muted-foreground">Gerencie o catálogo de produtos finalizados</p>
      </div>

      <ProductList
        key={refreshKey}
        onProductCreate={handleProductCreate}
        onProductEdit={handleProductEdit}
        onProductDelete={handleProductDelete}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
