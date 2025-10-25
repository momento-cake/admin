'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SupplierForm } from './SupplierForm';
import { CreateSupplierData, Supplier } from '@/types/ingredient';
import { createSupplier } from '@/lib/suppliers';

interface SupplierCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}

export function SupplierCreateModal({
  open,
  onOpenChange,
  onSupplierCreated
}: SupplierCreateModalProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (data: CreateSupplierData) => {
    try {
      setIsCreating(true);
      const newSupplier = await createSupplier(data);
      onSupplierCreated(newSupplier);
      onOpenChange(false);
    } catch (error) {
      // Error is already handled by the SupplierForm component
      console.error('Error creating supplier:', error);
      throw error; // Re-throw to let SupplierForm handle the error display
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
        <DialogHeader>
          <DialogTitle>Adicionar Novo Fornecedor</DialogTitle>
        </DialogHeader>
        <SupplierForm
          onSubmit={handleSubmit}
          loading={isCreating}
          submitLabel="Criar Fornecedor"
        />
      </DialogContent>
    </Dialog>
  );
}