'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IngredientList } from '@/components/ingredients/IngredientList';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { StockAlerts } from '@/components/ingredients/StockAlerts';
import { StockManager } from '@/components/ingredients/StockManager';
import { StockAnalytics } from '@/components/ingredients/StockAnalytics';
import { UnitConverter } from '@/components/ingredients/UnitConverter';
import { Ingredient } from '@/types/ingredient';
import { createIngredient, updateIngredient, deleteIngredient } from '@/lib/ingredients';
import { fetchSuppliers } from '@/lib/suppliers';
import { IngredientFormData } from '@/lib/validators/ingredient';
import { PriceTracker } from '@/components/ingredients/PriceTracker';
import { UsageAnalytics } from '@/components/ingredients/UsageAnalytics';
import { RecipeIntegration } from '@/components/ingredients/RecipeIntegration';
import { ReportsDashboard } from '@/components/ingredients/ReportsDashboard';
import { AdvancedFeatures } from '@/components/ingredients/AdvancedFeatures';
import { fetchRecipes } from '@/lib/recipes';
import { BarChart3, AlertTriangle, Calculator, Package, TrendingUp, DollarSign, Activity, FileBarChart, Settings } from 'lucide-react';
// TODO: Implement toast notifications

export default function IngredientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inventory';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showStockManager, setShowStockManager] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const handleCreateIngredient = () => {
    setSelectedIngredient(null);
    setShowCreateForm(true);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowEditForm(true);
  };

  const handleViewIngredient = (ingredient: Ingredient) => {
    router.push(`/ingredients/${ingredient.id}`);
  };

  const handleDeleteIngredient = async (ingredient: Ingredient) => {
    if (window.confirm(`Tem certeza que deseja remover o ingrediente "${ingredient.name}"?`)) {
      try {
        await deleteIngredient(ingredient.id);
        console.log(`Ingrediente removido: ${ingredient.name}`);
        // TODO: Show success toast
        // The IngredientList will automatically refresh
      } catch (error) {
        console.error('Erro ao remover ingrediente:', error);
        alert('Erro ao remover ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
      }
    }
  };

  const handleSubmitCreate = async (data: IngredientFormData) => {
    try {
      setIsSubmitting(true);
      await createIngredient(data);
      setShowCreateForm(false);
      console.log(`Ingrediente criado: ${data.name}`);
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

  const handleManageStock = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowStockManager(true);
  };

  const handleStockUpdated = (updatedIngredient: Ingredient) => {
    // Refresh ingredient data (would be better with proper state management)
    setSelectedIngredient(updatedIngredient);
    setShowStockManager(false);
  };

  const handleIngredientClickFromAlert = (ingredient: Ingredient) => {
    router.push('/ingredients?tab=inventory');
    // Could scroll to ingredient or highlight it in the list
  };

  const handleIngredientClickFromAnalytics = (ingredient: Ingredient) => {
    handleViewIngredient(ingredient);
  };

  // Load suppliers for stock management
  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers((data.suppliers || []).map((s: { id: string; name: string }) => ({
        id: s.id,
        name: s.name
      })));
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Load suppliers and recipes on component mount
  useEffect(() => {
    loadSuppliers();
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await fetchRecipes();
      setRecipes(data.recipes || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const onIngredientUpdate = (updatedIngredient: Ingredient) => {
    setIngredients(prev => 
      prev.map(ing => ing.id === updatedIngredient.id ? updatedIngredient : ing)
    );
    if (selectedIngredient?.id === updatedIngredient.id) {
      setSelectedIngredient(updatedIngredient);
    }
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    router.push('/ingredients?tab=prices'); // Switch to price tracking tab
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-momento-text">Sistema de Ingredientes</h1>
        <p className="text-muted-foreground">
          Gerencie seu catálogo completo de ingredientes, estoque e fornecedores
        </p>
      </div>

      <div className="space-y-4">
        {activeTab === 'inventory' && (
          <IngredientList
            onIngredientCreate={handleCreateIngredient}
            onIngredientEdit={handleEditIngredient}
            onIngredientView={handleViewIngredient}
            onIngredientDelete={handleDeleteIngredient}
            onIngredientsLoaded={setIngredients}
          />
        )}

        {activeTab === 'alerts' && (
          <StockAlerts onIngredientClick={handleIngredientClickFromAlert} />
        )}

        {activeTab === 'analytics' && (
          <StockAnalytics onIngredientClick={handleIngredientClickFromAnalytics} />
        )}

        {activeTab === 'converter' && (
          <UnitConverter />
        )}

        {activeTab === 'prices' && (
          <>
            {selectedIngredient ? (
              <PriceTracker 
                ingredient={selectedIngredient} 
                suppliers={suppliers.map(s => ({ ...s, contactPerson: '', phone: '', email: '', address: '', rating: 5, categories: [], isActive: true, createdAt: new Date() }))}
                onPriceUpdate={onIngredientUpdate}
              />
            ) : (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Rastreamento de Preços</h3>
                <p className="text-muted-foreground">
                  Selecione um ingrediente na seção &quot;Inventário&quot; para visualizar seu histórico de preços.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'usage' && (
          <UsageAnalytics 
            ingredients={ingredients} 
            onIngredientClick={handleIngredientClickFromAnalytics}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeIntegration 
            ingredients={ingredients}
            selectedIngredientId={selectedIngredient?.id}
            onRecipeClick={(recipe) => router.push(`/recipes/${recipe.id}`)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsDashboard 
            ingredients={ingredients}
            recipes={recipes}
          />
        )}

        {activeTab === 'advanced' && (
          <AdvancedFeatures 
            ingredients={ingredients}
            onIngredientUpdate={onIngredientUpdate}
            onBatchComplete={loadSuppliers}
          />
        )}
      </div>

      {/* Create Ingredient Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}