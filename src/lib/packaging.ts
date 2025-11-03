/**
 * Firebase integration for Packaging Management
 *
 * This module provides CRUD operations for packaging items, stock management,
 * and price history tracking. All operations are audited with createdBy timestamps.
 *
 * Collections:
 * - packaging: Main packaging items
 * - packaging_stock_history: Stock movement audit trail
 * - packaging_price_history: Price tracking history
 */

import {
  Packaging,
  CreatePackagingData,
  UpdatePackagingData,
  PackagingFilters,
  StockStatus,
  StockHistoryEntry,
  StockUpdateData,
  PriceHistoryEntry,
  CreatePriceHistoryData,
  PackagingResponse,
  StockHistoryResponse,
  PriceHistoryResponse
} from '@/types/packaging';
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
import { getAuth } from 'firebase/auth';

const PACKAGING_COLLECTION = 'packaging';
const STOCK_HISTORY_COLLECTION = 'packaging_stock_history';
const PRICE_HISTORY_COLLECTION = 'packaging_price_history';

/**
 * Get the current user ID from Firebase Auth
 * Returns 'system' if no user is authenticated (for testing/fallback)
 */
function getCurrentUserId(): string {
  try {
    const auth = getAuth();
    return auth.currentUser?.uid || 'system';
  } catch {
    return 'system';
  }
}

/**
 * Convert a Firestore document to a Packaging object
 */
function docToPackaging(doc: DocumentSnapshot): Packaging {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    brand: data.brand,
    unit: data.unit,
    measurementValue: data.measurementValue || 1,
    currentPrice: data.currentPrice || 0,
    currentStock: data.currentStock || 0,
    minStock: data.minStock || 0,
    supplierId: data.supplierId,
    category: data.category,
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'system'
  };
}

/**
 * Convert a Firestore document to a StockHistoryEntry object
 */
function docToStockHistory(doc: DocumentSnapshot): StockHistoryEntry {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    packagingId: data.packagingId,
    type: data.type,
    quantity: data.quantity,
    previousStock: data.previousStock || 0,
    newStock: data.newStock || 0,
    supplierId: data.supplierId,
    unitCost: data.unitCost,
    notes: data.notes,
    reason: data.reason,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'system'
  };
}

/**
 * Convert a Firestore document to a PriceHistoryEntry object
 */
function docToPriceHistory(doc: DocumentSnapshot): PriceHistoryEntry {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    packagingId: data.packagingId,
    price: data.price,
    supplierId: data.supplierId,
    quantity: data.quantity,
    notes: data.notes,
    createdAt: data.createdAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'system'
  };
}

/**
 * Determine stock status based on current and minimum stock levels
 * - good: stock >= minStock (>= 100%)
 * - low: 50% <= stock < 100% of minStock
 * - critical: 0% < stock < 50% of minStock
 * - out: stock = 0
 */
export function getStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock === 0) return 'out';
  if (currentStock >= minStock) return 'good';
  const percentage = (currentStock / minStock) * 100;
  if (percentage >= 50) return 'low';
  return 'critical';
}

/**
 * Format a price to Brazilian currency format (R$)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

/**
 * Format a date to Brazilian date format (DD/MM/YYYY)
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Get display name for a unit of measurement
 */
export function getUnitDisplayName(unit: string): string {
  const unitNames: Record<string, string> = {
    unit: 'Unidade',
    box: 'Caixa',
    set: 'Conjunto',
    dozen: 'Dúzia',
    ream: 'Resma'
  };
  return unitNames[unit] || unit;
}

/**
 * Get display name for a packaging category
 */
export function getCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    box: 'Caixas',
    base: 'Bases/Boards',
    topper: 'Toppers',
    carrier: 'Caixas de Transporte',
    bag: 'Sacos/Bolsas',
    paper: 'Papel e Papelão',
    ribbon: 'Fitas/Decoração',
    other: 'Outros'
  };
  return categoryNames[category] || category;
}

/**
 * Fetch all active packaging items
 * Supports filtering by category, supplier, stock status, and search query
 */
