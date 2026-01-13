import { 
  Supplier, 
  CreateSupplierData, 
  UpdateSupplierData,
  SuppliersResponse,
  IngredientCategory
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
  startAfter, 
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'suppliers';

// Helper function to convert Firestore document to Supplier
function docToSupplier(doc: DocumentSnapshot): Supplier {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');
  
  return {
    id: doc.id,
    name: data.name,
    contactPerson: data.contactPerson || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined,
    // Brazilian address structure
    cep: data.cep || undefined,
    estado: data.estado || undefined,
    cidade: data.cidade || undefined,
    bairro: data.bairro || undefined,
    endereco: data.endereco || undefined,
    numero: data.numero || undefined,
    complemento: data.complemento || undefined,
    // Legacy address field for backward compatibility
    address: data.address || undefined,
    // Brazilian business fields
    cpfCnpj: data.cpfCnpj || undefined,
    inscricaoEstadual: data.inscricaoEstadual || undefined,
    // Existing fields
    rating: data.rating || 0,
    categories: data.categories || [],
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date()
  };
}

// Firestore functions for suppliers
export async function fetchSuppliers(filters?: {
  searchQuery?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<SuppliersResponse> {
  try {
    console.log('🔍 Fetching suppliers with filters:', filters);

    // Base query - active suppliers only
    const suppliersQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('name')
    );

    const snapshot = await getDocs(suppliersQuery);
    let suppliers = snapshot.docs.map(docToSupplier);

    // Apply client-side filtering
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      suppliers = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchLower) ||
        supplier.contactPerson?.toLowerCase().includes(searchLower) ||
        supplier.email?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.category) {
      suppliers = suppliers.filter(supplier =>
        supplier.categories.includes(filters.category!)
      );
    }

    // Apply pagination
    const page = filters?.page || 1;
    const limitParam = filters?.limit || 50;
    const startIndex = (page - 1) * limitParam;
    const endIndex = startIndex + limitParam;
    const paginatedSuppliers = suppliers.slice(startIndex, endIndex);

    console.log(`✅ Retrieved ${paginatedSuppliers.length} suppliers (page ${page})`);

    return {
      suppliers: paginatedSuppliers,
      total: suppliers.length,
      page,
      limit: limitParam,
      totalPages: Math.ceil(suppliers.length / limitParam)
    };
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    throw new Error('Erro ao buscar fornecedores');
  }
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Fornecedor não encontrado');
    }

    return docToSupplier(docSnap);
  } catch (error) {
    console.error('❌ Error fetching supplier:', error);
    // Re-throw the original error if it's a specific error message
    if (error instanceof Error && error.message === 'Fornecedor não encontrado') {
      throw error;
    }
    throw new Error('Erro ao buscar fornecedor');
  }
}

export async function createSupplier(data: CreateSupplierData): Promise<Supplier> {
  try {
    console.log('➕ Creating new supplier:', data.name);

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome do fornecedor é obrigatório');
    }

    // Validate rating
    if (data.rating < 0 || data.rating > 5) {
      throw new Error('Avaliação deve estar entre 0 e 5');
    }

    // Validate email format if provided
    if (data.email && !data.email.includes('@')) {
      throw new Error('Formato de email inválido');
    }

    // Check if supplier with same name already exists
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('name', '==', data.name),
      where('isActive', '==', true)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Já existe um fornecedor com esse nome');
    }

    // Create supplier document
    const supplierData = {
      name: data.name,
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      email: data.email || null,
      // Brazilian address structure
      cep: data.cep || null,
      estado: data.estado || null,
      cidade: data.cidade || null,
      bairro: data.bairro || null,
      endereco: data.endereco || null,
      numero: data.numero || null,
      complemento: data.complemento || null,
      // Legacy address field
      address: data.address || null,
      // Brazilian business fields
      cpfCnpj: data.cpfCnpj || null,
      inscricaoEstadual: data.inscricaoEstadual || null,
      // Existing fields
      rating: data.rating || 0,
      categories: data.categories || [],
      isActive: true,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), supplierData);

    // Fetch the created document
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Failed to fetch created supplier');
    }

    const supplier = docToSupplier(createdDoc);

    console.log(`✅ Supplier created: ${supplier.name} (${supplier.id})`);

    return supplier;
  } catch (error) {
    console.error('❌ Error creating supplier:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar fornecedor');
  }
}

export async function updateSupplier(data: UpdateSupplierData): Promise<Supplier> {
  try {
    const { id, ...updateData } = data;
    
    console.log('🔄 Updating supplier:', id);

    // Validate required fields
    if (updateData.name && !updateData.name.trim()) {
      throw new Error('Nome do fornecedor é obrigatório');
    }

    // Validate rating
    if (updateData.rating !== undefined && (updateData.rating < 0 || updateData.rating > 5)) {
      throw new Error('Avaliação deve estar entre 0 e 5');
    }

    // Validate email format if provided
    if (updateData.email && !updateData.email.includes('@')) {
      throw new Error('Formato de email inválido');
    }

    // Check if supplier with same name already exists (excluding current supplier)
    if (updateData.name) {
      const existingQuery = query(
        collection(db, COLLECTION_NAME),
        where('name', '==', updateData.name),
        where('isActive', '==', true)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.filter(doc => doc.id !== id);
      
      if (existingDocs.length > 0) {
        throw new Error('Já existe um fornecedor com esse nome');
      }
    }

    // Update supplier document
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updateData);

    // Fetch the updated document
    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Fornecedor não encontrado');
    }

    const supplier = docToSupplier(updatedDoc);

    console.log(`✅ Supplier updated: ${supplier.name} (${supplier.id})`);

    return supplier;
  } catch (error) {
    console.error('❌ Error updating supplier:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar fornecedor');
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting supplier:', id);

    // Soft delete by setting isActive to false
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isActive: false });

    console.log(`✅ Supplier marked as inactive: ${id}`);
  } catch (error) {
    console.error('❌ Error deleting supplier:', error);
    throw new Error('Erro ao remover fornecedor');
  }
}

