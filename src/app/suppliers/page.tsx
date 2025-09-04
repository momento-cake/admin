'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupplierCard } from '@/components/suppliers/SupplierCard';
import { SupplierList } from '@/components/suppliers/SupplierList';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchSuppliers } from '@/lib/suppliers';
import { Supplier } from '@/types/ingredient';
import { useDebounce } from '@/hooks/useDebounce';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadSuppliers();
  }, [debouncedSearchQuery]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await fetchSuppliers(debouncedSearchQuery);
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-momento-text">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores e fornecedoras</p>
        </div>
        <Button 
          onClick={() => router.push('/suppliers/new')}
          className="bg-momento-primary hover:bg-momento-secondary text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grade
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={searchQuery ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
          description={
            searchQuery 
              ? `Não foram encontrados fornecedores que correspondam a "${searchQuery}".`
              : 'Comece adicionando seu primeiro fornecedor ao sistema.'
          }
          action={
            !searchQuery ? {
              label: 'Adicionar Fornecedor',
              onClick: () => router.push('/suppliers/new')
            } : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onDeleted={handleSupplierDeleted}
                  onUpdated={handleSupplierUpdated}
                />
              ))}
            </div>
          ) : (
            <SupplierList
              suppliers={suppliers}
              onDeleted={handleSupplierDeleted}
              onUpdated={handleSupplierUpdated}
            />
          )}
        </div>
      )}
    </div>
  );
}