export async function fetchPackaging(filters?: PackagingFilters): Promise<Packaging[]> {
  try {
    console.log('🔍 Fetching packaging items with filters:', filters);

    // Base query - active packaging only
    const packagingQuery = query(
      collection(db, PACKAGING_COLLECTION),
      where('isActive', '==', true),
      orderBy('name')
    );

    const snapshot = await getDocs(packagingQuery);
    let packaging = snapshot.docs.map(docToPackaging);

    // Apply client-side filtering
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      packaging = packaging.filter(pkg =>
        pkg.name.toLowerCase().includes(searchLower) ||
        pkg.brand?.toLowerCase().includes(searchLower) ||
        pkg.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category) {
      packaging = packaging.filter(pkg => pkg.category === filters.category);
    }

    if (filters?.supplierId) {
      packaging = packaging.filter(pkg => pkg.supplierId === filters.supplierId);
    }

    if (filters?.stockStatus) {
      packaging = packaging.filter(pkg => {
        const status = getStockStatus(pkg.currentStock, pkg.minStock);
        return status === filters.stockStatus;
      });
    }

    console.log(`✅ Retrieved ${packaging.length} packaging items`);

    return packaging;
  } catch (error) {
    console.error('❌ Error fetching packaging:', error);
    throw new Error('Erro ao buscar embalagens');
  }
}

/**
 * Fetch a single packaging item by ID
 */
export async function fetchPackagingItem(id: string): Promise<Packaging> {
  try {
    const docRef = doc(db, PACKAGING_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Embalagem não encontrada');
    }

    return docToPackaging(docSnap);
  } catch (error) {
    console.error('❌ Error fetching packaging item:', error);
    if (error instanceof Error && error.message === 'Embalagem não encontrada') {
      throw error;
    }
    throw new Error('Erro ao buscar embalagem');
  }
}

/**
 * Create a new packaging item
 * Automatically creates initial stock history entry if stock is provided
 */
export async function createPackaging(data: CreatePackagingData): Promise<Packaging> {
  try {
    console.log('➕ Creating new packaging:', data.name);

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome da embalagem é obrigatório');
    }

    if (!data.unit) {
      throw new Error('Unidade é obrigatória');
    }

    // Check if packaging with same name already exists
    const existingQuery = query(
      collection(db, PACKAGING_COLLECTION),
      where('name', '==', data.name),
      where('isActive', '==', true)
    );

    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error('Já existe uma embalagem com esse nome');
    }

    // Create packaging document
    const packagingData = {
      name: data.name,
      description: data.description || null,
      brand: data.brand || null,
      unit: data.unit,
      measurementValue: data.measurementValue || 1,
      currentPrice: data.currentPrice || 0,
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      supplierId: data.supplierId || null,
      category: data.category || null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: getCurrentUserId()
    };

    const docRef = await addDoc(collection(db, PACKAGING_COLLECTION), packagingData);

    // Fetch the created document
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Failed to fetch created packaging');
    }

    const packaging = docToPackaging(createdDoc);

    // Create initial price history entry if price and supplier are provided
    if (data.currentPrice && data.currentPrice > 0 && data.supplierId) {
      try {
        await createPriceHistory({
          packagingId: packaging.id,
          price: data.currentPrice,
          supplierId: data.supplierId,
          quantity: data.currentStock || 0,
          notes: `Preço inicial - ${packaging.name}`
        });
        console.log(`💰 Initial price history created for ${packaging.name}: ${data.currentPrice}`);
      } catch (priceError) {
        console.error('❌ Error creating initial price history:', priceError);
        // Don't fail the packaging creation if price history fails
      }
    }

    // Create initial stock history entry
    if (data.currentStock && data.currentStock > 0) {
      try {
        const stockHistoryData = {
          packagingId: packaging.id,
          type: 'adjustment',
          quantity: data.currentStock,
          previousStock: 0,
          newStock: data.currentStock,
          notes: `Estoque inicial - ${packaging.name}`,
          reason: 'Criação da embalagem',
          supplierId: data.supplierId || null,
          unitCost: data.currentPrice || null,
          createdAt: Timestamp.now(),
          createdBy: getCurrentUserId()
        };

        await addDoc(collection(db, STOCK_HISTORY_COLLECTION), stockHistoryData);
        console.log(`📦 Initial stock history created for ${packaging.name}: ${data.currentStock} units`);
      } catch (stockHistoryError) {
        console.error('❌ Error creating initial stock history:', stockHistoryError);
        // Don't fail the packaging creation if stock history fails
      }
    }

    console.log(`✅ Packaging created: ${packaging.name} (${packaging.id})`);

    return packaging;
  } catch (error) {
    console.error('❌ Error creating packaging:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar embalagem');
  }
}

