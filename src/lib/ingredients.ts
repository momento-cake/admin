import { 
  Ingredient, 
  CreateIngredientData, 
  UpdateIngredientData,
  IngredientFilters,
  StockStatus,
  IngredientUnit,
  UnitConversion,
  PriceHistoryEntry,
  CreatePriceHistoryData,
  PriceHistoryResponse
} from '@/types/ingredient';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'ingredients';

// Helper function to convert Firestore document to Ingredient
function docToIngredient(doc: DocumentSnapshot): Ingredient {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');
  
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    unit: data.unit,
    measurementValue: data.measurementValue || 1,
    brand: data.brand,
    category: data.category,
    currentStock: data.currentStock || 0,
    minStock: data.minStock || 0,
    currentPrice: data.pricePerUnit || 0,
    supplierId: data.supplierId,
    allergens: data.allergens || [],
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'system',
    lastUpdated: data.updatedAt?.toDate() || new Date()
  };
}

// Firestore functions for ingredients
export async function fetchIngredients(filters?: IngredientFilters) {
  try {
    console.log('🔍 Fetching ingredients with filters:', filters);

    // Base query - active ingredients only
    const ingredientsQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('name')
    );

    const snapshot = await getDocs(ingredientsQuery);
    let ingredients = snapshot.docs.map(docToIngredient);

    // Apply client-side filtering
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      ingredients = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category) {
      ingredients = ingredients.filter(ingredient =>
        ingredient.category === filters.category
      );
    }

    if (filters?.supplierId) {
      ingredients = ingredients.filter(ingredient =>
        ingredient.supplierId === filters.supplierId
      );
    }

    if (filters?.stockStatus) {
      ingredients = ingredients.filter(ingredient => {
        const status = getStockStatus(ingredient.currentStock, ingredient.minStock);
        return status === filters.stockStatus;
      });
    }

    console.log(`✅ Retrieved ${ingredients.length} ingredients`);

    return ingredients;
  } catch (error) {
    console.error('❌ Error fetching ingredients:', error);
    throw new Error('Erro ao buscar ingredientes');
  }
}

export async function fetchIngredient(id: string): Promise<Ingredient> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Ingrediente não encontrado');
    }
    
    return docToIngredient(docSnap);
  } catch (error) {
    console.error('❌ Error fetching ingredient:', error);
    throw new Error('Erro ao buscar ingrediente');
  }
}

export async function createIngredient(data: CreateIngredientData): Promise<Ingredient> {
  try {
    console.log('➕ Creating new ingredient:', data.name);

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome do ingrediente é obrigatório');
    }

    if (!data.category) {
      throw new Error('Categoria é obrigatória');
    }

    if (!data.unit) {
      throw new Error('Unidade é obrigatória');
    }

    // Check if ingredient with same name already exists
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('name', '==', data.name),
      where('isActive', '==', true)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Já existe um ingrediente com esse nome');
    }

    // Create ingredient document
    const ingredientData = {
      name: data.name,
      category: data.category,
      unit: data.unit,
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      pricePerUnit: data.currentPrice || 0,
      supplierId: data.supplierId || null,
      supplierName: data.supplierName || null,
      notes: data.notes || null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), ingredientData);

    // Fetch the created document
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Failed to fetch created ingredient');
    }

    const ingredient = docToIngredient(createdDoc);

    // If price and supplier are provided, create initial price history entry
    if (data.currentPrice && data.currentPrice > 0 && data.supplierId) {
      try {
        await createPriceHistory({
          ingredientId: ingredient.id,
          price: data.currentPrice,
          supplierId: data.supplierId,
          quantity: data.currentStock || 0,
          notes: `Preço inicial - ${ingredient.name}`
        });
        console.log(`💰 Initial price history created for ${ingredient.name}: ${data.currentPrice}`);
      } catch (priceError) {
        console.error('❌ Error creating initial price history:', priceError);
        // Don't fail the ingredient creation if price history fails
      }
    }

    // Create initial stock history entry
    if (data.currentStock && data.currentStock > 0) {
      try {
        const stockHistoryData = {
          ingredientId: ingredient.id,
          type: 'adjustment',
          quantity: data.currentStock,
          previousStock: 0,
          newStock: data.currentStock,
          notes: `Estoque inicial - ${ingredient.name}`,
          reason: 'Criação do ingrediente',
          supplierId: data.supplierId || null,
          unitCost: data.currentPrice || null,
          createdAt: Timestamp.now(),
          createdBy: 'admin@momentocake.com.br'
        };

        await addDoc(collection(db, 'stock_history'), stockHistoryData);
        console.log(`📦 Initial stock history created for ${ingredient.name}: ${data.currentStock} units`);
      } catch (stockHistoryError) {
        console.error('❌ Error creating initial stock history:', stockHistoryError);
        // Don't fail the ingredient creation if stock history fails
      }
    }

    console.log(`✅ Ingredient created: ${ingredient.name} (${ingredient.id})`);

    return ingredient;
  } catch (error) {
    console.error('❌ Error creating ingredient:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar ingrediente');
  }
}

