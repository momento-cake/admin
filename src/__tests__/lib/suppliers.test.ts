import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchSuppliers,
  fetchSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/suppliers';
import * as FirebaseFirestore from 'firebase/firestore';
import { mockSuppliers, factories } from '../mocks/data';

// Mock Firebase
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('Suppliers Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSuppliers', () => {
    it('should fetch all active suppliers', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'supplier-1',
            data: () => ({
              name: 'Test Supplier',
              contactPerson: 'John Doe',
              phone: '123456789',
              email: 'supplier@example.com',
              endereco: '123 Main St',
              cidade: 'São Paulo',
              estado: 'SP',
              rating: 4.5,
              categories: ['flour', 'sugar'],
              isActive: true,
              createdAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchSuppliers();

      expect(result.suppliers).toHaveLength(1);
      expect(result.suppliers[0].name).toBe('Test Supplier');
      expect(result.total).toBe(1);
      expect(FirebaseFirestore.getDocs).toHaveBeenCalled();
    });

    it('should filter suppliers by search query', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'supplier-1',
            data: () => ({
              name: 'Flour Co',
              contactPerson: 'John Doe',
              email: 'flour@example.com',
              rating: 4.5,
              categories: [],
              isActive: true,
              createdAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'supplier-2',
            data: () => ({
              name: 'Sugar Ltd',
              contactPerson: 'Jane Smith',
              email: 'sugar@example.com',
              rating: 4.0,
              categories: [],
              isActive: true,
              createdAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchSuppliers({ searchQuery: 'flour' });

      expect(result.suppliers).toHaveLength(1);
      expect(result.suppliers[0].name).toBe('Flour Co');
    });

    it('should filter suppliers by category', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'supplier-1',
            data: () => ({
              name: 'Supplier 1',
              rating: 4.5,
              categories: ['flour'],
              isActive: true,
              createdAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'supplier-2',
            data: () => ({
              name: 'Supplier 2',
              rating: 4.0,
              categories: ['dairy'],
              isActive: true,
              createdAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchSuppliers({ category: 'flour' });

      expect(result.suppliers).toHaveLength(1);
      expect(result.suppliers[0].categories).toContain('flour');
    });

    it('should paginate suppliers correctly', async () => {
      const suppliers = Array.from({ length: 150 }, (_, i) => ({
        id: `supplier-${i}`,
        data: () => ({
          name: `Supplier ${i}`,
          rating: 4.5,
          categories: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      }));

      const mockSnapshot = {
        empty: false,
        docs: suppliers,
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchSuppliers({ page: 2, limit: 50 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.total).toBe(150);
      expect(result.totalPages).toBe(3);
      expect(result.suppliers).toHaveLength(50);
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(FirebaseFirestore.getDocs).mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(fetchSuppliers()).rejects.toThrow('Erro ao buscar fornecedores');
    });
  });

  describe('fetchSupplier', () => {
    it('should fetch a single supplier by id', async () => {
      const mockDoc = {
        id: 'supplier-1',
        exists: () => true,
        data: () => ({
          name: 'Test Supplier',
          contactPerson: 'John Doe',
          phone: '123456789',
          email: 'supplier@example.com',
          endereco: '123 Main St',
          cidade: 'São Paulo',
          estado: 'SP',
          rating: 4.5,
          categories: ['flour', 'sugar'],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      const result = await fetchSupplier('supplier-1');

      expect(result.id).toBe('supplier-1');
      expect(result.name).toBe('Test Supplier');
      expect(result.rating).toBe(4.5);
    });

    it('should throw error if supplier not found', async () => {
      const mockDoc = {
        id: 'supplier-1',
        exists: () => false,
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      await expect(fetchSupplier('nonexistent')).rejects.toThrow(
        'Fornecedor não encontrado'
      );
    });
  });

  describe('createSupplier', () => {
    it('should create a new supplier with valid data', async () => {
      const mockDocRef = { id: 'supplier-new' };
      const mockCreatedDoc = {
        id: 'supplier-new',
        exists: () => true,
        data: () => ({
          name: 'New Supplier',
          contactPerson: 'Jane Doe',
          phone: '987654321',
          email: 'new@example.com',
          endereco: '456 Main St',
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
          rating: 4.0,
          categories: ['flour'],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
        mockDocRef as any
      );
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockCreatedDoc as any
      );

      const result = await createSupplier({
        name: 'New Supplier',
        contactPerson: 'Jane Doe',
        phone: '987654321',
        email: 'new@example.com',
        endereco: '456 Main St',
        cidade: 'Rio de Janeiro',
        estado: 'RJ',
        rating: 4.0,
        categories: ['flour'],
      });

      expect(result.name).toBe('New Supplier');
      expect(result.email).toBe('new@example.com');
      expect(result.rating).toBe(4.0);
      expect(FirebaseFirestore.addDoc).toHaveBeenCalled();
    });

    it('should throw error if supplier name is missing', async () => {
      await expect(
        createSupplier({
          name: '',
          rating: 4.0,
        } as any)
      ).rejects.toThrow('Nome do fornecedor é obrigatório');
    });

    it('should throw error if rating is invalid (below 0)', async () => {
      await expect(
        createSupplier({
          name: 'Test',
          rating: -1,
        } as any)
      ).rejects.toThrow('Avaliação deve estar entre 0 e 5');
    });

    it('should throw error if rating is invalid (above 5)', async () => {
      await expect(
        createSupplier({
          name: 'Test',
          rating: 6,
        } as any)
      ).rejects.toThrow('Avaliação deve estar entre 0 e 5');
    });

    it('should throw error if email format is invalid', async () => {
      await expect(
        createSupplier({
          name: 'Test',
          email: 'invalidemail',
          rating: 4.0,
        } as any)
      ).rejects.toThrow('Formato de email inválido');
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier with valid data', async () => {
      const mockCurrentDoc = {
        id: 'supplier-1',
        exists: () => true,
        data: () => ({
          name: 'Original Supplier',
          rating: 4.0,
          categories: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      const mockUpdatedDoc = {
        id: 'supplier-1',
        exists: () => true,
        data: () => ({
          name: 'Updated Supplier',
          rating: 4.5,
          categories: ['flour'],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc)
        .mockResolvedValueOnce(mockCurrentDoc as any)
        .mockResolvedValueOnce(mockUpdatedDoc as any);

      const result = await updateSupplier({
        id: 'supplier-1',
        name: 'Updated Supplier',
        rating: 4.5,
        categories: ['flour'],
      });

      expect(result.name).toBe('Updated Supplier');
      expect(result.rating).toBe(4.5);
      expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should throw error if rating is invalid', async () => {
      await expect(
        updateSupplier({
          id: 'supplier-1',
          rating: 10,
        })
      ).rejects.toThrow('Avaliação deve estar entre 0 e 5');
    });
  });

  describe('deleteSupplier', () => {
    it('should soft delete supplier', async () => {
      await deleteSupplier('supplier-1');

      expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe('Supplier Validation', () => {
    it('should validate Brazilian address fields', async () => {
      const mockDocRef = { id: 'supplier-new' };
      const mockCreatedDoc = {
        id: 'supplier-new',
        exists: () => true,
        data: () => ({
          name: 'BR Supplier',
          cep: '01234-567',
          estado: 'SP',
          cidade: 'São Paulo',
          bairro: 'Centro',
          endereco: 'Avenida Paulista',
          numero: '1000',
          rating: 4.0,
          categories: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
        mockDocRef as any
      );
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockCreatedDoc as any
      );

      const result = await createSupplier({
        name: 'BR Supplier',
        cep: '01234-567',
        estado: 'SP',
        cidade: 'São Paulo',
        bairro: 'Centro',
        endereco: 'Avenida Paulista',
        numero: '1000',
        rating: 4.0,
      });

      expect(result.cep).toBe('01234-567');
      expect(result.estado).toBe('SP');
      expect(result.cidade).toBe('São Paulo');
    });

    it('should accept legacy address field for backward compatibility', async () => {
      const mockDocRef = { id: 'supplier-new' };
      const mockCreatedDoc = {
        id: 'supplier-new',
        exists: () => true,
        data: () => ({
          name: 'Legacy Supplier',
          address: '123 Old Street',
          rating: 4.0,
          categories: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
        mockDocRef as any
      );
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockCreatedDoc as any
      );

      const result = await createSupplier({
        name: 'Legacy Supplier',
        address: '123 Old Street',
        rating: 4.0,
      });

      expect(result.address).toBe('123 Old Street');
    });
  });
});