/**
 * Update an existing packaging item
 * Automatically logs stock changes to history if stock is modified
 */
export async function updatePackaging(data: UpdatePackagingData): Promise<Packaging> {
  try {
    const { id, ...updateData } = data;

    console.log('🔄 Updating packaging:', id);

    // Validate required fields
    if (updateData.name !== undefined && !updateData.name.trim()) {
      throw new Error('Nome da embalagem é obrigatório');
    }

    // Get current packaging data to compare changes
    const currentPackaging = await fetchPackagingItem(id);

    // Check if packaging with same name already exists (excluding current packaging)
    if (updateData.name) {
      const existingQuery = query(
        collection(db, PACKAGING_COLLECTION),
        where('name', '==', updateData.name),
        where('isActive', '==', true)
      );

      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.filter(doc => doc.id !== id);

      if (existingDocs.length > 0) {
        throw new Error('Já existe uma embalagem com esse nome');
      }
    }

    // Update packaging document
    const docRef = doc(db, PACKAGING_COLLECTION, id);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });

    // Fetch the updated document
    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Embalagem não encontrada');
    }

    const packaging = docToPackaging(updatedDoc);

    // Log stock changes to history (if stock was updated)
    if (updateData.currentStock !== undefined && updateData.currentStock !== currentPackaging.currentStock) {
      try {
        const stockHistoryData = {
          packagingId: packaging.id,
          type: 'adjustment',
          quantity: Math.abs(updateData.currentStock - currentPackaging.currentStock),
          previousStock: Math.round(currentPackaging.currentStock),
          newStock: Math.round(updateData.currentStock),
          notes: `Atualização de estoque via edição - ${packaging.name}`,
          reason: 'Edição da embalagem',
          supplierId: updateData.supplierId || currentPackaging.supplierId || null,
          unitCost: updateData.currentPrice || currentPackaging.currentPrice || null,
          createdAt: Timestamp.now(),
          createdBy: getCurrentUserId()
        };

        await addDoc(collection(db, STOCK_HISTORY_COLLECTION), stockHistoryData);
        console.log(`📦 Stock history logged for ${packaging.name}`);
      } catch (stockHistoryError) {
        console.error('❌ Error logging stock history:', stockHistoryError);
        // Don't fail the update if stock history logging fails
      }
    }

    console.log(`✅ Packaging updated: ${packaging.name}`);

    return packaging;
  } catch (error) {
    console.error('❌ Error updating packaging:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar embalagem');
  }
}

/**
 * Soft delete a packaging item (mark as inactive)
 */