export async function updateIngredient(data: UpdateIngredientData): Promise<Ingredient> {
  try {
    const { id, ...updateData } = data;
    
    console.log('🔄 Updating ingredient:', id);

    // Validate required fields
    if (updateData.name && !updateData.name.trim()) {
      throw new Error('Nome do ingrediente é obrigatório');
    }

    // Get current ingredient data to compare changes
    const currentIngredient = await fetchIngredient(id);

    // Check if ingredient with same name already exists (excluding current ingredient)
    if (updateData.name) {
      const existingQuery = query(
        collection(db, COLLECTION_NAME),
        where('name', '==', updateData.name),
        where('isActive', '==', true)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.filter(doc => doc.id !== id);
      
      if (existingDocs.length > 0) {
        throw new Error('Já existe um ingrediente com esse nome');
      }
    }

    // Update ingredient document
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });

    // Fetch the updated document
    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Ingrediente não encontrado');
    }

    const ingredient = docToIngredient(updatedDoc);

    // Log stock changes to history (if stock was updated)
    if (updateData.currentStock !== undefined && updateData.currentStock !== currentIngredient.currentStock) {
      try {
        const stockHistoryData = {
          ingredientId: ingredient.id,
          type: 'adjustment',
          quantity: Math.abs(updateData.currentStock - currentIngredient.currentStock),
          previousStock: Math.round(currentIngredient.currentStock),
          newStock: Math.round(updateData.currentStock),
          notes: `Atualização de estoque via edição - ${ingredient.name}`,
          reason: 'Edição do ingrediente',
          supplierId: updateData.supplierId || currentIngredient.supplierId || null,
          unitCost: updateData.currentPrice || currentIngredient.currentPrice || null,
          createdAt: Timestamp.now(),
          createdBy: 'admin@momentocake.com.br'
        };

        await addDoc(collection(db, 'stock_history'), stockHistoryData);
        console.log(`📦 Stock history logged for ${ingredient.name}: ${currentIngredient.currentStock} -> ${updateData.currentStock}`);
      } catch (stockHistoryError) {
        console.error('❌ Error creating stock history:', stockHistoryError);
        // Don't fail the update if stock history fails
      }
    }

    // Log price changes to price history (if price and supplier are updated)
    if (updateData.currentPrice !== undefined && updateData.currentPrice !== currentIngredient.currentPrice && updateData.supplierId) {
      try {
        await createPriceHistory({
          ingredientId: ingredient.id,
          price: updateData.currentPrice,
          supplierId: updateData.supplierId,
          quantity: updateData.currentStock || currentIngredient.currentStock,
          notes: `Atualização de preço via edição - ${ingredient.name}`
        });
        console.log(`💰 Price history logged for ${ingredient.name}: ${currentIngredient.currentPrice} -> ${updateData.currentPrice}`);
      } catch (priceError) {
        console.error('❌ Error creating price history:', priceError);
        // Don't fail the update if price history fails
      }
    }

    console.log(`✅ Ingredient updated: ${ingredient.name} (${ingredient.id})`);

    return ingredient;
  } catch (error) {
    console.error('❌ Error updating ingredient:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar ingrediente');
  }
}

