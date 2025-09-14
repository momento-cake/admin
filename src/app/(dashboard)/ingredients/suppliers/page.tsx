'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierList } from '@/components/suppliers/SupplierList';
import { SupplierDetailModal } from '@/components/suppliers/SupplierDetailModal';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchSuppliers, createSupplier } from '@/lib/suppliers';
import { Supplier } from '@/types/ingredient';
import { useDebounce } from '@/hooks/useDebounce';

export default function IngredientsSuppliers() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadSuppliers();
  }, [debouncedSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await fetchSuppliers({ searchQuery: debouncedSearchQuery });
      setSuppliers(data.suppliers || []);
      setError(null);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setError(error instanceof Error ? error.message : 'Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierDeleted = (deletedId: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== deletedId));
  };

  const handleSupplierUpdated = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => 
      s.id === updatedSupplier.id ? updatedSupplier : s
    ));
    setSelectedSupplier(updatedSupplier);
  };

  const handleSupplierCreated = (newSupplier: Supplier) => {
    setSuppliers(prev => [...prev, newSupplier]);
    setShowCreateModal(false);
  };

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fornecedores de Ingredientes</h1>
          <p className="text-muted-foreground">Gerencie fornecedores especializados em ingredientes</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-secondary text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedores de ingredientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fornecedores de Ingredientes</CardTitle>
            <CardDescription>
              Gerencie os fornecedores especializados em ingredientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 && !loading && !error ? (
              <EmptyState
                icon={Plus}
                title={searchQuery ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                description={
                  searchQuery 
                    ? `Não foram encontrados fornecedores que correspondam a "${searchQuery}".`
                    : 'Comece adicionando seu primeiro fornecedor de ingredientes ao sistema.'
                }
                action={
                  !searchQuery ? {
                    label: 'Adicionar Fornecedor',
                    onClick: () => setShowCreateModal(true)
                  } : undefined
                }
              />
            ) : (
              <SupplierList
                suppliers={suppliers}
                onDeleted={handleSupplierDeleted}
                onUpdated={handleSupplierUpdated}
                onView={handleViewSupplier}
                onEdit={handleEditSupplier}
                onRefresh={loadSuppliers}
                isLoading={loading}
                error={error}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Detail Modal */}
      <SupplierDetailModal
        supplier={selectedSupplier}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />

      {/* Edit Supplier Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <SupplierForm
              initialData={selectedSupplier}
              onSubmit={async (data) => {
                // Update supplier using the API
                const response = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Erro ao atualizar fornecedor');
                }
                
                const updatedSupplier = await response.json();
                handleSupplierUpdated(updatedSupplier.supplier);
                setShowEditModal(false);
              }}
              submitLabel="Atualizar Fornecedor"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Supplier Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={async (data) => {
              const newSupplier = await createSupplier(data);
              handleSupplierCreated(newSupplier);
            }}
            submitLabel="Criar Fornecedor"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}