export async function deletePackaging(id: string): Promise<void> {
  try {
    console.log('🗑️  Deleting packaging:', id);

    const docRef = doc(db, PACKAGING_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Embalagem não encontrada');
    }

    const packaging = docToPackaging(docSnap);

    // Soft delete - mark as inactive
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Packaging deleted (soft): ${packaging.name}`);
  } catch (error) {
    console.error('❌ Error deleting packaging:', error);
    throw error instanceof Error ? error : new Error('Erro ao deletar embalagem');
  }
}

/**
 * Update packaging stock levels and create history entry
 * Supports various movement types: adjustment, purchase, usage, waste, correction
 */
export async function updatePackagingStock(data: StockUpdateData): Promise<StockHistoryEntry> {
  try {
    console.log('📦 Updating packaging stock:', data.packagingId);

    // Get current packaging
    const packaging = await fetchPackagingItem(data.packagingId);

    // Calculate new stock
    const newStock = packaging.currentStock + data.quantity;

    if (newStock < 0) {
      throw new Error('Estoque resultante não pode ser negativo');
    }

    // Update packaging document
    const docRef = doc(db, PACKAGING_COLLECTION, data.packagingId);
    await updateDoc(docRef, {
      currentStock: newStock,
      updatedAt: Timestamp.now()
    });

    // Create stock history entry
    const stockHistoryData = {
      packagingId: data.packagingId,
      type: data.type,
      quantity: Math.abs(data.quantity),
      previousStock: Math.round(packaging.currentStock),
      newStock: Math.round(newStock),
      notes: data.notes || null,
      reason: data.reason || null,
      supplierId: data.supplierId || null,
      unitCost: data.unitCost || null,
      createdAt: Timestamp.now(),
      createdBy: getCurrentUserId()
    };

    const historyRef = await addDoc(
      collection(db, STOCK_HISTORY_COLLECTION),
      stockHistoryData
    );

    const historyDoc = await getDoc(historyRef);

    if (!historyDoc.exists()) {
      throw new Error('Failed to create stock history');
    }

    const history = docToStockHistory(historyDoc);

    console.log(`✅ Stock updated for ${packaging.name}: ${packaging.currentStock} → ${newStock}`);

    return history;
  } catch (error) {
    console.error('❌ Error updating packaging stock:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar estoque da embalagem');
  }
}

/**
 * Fetch stock history for a packaging item
 * Returns entries ordered by most recent first
 */
export async function fetchStockHistory(packagingId: string, limitCount?: number): Promise<StockHistoryEntry[]> {
  try {
    console.log('📊 Fetching stock history for:', packagingId);

    const historyQuery = query(
      collection(db, STOCK_HISTORY_COLLECTION),
      where('packagingId', '==', packagingId),
      orderBy('createdAt', 'desc'),
      limit(limitCount || 50)
    );

    const snapshot = await getDocs(historyQuery);
    const history = snapshot.docs.map(docToStockHistory);

    console.log(`✅ Retrieved ${history.length} stock history entries`);

    return history;
  } catch (error) {
    console.error('❌ Error fetching stock history:', error);
    throw new Error('Erro ao buscar histórico de estoque');
  }
}

/**
 * Fetch price history for a packaging item
 * Returns entries ordered by most recent first
 */
export async function fetchPriceHistory(packagingId: string): Promise<PriceHistoryEntry[]> {
  try {
    console.log('💰 Fetching price history for:', packagingId);

    const historyQuery = query(
      collection(db, PRICE_HISTORY_COLLECTION),
      where('packagingId', '==', packagingId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(historyQuery);
    const history = snapshot.docs.map(docToPriceHistory);

    console.log(`✅ Retrieved ${history.length} price history entries`);

    return history;
  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    throw new Error('Erro ao buscar histórico de preços');
  }
}

/**
 * Create a price history entry
 * Records when packaging was purchased and at what price
 */
export async function createPriceHistory(data: CreatePriceHistoryData): Promise<PriceHistoryEntry> {
  try {
    console.log('💰 Creating price history entry for:', data.packagingId);

    // Validate required fields
    if (!data.packagingId) {
      throw new Error('ID da embalagem é obrigatório');
    }

    if (!data.supplierId) {
      throw new Error('ID do fornecedor é obrigatório');
    }

    if (data.price < 0) {
      throw new Error('Preço não pode ser negativo');
    }

    if (data.quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // Verify packaging exists
    await fetchPackagingItem(data.packagingId);

    // Create price history entry
    const priceHistoryData = {
      packagingId: data.packagingId,
      price: data.price,
      supplierId: data.supplierId,
      quantity: data.quantity,
      notes: data.notes || null,
      createdAt: Timestamp.now(),
      createdBy: getCurrentUserId()
    };

    const docRef = await addDoc(
      collection(db, PRICE_HISTORY_COLLECTION),
      priceHistoryData
    );

    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Failed to create price history');
    }

    const priceHistory = docToPriceHistory(createdDoc);

    console.log(`✅ Price history created: ${formatPrice(data.price)}`);

    return priceHistory;
  } catch (error) {
    console.error('❌ Error creating price history:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar histórico de preço');
  }
}

/**
 * Firestore Security Rules for Packaging Collections
 *
 * SECURITY RULES (to be added to Firestore console):
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Packaging collection rules
 *     // Admin can read/write everything
 *     // Viewers can only read
 *     match /packaging/{document=**} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth.token.admin == true;
 *     }
 *
 *     // Stock history collection
 *     // All authenticated users can read
 *     // Only admins can write (for audit trail)
 *     match /packaging_stock_history/{document=**} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth.token.admin == true;
 *     }
 *
 *     // Price history collection
 *     // All authenticated users can read
 *     // Only admins can write
 *     match /packaging_price_history/{document=**} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth.token.admin == true;
 *     }
 *   }
 * }
 */
