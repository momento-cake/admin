import { 
  Supplier, 
  CreateSupplierData, 
  UpdateSupplierData
} from '@/types/ingredient';

// API functions for suppliers
export async function fetchSuppliers(searchQuery?: string) {
  const searchParams = new URLSearchParams();
  
  if (searchQuery) searchParams.append('searchQuery', searchQuery);
  
  const response = await fetch(`/api/suppliers?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar fornecedores');
  }
  
  return response.json();
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  const response = await fetch(`/api/suppliers/${id}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar fornecedor');
  }
  
  return response.json();
}

export async function createSupplier(data: CreateSupplierData): Promise<Supplier> {
  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar fornecedor');
  }
  
  return response.json();
}

export async function updateSupplier(data: UpdateSupplierData): Promise<Supplier> {
  const { id, ...updateData } = data;
  
  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar fornecedor');
  }
  
  return response.json();
}

export async function deleteSupplier(id: string): Promise<void> {
  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao remover fornecedor');
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

export function formatSupplierCategories(categories: string[]): string {
  if (categories.length === 0) return 'Nenhuma categoria';
  if (categories.length === 1) return categories[0];
  if (categories.length <= 3) return categories.join(', ');
  return `${categories.slice(0, 2).join(', ')} e mais ${categories.length - 2}`;
}