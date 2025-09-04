'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StockLevelIndicator } from '@/components/ingredients/StockLevelIndicator';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { PriceTracker } from '@/components/ingredients/PriceTracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ingredient, Supplier } from '@/types/ingredient';
import { fetchIngredient, updateIngredient, deleteIngredient, formatPrice, getUnitDisplayName } from '@/lib/ingredients';
import { fetchSupplier } from '@/lib/suppliers';
import { IngredientFormData } from '@/lib/validators/ingredient';
import { ArrowLeft, Edit, Trash2, Package, User, Calendar, Loader2, DollarSign, BarChart3 } from 'lucide-react';

export default function IngredientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const ingredientData = await fetchIngredient(id);
        setIngredient(ingredientData);

        // Load supplier if ingredient has one
        if (ingredientData.supplierId) {
          try {
            const supplierData = await fetchSupplier(ingredientData.supplierId);
            setSupplier(supplierData);
          } catch (error) {
            console.error('Error loading supplier:', error);
          }
        }
      } catch (error) {
        console.error('Error loading ingredient:', error);
        // TODO: Show error toast
        router.push('/ingredients');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, router]);

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = async () => {
    if (!ingredient) return;

    if (window.confirm(`Tem certeza que deseja remover o ingrediente "${ingredient.name}"?`)) {
      try {
        await deleteIngredient(ingredient.id);
        console.log(`Ingrediente removido: ${ingredient.name}`);
        router.push('/ingredients');
      } catch (error) {
        console.error('Erro ao remover ingrediente:', error);
        alert('Erro ao remover ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
      }
    }
  };

  const handleSubmitEdit = async (data: IngredientFormData) => {
    if (!ingredient) return;

    try {
      setIsSubmitting(true);
      const updatedIngredient = await updateIngredient({ id: ingredient.id, ...data });
      setIngredient(updatedIngredient);
      setShowEditForm(false);
      console.log(`Ingrediente atualizado: ${data.name}`);
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      alert('Erro ao atualizar ingrediente: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (category: string) => {
    const names = {
      flour: 'Farinha',
      sugar: 'Açúcar',
      dairy: 'Laticínios',
      eggs: 'Ovos',
      fats: 'Gorduras',
      leavening: 'Fermentos',
      flavoring: 'Aromas',
      nuts: 'Castanhas',
      fruits: 'Frutas',
      chocolate: 'Chocolate',
      spices: 'Temperos',
      preservatives: 'Conservantes',
      other: 'Outros'
    };
    
    return names[category as keyof typeof names] || category;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando ingrediente...</span>
        </div>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground">Ingrediente não encontrado</h1>
          <p className="text-muted-foreground mt-2">
            O ingrediente que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => router.push('/ingredients')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Ingredientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/ingredients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{ingredient.name}</h1>
            <p className="text-muted-foreground">
              Detalhes do ingrediente
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Histórico de Preços
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ingredient.description && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Descrição</h4>
                      <p className="text-foreground">{ingredient.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Categoria</h4>
                      <Badge variant="secondary">
                        {getCategoryName(ingredient.category)}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Unidade</h4>
                      <p className="text-foreground">{getUnitDisplayName(ingredient.unit)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Preço Atual</h4>
                    <p className="text-2xl font-bold text-foreground">
                      {formatPrice(ingredient.currentPrice)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {getUnitDisplayName(ingredient.unit)}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Allergens */}
              {ingredient.allergens && ingredient.allergens.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Alérgenos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {ingredient.allergens.map((allergen) => (
                        <Badge key={allergen} variant="outline">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stock */}
              <Card>
                <CardHeader>
                  <CardTitle>Estoque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StockLevelIndicator
                    currentStock={ingredient.currentStock}
                    minStock={ingredient.minStock}
                    unit={ingredient.unit}
                    showNumbers={true}
                  />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Atual</p>
                      <p className="font-medium">{ingredient.currentStock.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mínimo</p>
                      <p className="font-medium">{ingredient.minStock.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supplier */}
              {supplier && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Fornecedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{supplier.name}</p>
                    {supplier.contactPerson && (
                      <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                    )}
                    {supplier.phone && (
                      <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                    )}
                    {supplier.email && (
                      <p className="text-sm text-muted-foreground">{supplier.email}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(ingredient.createdAt).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Atualizado em</p>
                    <p className="font-medium">
                      {new Date(ingredient.lastUpdated).toLocaleDateString('pt-BR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prices" className="space-y-6">
          <PriceTracker 
            ingredient={ingredient}
            suppliers={supplier ? [supplier] : []}
            onPriceUpdate={setIngredient}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Análise de Uso Individual</h3>
                <p>Esta funcionalidade será implementada na próxima fase com dados históricos de consumo específicos do ingrediente.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          <IngredientForm
            ingredient={ingredient}
            onSubmit={handleSubmitEdit}
            onCancel={() => setShowEditForm(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}