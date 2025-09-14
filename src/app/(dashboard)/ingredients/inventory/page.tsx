'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IngredientList } from '@/components/ingredients/IngredientList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { StockManager } from '@/components/ingredients/StockManager';
import { IngredientDetailScreen } from '@/components/ingredients/IngredientDetailScreen';
import { Ingredient, Supplier } from '@/types/ingredient';
import { createIngredient, updateIngredient, deleteIngredient } from '@/lib/ingredients';
import { fetchSuppliers } from '@/lib/suppliers';
import { IngredientFormData } from '@/lib/validators/ingredient';
// TODO: Implement toast notifications

export default function InventoryPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showStockManager, setShowStockManager] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateIngredient = () => {
    setSelectedIngredient(null);
    setShowCreateForm(true);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowEditForm(true);
  };

  const handleViewIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowDetailView(true);
  };

  const handleDeleteIngredient = async (ingredient: Ingredient) => {
    try {
      await deleteIngredient(ingredient.id);
      console.log(`Ingrediente removido: ${ingredient.name}`);
      setRefreshTrigger(prev => prev + 1);
      // TODO: Show success toast
    } catch (error) {
      console.error('Erro ao remover ingrediente:', error);
      alert('Erro ao remover ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    }
  };

  const handleSubmitCreate = async (data: IngredientFormData) => {
    try {
      setIsSubmitting(true);
      await createIngredient(data);
      setShowCreateForm(false);
      console.log(`Ingrediente criado: ${data.name}`);
      setRefreshTrigger(prev => prev + 1);
      // TODO: Show success toast
    } catch (error) {
      console.error('Erro ao criar ingrediente:', error);
      alert('Erro ao criar ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (data: IngredientFormData) => {
    if (!selectedIngredient) return;

    try {
      setIsSubmitting(true);
      await updateIngredient({ id: selectedIngredient.id, ...data });
      setShowEditForm(false);
      setSelectedIngredient(null);
      console.log(`Ingrediente atualizado: ${data.name}`);
      setRefreshTrigger(prev => prev + 1);
      // TODO: Show success toast
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      alert('Erro ao atualizar ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setSelectedIngredient(null);
  };

  const handleDetailViewBack = () => {
    setShowDetailView(false);
    setSelectedIngredient(null);
  };

  const handleIngredientUpdated = (updatedIngredient: Ingredient) => {
    setSelectedIngredient(updatedIngredient);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleManageStock = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowStockManager(true);
  };

  const handleStockUpdated = (updatedIngredient: Ingredient) => {
    // Refresh ingredient data (would be better with proper state management)
    setSelectedIngredient(updatedIngredient);
    setShowStockManager(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefreshIngredients = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Load suppliers for stock management
  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Load suppliers on component mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-momento-text">Inventário de Ingredientes</h1>
        <p className="text-muted-foreground">
          Gerencie seu estoque de ingredientes, quantidades e informações detalhadas
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Inventário de Ingredientes</CardTitle>
            <CardDescription>
              Gerencie seu estoque de ingredientes, quantidades e informações detalhadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IngredientList
              onIngredientCreate={handleCreateIngredient}
              onIngredientEdit={handleEditIngredient}
              onIngredientView={handleViewIngredient}
              onIngredientDelete={handleDeleteIngredient}
              onRefresh={handleRefreshIngredients}
              key={refreshTrigger}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create Ingredient Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Ingrediente</DialogTitle>
          </DialogHeader>
          <IngredientForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Ingredient Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="w-auto min-w-[600px] max-w-[900px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <IngredientForm
              ingredient={selectedIngredient}
              onSubmit={handleSubmitEdit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Manager Dialog */}
      <Dialog open={showStockManager} onOpenChange={setShowStockManager}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>
              {selectedIngredient ? `Gerenciar Estoque - ${selectedIngredient.name}` : 'Gerenciar Estoque'}
            </DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <StockManager
              ingredient={selectedIngredient}
              onStockUpdated={handleStockUpdated}
              suppliers={suppliers}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Ingredient Detail View Dialog */}
      <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
        <DialogContent className="w-auto min-w-[800px] max-w-[1200px] max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Detalhes do Ingrediente</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <IngredientDetailScreen
              ingredient={selectedIngredient}
              suppliers={suppliers}
              onEdit={handleEditIngredient}
              onBack={handleDetailViewBack}
              onIngredientUpdate={handleIngredientUpdated}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}