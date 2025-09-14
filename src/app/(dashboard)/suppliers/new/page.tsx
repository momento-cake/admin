'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { createSupplier } from '@/lib/suppliers';
import { CreateSupplierData } from '@/types/ingredient';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateSupplierData) => {
    try {
      setLoading(true);
      await createSupplier(data);
      router.push('/suppliers');
      router.refresh();
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Novo Fornecedor</h1>
          <p className="text-muted-foreground">Adicione um novo fornecedor ao sistema</p>
        </div>
      </div>

      <div className="w-full max-w-none">
        <div className="mx-auto max-w-4xl">
          <SupplierForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Criar Fornecedor"
          />
        </div>
      </div>
    </div>
  );
}