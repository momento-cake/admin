'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductCategoryForm } from '@/components/products/ProductCategoryForm';
import { ProductSubcategoryForm } from '@/components/products/ProductSubcategoryForm';
import { ProductCategoryList } from '@/components/products/ProductCategoryList';
import { useAuth } from '@/hooks/useAuth';
import {
  ProductCategory,
  ProductSubcategory,
  CreateProductCategoryData,
  UpdateProductCategoryData,
  CreateProductSubcategoryData,
  UpdateProductSubcategoryData
} from '@/types/product';
import {
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  createProductSubcategory,
  updateProductSubcategory,
  deleteProductSubcategory,
  fetchProductCategory
} from '@/lib/products';

export default function ProductCategoriesPage() {
  const { userModel } = useAuth();

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  // Subcategory form state
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ProductSubcategory | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [parentCategoryName, setParentCategoryName] = useState<string>('');
  const [isSubcategorySubmitting, setIsSubcategorySubmitting] = useState(false);

  const handleCategorySubmit = useCallback(
    async (data: CreateProductCategoryData | UpdateProductCategoryData) => {
      if (!userModel) return;

      setIsCategorySubmitting(true);
      try {
        if ('id' in data) {
          // Update existing category
          await updateProductCategory(data.id, data);
          console.log('Categoria atualizada com sucesso');
        } else {
          // Create new category
          await createProductCategory(data, userModel.uid);
          console.log('Categoria criada com sucesso');
        }
        setShowCategoryForm(false);
        setEditingCategory(null);
      } catch (error) {
        console.error('Error saving category:', error);
        alert(error instanceof Error ? error.message : 'Erro ao salvar categoria');
      } finally {
        setIsCategorySubmitting(false);
      }
    },
    [userModel]
  );

  const handleCategoryDelete = useCallback(
    async (category: ProductCategory) => {
      try {
        await deleteProductCategory(category.id);
        console.log('Categoria deletada com sucesso');
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(error instanceof Error ? error.message : 'Erro ao deletar categoria');
      }
    },
    []
  );

  const handleCategoryEdit = useCallback((category: ProductCategory) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  }, []);

  const handleSubcategoryCreate = useCallback((categoryId: string) => {
    setParentCategoryId(categoryId);
    setEditingSubcategory(null);
    setShowSubcategoryForm(true);
    // Load parent category name
    fetchProductCategory(categoryId).then(cat => {
      if (cat) {
        setParentCategoryName(cat.name);
      }
    });
  }, []);

  const handleSubcategoryEdit = useCallback((subcategory: ProductSubcategory) => {
    setParentCategoryId(subcategory.categoryId);
    setEditingSubcategory(subcategory);
    setShowSubcategoryForm(true);
    // Load parent category name
    fetchProductCategory(subcategory.categoryId).then(cat => {
      if (cat) {
        setParentCategoryName(cat.name);
      }
    });
  }, []);

  const handleSubcategorySubmit = useCallback(
    async (data: CreateProductSubcategoryData | UpdateProductSubcategoryData) => {
      if (!userModel) return;

      setIsSubcategorySubmitting(true);
      try {
        if ('id' in data) {
          // Update existing subcategory
          await updateProductSubcategory(data.id, data);
          console.log('Subcategoria atualizada com sucesso');
        } else {
          // Create new subcategory
          await createProductSubcategory(data, userModel.uid);
          console.log('Subcategoria criada com sucesso');
        }
        setShowSubcategoryForm(false);
        setEditingSubcategory(null);
        setParentCategoryId('');
        setParentCategoryName('');
      } catch (error) {
        console.error('Error saving subcategory:', error);
        alert(error instanceof Error ? error.message : 'Erro ao salvar subcategoria');
      } finally {
        setIsSubcategorySubmitting(false);
      }
    },
    [userModel]
  );

  const handleSubcategoryDelete = useCallback(
    async (subcategory: ProductSubcategory) => {
      try {
        await deleteProductSubcategory(subcategory.id);
        console.log('Subcategoria deletada com sucesso');
      } catch (error) {
        console.error('Error deleting subcategory:', error);
        alert(error instanceof Error ? error.message : 'Erro ao deletar subcategoria');
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categorias de Produtos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as categorias e subcategorias de produtos para organizar seu catálogo
        </p>
      </div>

      {/* Main Content */}
      <ProductCategoryList
        onCategoryCreate={() => {
          setEditingCategory(null);
          setShowCategoryForm(true);
        }}
        onCategoryEdit={handleCategoryEdit}
        onCategoryDelete={handleCategoryDelete}
        onSubcategoryCreate={handleSubcategoryCreate}
        onSubcategoryEdit={handleSubcategoryEdit}
        onSubcategoryDelete={handleSubcategoryDelete}
      />

      {/* Category Form Modal */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <ProductCategoryForm
            category={editingCategory || undefined}
            onSubmit={handleCategorySubmit}
            onCancel={() => {
              setShowCategoryForm(false);
              setEditingCategory(null);
            }}
            isLoading={isCategorySubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Subcategory Form Modal */}
      <Dialog open={showSubcategoryForm} onOpenChange={setShowSubcategoryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Editar Subcategoria' : 'Nova Subcategoria'}
            </DialogTitle>
          </DialogHeader>
          {parentCategoryId && (
            <ProductSubcategoryForm
              subcategory={editingSubcategory || undefined}
              parentCategoryId={parentCategoryId}
              parentCategoryName={parentCategoryName}
              onSubmit={handleSubcategorySubmit}
              onCancel={() => {
                setShowSubcategoryForm(false);
                setEditingSubcategory(null);
                setParentCategoryId('');
                setParentCategoryName('');
              }}
              isLoading={isSubcategorySubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