export async function deleteIngredient(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting ingredient:', id);

    // Soft delete by setting isActive to false
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { 
      isActive: false,
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Ingredient marked as inactive: ${id}`);
  } catch (error) {
    console.error('❌ Error deleting ingredient:', error);
    throw new Error('Erro ao remover ingrediente');
  }
}

// Utility functions
export function getStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock === 0) return 'out';
  
  const stockRatio = currentStock / minStock;
  
  if (stockRatio <= 0.5) return 'critical';
  if (stockRatio <= 1) return 'low';
  return 'good';
}

export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'good':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'low':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'out':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStockStatusText(status: StockStatus): string {
  switch (status) {
    case 'good':
      return 'Estoque bom';
    case 'low':
      return 'Estoque baixo';
    case 'critical':
      return 'Estoque crítico';
    case 'out':
      return 'Sem estoque';
    default:
      return 'Status desconhecido';
  }
}

// Unit conversion utilities
export function getUnitDisplayName(unit: IngredientUnit): string {
  const unitNames = {
    [IngredientUnit.KILOGRAM]: 'kg',
    [IngredientUnit.GRAM]: 'g',
    [IngredientUnit.LITER]: 'L',
    [IngredientUnit.MILLILITER]: 'ml',
    [IngredientUnit.UNIT]: 'unidade'
  };
  
  return unitNames[unit] || unit;
}

// Basic unit conversions (metric conversions only)
export function convertUnits(from: IngredientUnit, to: IngredientUnit, value: number): number {
  // If same unit, return value
  if (from === to) return value;
  
  // Convert to base unit (grams for weight, milliliters for volume)
  let baseValue = value;
  
  // Weight conversions to grams
  switch (from) {
    case IngredientUnit.KILOGRAM:
      baseValue = value * 1000;
      break;
    case IngredientUnit.GRAM:
      baseValue = value;
      break;
  }
  
  // Volume conversions to milliliters
  switch (from) {
    case IngredientUnit.LITER:
      baseValue = value * 1000;
      break;
    case IngredientUnit.MILLILITER:
      baseValue = value;
      break;
  }
  
  // Convert from base unit to target unit
  switch (to) {
    case IngredientUnit.KILOGRAM:
      return baseValue / 1000;
    case IngredientUnit.GRAM:
      return baseValue;
    case IngredientUnit.LITER:
      return baseValue / 1000;
    case IngredientUnit.MILLILITER:
      return baseValue;
    default:
      return value; // For units that can't be converted (e.g., UNIT)
  }
}

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

// Format stock quantity for display (packages/units)
export function formatStock(quantity: number): string {
  const roundedQuantity = Math.round(quantity);
  return `${roundedQuantity} ${roundedQuantity === 1 ? 'unidade' : 'unidades'}`;
}

// Format ingredient measurement for display (measurement units)
export function formatMeasurement(value: number, unit: IngredientUnit): string {
  const unitDisplay = getUnitDisplayName(unit);
  return `${value} ${unitDisplay}`;
}

// Stock update functions
interface StockUpdateData {
  quantity: number;
  type: 'adjustment' | 'purchase' | 'usage' | 'waste' | 'correction';
  notes?: string;
  reason?: string;
  supplierId?: string;
  unitCost?: number;
}

export async function updateIngredientStock(ingredientId: string, data: StockUpdateData): Promise<any> {
  try {
    console.log('🔄 Updating ingredient stock:', ingredientId);

    // Validate that quantity is a positive integer
    const quantity = Math.round(Math.abs(data.quantity));
    if (quantity <= 0) {
      throw new Error('Quantidade deve ser um número inteiro positivo');
    }

    // Get current ingredient
    const ingredient = await fetchIngredient(ingredientId);
    
    // Calculate new stock based on type (always work with integers)
    let newStock = Math.round(ingredient.currentStock);
    
    switch (data.type) {
      case 'adjustment':
      case 'correction':
        newStock = quantity;
        break;
      case 'purchase':
        newStock += quantity;
        break;
      case 'usage':
      case 'waste':
        newStock -= quantity;
        break;
    }

    // Ensure stock doesn't go negative
    newStock = Math.max(0, newStock);

    // If this is a purchase, create price history entry and update ingredient's current price
    if (data.type === 'purchase' && data.unitCost && data.supplierId) {
      try {
        // Create price history entry
        await createPriceHistory({
          ingredientId,
          price: data.unitCost,
          supplierId: data.supplierId,
          quantity: quantity,
          notes: data.notes || `Compra registrada - ${quantity} unidades`
        });

        // Update ingredient stock and current price atomically
        const docRef = doc(db, COLLECTION_NAME, ingredientId);
        await updateDoc(docRef, {
          currentStock: newStock,
          pricePerUnit: data.unitCost, // Update current price
          updatedAt: Timestamp.now()
        });

        console.log(`💰 Price history created and current price updated to ${data.unitCost}`);
      } catch (priceError) {
        console.error('❌ Error creating price history:', priceError);
        // Continue with stock update even if price history fails
        const docRef = doc(db, COLLECTION_NAME, ingredientId);
        await updateDoc(docRef, {
          currentStock: newStock,
          updatedAt: Timestamp.now()
        });
      }
    } else {
      // Update ingredient stock only
      const docRef = doc(db, COLLECTION_NAME, ingredientId);
      await updateDoc(docRef, {
        currentStock: newStock,
        updatedAt: Timestamp.now()
      });
    }

    // Create stock history record
    const stockHistoryData = {
      ingredientId,
      type: data.type,
      quantity: quantity, // Use validated integer quantity
      previousStock: Math.round(ingredient.currentStock),
      newStock,
      notes: data.notes || null,
      reason: data.reason || null,
      supplierId: data.supplierId || null,
      unitCost: data.unitCost || null,
      createdAt: Timestamp.now()
    };

    await addDoc(collection(db, 'stock_history'), stockHistoryData);

    console.log(`✅ Stock updated for ingredient ${ingredientId}: ${ingredient.currentStock} -> ${newStock}`);

    return {
      previousStock: ingredient.currentStock,
      newStock,
      ingredient: await fetchIngredient(ingredientId)
    };
  } catch (error) {
    console.error('❌ Error updating ingredient stock:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar estoque');
  }
}

export async function fetchStockHistory(ingredientId: string, limitParam = 20): Promise<any> {
  try {
    console.log('🔍 Fetching stock history for ingredient:', ingredientId);

    const historyQuery = query(
      collection(db, 'stock_history'),
      where('ingredientId', '==', ingredientId),
      orderBy('createdAt', 'desc'),
      limit(limitParam)
    );

    const snapshot = await getDocs(historyQuery);
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    console.log(`✅ Retrieved ${history.length} stock history records`);

    return history;
  } catch (error) {
    console.error('❌ Error fetching stock history:', error);
    throw new Error('Erro ao buscar histórico de estoque');
  }
}

// Price History Management Functions
export async function createPriceHistory(data: CreatePriceHistoryData): Promise<PriceHistoryEntry> {
  try {
    console.log('🎯 Creating price history entry:', data);

    const priceHistoryData = {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
      createdBy: 'admin@momentocake.com.br' // TODO: Get from auth context
    };

    const docRef = await addDoc(collection(db, 'priceHistory'), priceHistoryData);

    console.log('✅ Price history entry created with ID:', docRef.id);

    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      createdBy: 'admin@momentocake.com.br'
    };
  } catch (error) {
    console.error('❌ Error creating price history:', error);
    throw new Error('Erro ao criar histórico de preços');
  }
}

export async function fetchPriceHistory(ingredientId: string, limitParam = 20): Promise<PriceHistoryResponse> {
  try {
    console.log('🎯 Fetching price history for ingredient:', ingredientId);

    const priceHistoryQuery = query(
      collection(db, 'priceHistory'),
      where('ingredientId', '==', ingredientId),
      orderBy('createdAt', 'desc'),
      limit(limitParam)
    );

    const snapshot = await getDocs(priceHistoryQuery);
    const priceHistory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as PriceHistoryEntry[];

    console.log(`✅ Retrieved ${priceHistory.length} price history records`);

    return {
      priceHistory,
      total: priceHistory.length,
      page: 1,
      limit: limitParam
    };
  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    throw new Error('Erro ao buscar histórico de preços');
  }
}

export async function getLatestPrice(ingredientId: string): Promise<PriceHistoryEntry | null> {
  try {
    const response = await fetchPriceHistory(ingredientId, 1);
    return response.priceHistory[0] || null;
  } catch (error) {
    console.error('❌ Error getting latest price:', error);
    return null;
  }
}