// Utility functions
export function formatRating(rating: number): string {
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
}

export function getRatingColor(rating: number): string {
  if (rating >= 4) return 'text-green-500';
  if (rating >= 3) return 'text-yellow-500';
  if (rating >= 2) return 'text-orange-500';
  return 'text-red-500';
}

export function formatPhone(phone: string): string {
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '');
  
  // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  if (numbers.length === 11) {
    return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  } else if (numbers.length === 10) {
    return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
  }
  
  return phone;
}

export function validatePhone(phone: string): boolean {
  const numbers = phone.replace(/\D/g, '');
  return numbers.length === 10 || numbers.length === 11;
}

// Centralized category translation function - used across the app for consistency
export function getCategoryLabel(category: IngredientCategory | string): string {
  const labels = {
    [IngredientCategory.FLOUR]: 'Farinhas',
    [IngredientCategory.SUGAR]: 'Açúcares', 
    [IngredientCategory.DAIRY]: 'Laticínios',
    [IngredientCategory.EGGS]: 'Ovos',
    [IngredientCategory.FATS]: 'Gorduras',
    [IngredientCategory.LEAVENING]: 'Fermentos',
    [IngredientCategory.FLAVORING]: 'Aromatizantes',
    [IngredientCategory.NUTS]: 'Castanhas e Nozes',
    [IngredientCategory.FRUITS]: 'Frutas',
    [IngredientCategory.CHOCOLATE]: 'Chocolate',
    [IngredientCategory.SPICES]: 'Temperos',
    [IngredientCategory.PRESERVATIVES]: 'Conservantes',
    [IngredientCategory.OTHER]: 'Outros'
  };
  
  // Check if it's a valid IngredientCategory
  if (Object.values(IngredientCategory).includes(category as IngredientCategory)) {
    return labels[category as IngredientCategory] || category;
  }
  
  // Return the original string if it's a custom category
  return category;
}

export function formatSupplierCategories(categories: string[]): string {
  if (categories.length === 0) return 'Nenhuma categoria';
  
  // Translate each category
  const translatedCategories = categories.map(cat => getCategoryLabel(cat));
  
  if (categories.length === 1) return translatedCategories[0];
  if (categories.length <= 3) return translatedCategories.join(', ');
  return `${translatedCategories.slice(0, 2).join(', ')} e mais ${categories.length - 2}`;
}

// Brazilian document validation utilities
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove all non-numeric characters
  const numbers = cpf.replace(/\D/g, '');
  
  // Check if it has 11 digits
  if (numbers.length !== 11) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate CPF check digits
  let sum = 0;
  let remainder;
  
  // Validate first check digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(9, 10))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(numbers.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers.substring(10, 11))) return false;
  
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '');
  
  // Check if it has 14 digits
  if (numbers.length !== 14) return false;
  
  // Check for repeated digits
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate CNPJ check digits
  let length = numbers.length - 2;
  let numberSequence = numbers.substring(0, length);
  const digits = numbers.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  // Validate first check digit
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numberSequence.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Validate second check digit
  length = length + 1;
  numberSequence = numbers.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numberSequence.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

export function validateCPFOrCNPJ(document: string): boolean {
  if (!document) return true; // Optional field
  
  const numbers = document.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return validateCPF(document);
  } else if (numbers.length === 14) {
    return validateCNPJ(document);
  }
  
  return false;
}

export function formatCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return cnpj;
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCPFOrCNPJ(document: string): string {
  if (!document) return '';
  
  const numbers = document.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return formatCPF(document);
  } else if (numbers.length === 14) {
    return formatCNPJ(document);
  }
  
  return document;
}

export function getDocumentType(document: string): 'CPF' | 'CNPJ' | 'INVALID' {
  if (!document) return 'INVALID';
  
  const numbers = document.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return validateCPF(document) ? 'CPF' : 'INVALID';
  } else if (numbers.length === 14) {
    return validateCNPJ(document) ? 'CNPJ' : 'INVALID';
  }
  
  return 'INVALID';
}

// CEP validation and formatting
export function validateCEP(cep: string): boolean {
  if (!cep) return true; // Optional field
  const numbers = cep.replace(/\D/g, '');
  return numbers.length === 8;
}

export function formatCEP(cep: string): string {
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length !== 8) return cep;
  return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Address formatting
export function formatFullAddress(supplier: Supplier): string {
  const parts: string[] = [];
  
  if (supplier.endereco) {
    let street = supplier.endereco;
    if (supplier.numero) {
      street += `, ${supplier.numero}`;
    }
    parts.push(street);
  }
  
  if (supplier.complemento) {
    parts.push(supplier.complemento);
  }
  
  if (supplier.bairro) {
    parts.push(supplier.bairro);
  }
  
  if (supplier.cidade && supplier.estado) {
    parts.push(`${supplier.cidade} - ${supplier.estado}`);
  } else if (supplier.cidade) {
    parts.push(supplier.cidade);
  } else if (supplier.estado) {
    parts.push(supplier.estado);
  }
  
  if (supplier.cep) {
    parts.push(`CEP: ${formatCEP(supplier.cep)}`);
  }
  
  // Fallback to legacy address field
  if (parts.length === 0 && supplier.address) {
    return supplier.address;
  }
  
  return parts.join(', ');
}