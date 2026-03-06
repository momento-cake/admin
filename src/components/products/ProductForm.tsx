'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Product, ProductCategory, ProductSubcategory, ProductRecipeItem, ProductPackageItem } from '@/types/product';
import { productValidation } from '@/lib/validators/product';
import { fetchProductCategories, fetchProductSubcategories, formatPrice, calculateProductCost, calculateSuggestedPrice, calculateProfitMargin, isMarginViable } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader, Plus, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeSelector } from './RecipeSelector';
import { PackageSelector } from './PackageSelector';
import { CostAnalysis } from './CostAnalysis';
import { formatErrorMessage, logError } from '@/lib/error-handler';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading = false
}: ProductFormProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<ProductRecipeItem[]>(product?.productRecipes || []);
  const [selectedPackages, setSelectedPackages] = useState<ProductPackageItem[]>(product?.productPackages || []);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [showPackageSelector, setShowPackageSelector] = useState(false);
  // SKU is generated server-side in createProduct(); only display existing SKU in edit mode

  const isEditMode = !!product;

  // Initialize form
  const form = useForm({
    resolver: zodResolver(productValidation),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      categoryId: product?.categoryId || '',
      subcategoryId: product?.subcategoryId || '',
      price: product?.price || 0,
      markup: product?.markup || 150,
      productRecipes: product?.productRecipes || [],
      productPackages: product?.productPackages || []
    }
  });

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await fetchProductCategories();
        setCategories(cats);
        setError(null);

        // Set initial category if in edit mode
        if (product?.categoryId) {
          setSelectedCategoryId(product.categoryId);
          const subs = await fetchProductSubcategories(product.categoryId);
          setSubcategories(subs);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [product]);

  // Load subcategories when category changes
  const handleCategoryChange = async (categoryId: string) => {
    try {
      setSelectedCategoryId(categoryId);
      form.setValue('categoryId', categoryId);
      form.setValue('subcategoryId', ''); // Reset subcategory
      const subs = await fetchProductSubcategories(categoryId);
      setSubcategories(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar subcategorias');
    }
  };

  // Handle subcategory change - SKU is generated server-side in createProduct()
  const handleSubcategoryChange = async (subcategoryId: string) => {
    form.setValue('subcategoryId', subcategoryId);
  };

  // Handle recipe selection
  const handleRecipesSelected = (recipes: ProductRecipeItem[]) => {
    setSelectedRecipes(recipes);
    form.setValue('productRecipes', recipes);
    setShowRecipeSelector(false);
  };

  // Handle package selection
  const handlePackagesSelected = (packages: ProductPackageItem[]) => {
    setSelectedPackages(packages);
    form.setValue('productPackages', packages);
    setShowPackageSelector(false);
  };

  // Remove recipe
  const handleRemoveRecipe = (recipeId: string) => {
    const updated = selectedRecipes.filter(r => r.recipeId !== recipeId);
    setSelectedRecipes(updated);
    form.setValue('productRecipes', updated);
  };

  // Remove package
  const handleRemovePackage = (packageId: string) => {
    const updated = selectedPackages.filter(p => p.packagingId !== packageId);
    setSelectedPackages(updated);
    form.setValue('productPackages', updated);
  };

  // Watch price and markup for real-time cost recalculation
  const watchedPrice = form.watch('price');
  const watchedMarkup = form.watch('markup');

  // Calculate real-time costs with memoization
  const costAnalysisData = useMemo(() => {
    const costPrice = calculateProductCost({
      productRecipes: selectedRecipes,
      productPackages: selectedPackages
    });

    return {
      productRecipes: selectedRecipes,
      productPackages: selectedPackages,
      price: watchedPrice,
      markup: watchedMarkup,
      costPrice,
      suggestedPrice: calculateSuggestedPrice(costPrice, watchedMarkup)
    };
  }, [selectedRecipes, selectedPackages, watchedPrice, watchedMarkup]);

  const handleFormSubmit = async (data: any) => {
    try {
      setSubmitError(null);
      // Add calculated costs to form data (SKU is generated server-side)
      const submissionData = {
        ...data,
        productRecipes: selectedRecipes,
        productPackages: selectedPackages,
        costPrice: costAnalysisData.costPrice,
        suggestedPrice: costAnalysisData.suggestedPrice
      };
      await onSubmit(submissionData);
    } catch (err) {
      const errorMessage = formatErrorMessage(err);
      setSubmitError(errorMessage);
      logError('ProductForm.handleFormSubmit', err);
    }
  };

  if (loadingCategories) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando categorias...</span>
      </div>
    );
  }

  if (error && !categories.length) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Nome, descrição e SKU do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Bolo de Chocolate" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do produto..."
                      {...field}
                      disabled={isLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {product?.sku && (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-base">
                    {product.sku}
                  </Badge>
                  <span className="text-sm text-muted-foreground">(auto-gerado)</span>
                </div>
              </FormItem>
            )}
            {!isEditMode && (
              <p className="text-sm text-muted-foreground">O SKU sera gerado automaticamente ao criar o produto.</p>
            )}
          </CardContent>
        </Card>

        {/* Categorization Section */}
        <Card>
          <CardHeader>
            <CardTitle>Categorização</CardTitle>
            <CardDescription>Selecione a categoria e subcategoria do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleCategoryChange}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoria *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleSubcategoryChange}
                    disabled={isLoading || !selectedCategoryId || !subcategories.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategories.map((subcat) => (
                        <SelectItem key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Recipes Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Receitas</CardTitle>
            <CardDescription>Selecione as receitas que compõem este produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={() => setShowRecipeSelector(true)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {selectedRecipes.length > 0 ? 'Editar Receitas' : 'Adicionar Receitas'}
            </Button>

            {selectedRecipes.length > 0 && (
              <div className="space-y-2">
                {selectedRecipes.map((recipe) => (
                  <div key={recipe.id} className="flex justify-between items-center p-3 border rounded bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{recipe.recipeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {recipe.portions} porção(ões) × {formatPrice(recipe.recipeCost / recipe.portions)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{formatPrice(recipe.recipeCost)}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipe(recipe.recipeId)}
                        className="p-1 hover:bg-destructive/20 rounded"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Packages Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Embalagens</CardTitle>
            <CardDescription>Selecione as embalagens necessárias (opcional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={() => setShowPackageSelector(true)}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {selectedPackages.length > 0 ? 'Editar Embalagens' : 'Adicionar Embalagens'}
            </Button>

            {selectedPackages.length > 0 && (
              <div className="space-y-2">
                {selectedPackages.map((pkg) => (
                  <div key={pkg.id} className="flex justify-between items-center p-3 border rounded bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{pkg.packagingName}</p>
                      <p className="text-xs text-muted-foreground">
                        {pkg.quantity} unidade(s) × {formatPrice(pkg.packageCost / pkg.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{formatPrice(pkg.packageCost)}</p>
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(pkg.packagingId)}
                        className="p-1 hover:bg-destructive/20 rounded"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Analysis - Show when recipes or packages are selected */}
        {(selectedRecipes.length > 0 || selectedPackages.length > 0) && (
          <CostAnalysis product={costAnalysisData} />
        )}

        {/* Pricing Section */}
        <Card>
          <CardHeader>
            <CardTitle>Preços e Margem</CardTitle>
            <CardDescription>Defina o preço, markup e visualize a margem de lucro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de Venda *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        disabled={isLoading}
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Preço que será cobrado do cliente</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="markup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      placeholder="150"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>Percentual de markup sobre o custo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing summary - show when cost data is available */}
            {costAnalysisData.costPrice > 0 && (
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
                    <p className="font-semibold font-mono">{formatPrice(costAnalysisData.costPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Preço Sugerido</p>
                    <p className="font-semibold font-mono text-primary">{formatPrice(costAnalysisData.suggestedPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Margem de Lucro</p>
                    {(() => {
                      const margin = calculateProfitMargin(watchedPrice, costAnalysisData.costPrice);
                      const viability = isMarginViable(margin);
                      return (
                        <p className={cn('font-semibold', {
                          'text-green-600': viability === 'good',
                          'text-yellow-600': viability === 'warning',
                          'text-red-600': viability === 'poor'
                        })}>
                          {margin.toFixed(1)}%
                          <span className="text-xs ml-1">
                            ({viability === 'good' ? 'Otima' : viability === 'warning' ? 'Aviso' : 'Critica'})
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                    <p className="font-semibold font-mono">{formatPrice(watchedPrice - costAnalysisData.costPrice)}</p>
                  </div>
                </div>

                {/* BUG-PRICING-004: Warning when price below cost */}
                {watchedPrice > 0 && watchedPrice < costAnalysisData.costPrice && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p>Preco de venda esta abaixo do custo de producao!</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata Section */}
        {isEditMode && product && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Informações de Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Criado por</p>
                  <p className="font-medium">{product.createdBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {product.createdAt ? (
                      typeof (product.createdAt as any)?.toDate === 'function'
                        ? (product.createdAt as any).toDate().toLocaleDateString('pt-BR')
                        : new Date(product.createdAt as any).toLocaleDateString('pt-BR')
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Atualizado em</p>
                  <p className="font-medium">
                    {product.updatedAt ? (
                      typeof (product.updatedAt as any)?.toDate === 'function'
                        ? (product.updatedAt as any).toDate().toLocaleDateString('pt-BR')
                        : new Date(product.updatedAt as any).toLocaleDateString('pt-BR')
                    ) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? 'Atualizar Produto' : 'Criar Produto'}
          </Button>
        </div>
      </form>

      {/* Recipe Selector Modal */}
      <RecipeSelector
        isOpen={showRecipeSelector}
        selectedRecipes={selectedRecipes}
        onSelect={handleRecipesSelected}
        onCancel={() => setShowRecipeSelector(false)}
      />

      {/* Package Selector Modal */}
      <PackageSelector
        isOpen={showPackageSelector}
        selectedPackages={selectedPackages}
        onSelect={handlePackagesSelected}
        onCancel={() => setShowPackageSelector(false)}
      />
    </Form>
  );
}
