import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchRecipes,
  fetchRecipe,
  createRecipe,
  updateRecipe,
  checkCircularDependency,
} from '@/lib/recipes';
import * as FirebaseFirestore from 'firebase/firestore';
import { mockRecipes, factories } from '../mocks/data';

// Mock Firebase
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('@/lib/ingredients');
vi.mock('@/lib/recipeSettings');

describe('Recipes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchRecipes', () => {
    it('should fetch all active recipes', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'recipe-1',
            data: () => ({
              name: 'Simple Cake',
              description: 'A basic cake',
              category: 'cakes',
              difficulty: 'easy',
              generatedAmount: 1000,
              generatedUnit: 'g',
              servings: 10,
              preparationTime: 60,
              recipeItems: [],
              instructions: [],
              costPerServing: 5.0,
              totalCost: 50.0,
              laborCost: 10.0,
              suggestedPrice: 15.0,
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              createdBy: 'admin',
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchRecipes();

      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].name).toBe('Simple Cake');
      expect(result.total).toBe(1);
    });

    it('should filter recipes by category', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'recipe-1',
            data: () => ({
              name: 'Cake',
              category: 'cakes',
              difficulty: 'easy',
              generatedAmount: 1000,
              servings: 10,
              preparationTime: 0,
              recipeItems: [],
              instructions: [],
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              createdBy: 'admin',
            }),
          },
          {
            id: 'recipe-2',
            data: () => ({
              name: 'Bread',
              category: 'breads',
              difficulty: 'easy',
              generatedAmount: 1000,
              servings: 10,
              preparationTime: 0,
              recipeItems: [],
              instructions: [],
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              createdBy: 'admin',
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      const result = await fetchRecipes({ category: 'cakes' });

      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].category).toBe('cakes');
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(FirebaseFirestore.getDocs).mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(fetchRecipes()).rejects.toThrow('Erro ao buscar receitas');
    });
  });

  describe('fetchRecipe', () => {
    it('should fetch a single recipe by id', async () => {
      const mockDoc = {
        id: 'recipe-1',
        exists: () => true,
        data: () => ({
          name: 'Simple Cake',
          description: 'A basic cake',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 1000,
          generatedUnit: 'g',
          servings: 10,
          preparationTime: 60,
          recipeItems: [],
          instructions: [],
          costPerServing: 5.0,
          totalCost: 50.0,
          laborCost: 10.0,
          suggestedPrice: 15.0,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      const result = await fetchRecipe('recipe-1');

      expect(result.id).toBe('recipe-1');
      expect(result.name).toBe('Simple Cake');
      expect(result.costPerServing).toBe(5.0);
    });

    it('should throw error if recipe not found', async () => {
      const mockDoc = {
        id: 'recipe-1',
        exists: () => false,
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      await expect(fetchRecipe('nonexistent')).rejects.toThrow(
        'Receita não encontrada'
      );
    });
  });

  describe('createRecipe', () => {
    it('should create a new recipe with valid data', async () => {
      const mockDocRef = { id: 'recipe-new' };
      const mockCreatedDoc = {
        id: 'recipe-new',
        exists: () => true,
        data: () => ({
          name: 'New Recipe',
          description: 'New recipe description',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 1000,
          generatedUnit: 'g',
          servings: 10,
          preparationTime: 0,
          recipeItems: [],
          instructions: [],
          totalCost: 0,
          costPerServing: 0,
          laborCost: 0,
          suggestedPrice: 0,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      const mockEmptySnapshot = { empty: true, docs: [] };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockEmptySnapshot as any
      );
      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
        mockDocRef as any
      );
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockCreatedDoc as any
      );

      const result = await createRecipe({
        name: 'New Recipe',
        description: 'New recipe description',
        category: 'cakes' as any,
        difficulty: 'easy' as any,
        generatedAmount: 1000,
        generatedUnit: 'g',
        servings: 10,
        recipeItems: [],
        instructions: [],
      });

      expect(result.name).toBe('New Recipe');
      expect(result.servings).toBe(10);
      expect(FirebaseFirestore.addDoc).toHaveBeenCalled();
    });

    it('should throw error if recipe name is missing', async () => {
      await expect(
        createRecipe({
          name: '',
          category: 'cakes' as any,
          difficulty: 'easy' as any,
          generatedAmount: 1000,
          servings: 10,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Nome da receita é obrigatório');
    });

    it('should throw error if category is missing', async () => {
      await expect(
        createRecipe({
          name: 'Test',
          category: undefined as any,
          difficulty: 'easy' as any,
          generatedAmount: 1000,
          servings: 10,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Categoria é obrigatória');
    });

    it('should throw error if difficulty is missing', async () => {
      await expect(
        createRecipe({
          name: 'Test',
          category: 'cakes' as any,
          difficulty: undefined as any,
          generatedAmount: 1000,
          servings: 10,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Dificuldade é obrigatória');
    });

    it('should throw error if generated amount is invalid', async () => {
      await expect(
        createRecipe({
          name: 'Test',
          category: 'cakes' as any,
          difficulty: 'easy' as any,
          generatedAmount: 0,
          servings: 10,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Quantidade gerada deve ser maior que zero');
    });

    it('should throw error if servings is invalid', async () => {
      await expect(
        createRecipe({
          name: 'Test',
          category: 'cakes' as any,
          difficulty: 'easy' as any,
          generatedAmount: 1000,
          servings: 0,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Número de porções deve ser maior que zero');
    });

    it('should throw error if recipe with same name already exists', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'existing' }],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      await expect(
        createRecipe({
          name: 'Existing',
          category: 'cakes' as any,
          difficulty: 'easy' as any,
          generatedAmount: 1000,
          servings: 10,
          recipeItems: [],
          instructions: [],
        })
      ).rejects.toThrow('Já existe uma receita com esse nome');
    });

    it('should calculate preparation time from instructions', async () => {
      const mockDocRef = { id: 'recipe-new' };
      const mockCreatedDoc = {
        id: 'recipe-new',
        exists: () => true,
        data: () => ({
          name: 'Timed Recipe',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 1000,
          servings: 10,
          preparationTime: 120, // 60 + 60 from instructions
          recipeItems: [],
          instructions: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      const mockEmptySnapshot = { empty: true, docs: [] };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockEmptySnapshot as any
      );
      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
        mockDocRef as any
      );
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockCreatedDoc as any
      );

      const result = await createRecipe({
        name: 'Timed Recipe',
        category: 'cakes' as any,
        difficulty: 'easy' as any,
        generatedAmount: 1000,
        servings: 10,
        recipeItems: [],
        instructions: [
          { step: 1, description: 'Mix', timeMinutes: 60 },
          { step: 2, description: 'Bake', timeMinutes: 60 },
        ] as any,
      });

      expect(result.preparationTime).toBe(120);
    });
  });

  describe('updateRecipe', () => {
    it('should update recipe with valid data', async () => {
      const mockUpdatedDoc = {
        id: 'recipe-1',
        exists: () => true,
        data: () => ({
          name: 'Updated Recipe',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 1000,
          servings: 10,
          preparationTime: 60,
          recipeItems: [],
          instructions: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      const mockEmptySnapshot = { empty: true, docs: [] };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockUpdatedDoc as any);
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockEmptySnapshot as any
      );

      const result = await updateRecipe({
        id: 'recipe-1',
        name: 'Updated Recipe',
      });

      expect(result.name).toBe('Updated Recipe');
      expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should throw error if recipe name is empty', async () => {
      await expect(
        updateRecipe({
          id: 'recipe-1',
          name: '',
        })
      ).rejects.toThrow('Nome da receita é obrigatório');
    });

    it('should throw error if generated amount is invalid', async () => {
      await expect(
        updateRecipe({
          id: 'recipe-1',
          generatedAmount: 0,
        })
      ).rejects.toThrow('Quantidade gerada deve ser maior que zero');
    });

    it('should throw error if servings is invalid', async () => {
      await expect(
        updateRecipe({
          id: 'recipe-1',
          servings: -5,
        })
      ).rejects.toThrow('Número de porções deve ser maior que zero');
    });
  });

  describe('checkCircularDependency', () => {
    it('should detect no circular dependency for valid sub-recipe', async () => {
      const mockSubRecipeDoc = {
        id: 'sub-recipe-1',
        exists: () => true,
        data: () => ({
          name: 'Sub Recipe',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 500,
          servings: 5,
          recipeItems: [],
          instructions: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockSubRecipeDoc as any
      );

      const result = await checkCircularDependency('recipe-1', 'sub-recipe-1');

      expect(result.hasCircularDependency).toBe(false);
    });

    it('should return false on error to avoid blocking operations', async () => {
      vi.mocked(FirebaseFirestore.getDoc).mockRejectedValue(
        new Error('Firestore error')
      );

      const result = await checkCircularDependency('recipe-1', 'sub-recipe-1');

      expect(result.hasCircularDependency).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('Recipe Cost Calculation', () => {
    it('should calculate portion size from generated amount and servings', async () => {
      const mockDoc = {
        id: 'recipe-1',
        exists: () => true,
        data: () => ({
          name: 'Recipe',
          generatedAmount: 1000,
          servings: 10,
          category: 'cakes',
          difficulty: 'easy',
          preparationTime: 0,
          recipeItems: [],
          instructions: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      const result = await fetchRecipe('recipe-1');

      expect(result.portionSize).toBe(100); // 1000 / 10
    });
  });

  describe('Legacy Ingredients Conversion', () => {
    it('should convert legacy ingredients to recipe items', async () => {
      const mockDoc = {
        id: 'recipe-1',
        exists: () => true,
        data: () => ({
          name: 'Recipe',
          category: 'cakes',
          difficulty: 'easy',
          generatedAmount: 1000,
          servings: 10,
          preparationTime: 0,
          ingredients: [
            {
              id: 'ing-1',
              ingredientId: 'flour-id',
              ingredientName: 'Flour',
              quantity: 500,
              unit: 'g',
            },
          ],
          instructions: [],
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          createdBy: 'admin',
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      const result = await fetchRecipe('recipe-1');

      expect(result.recipeItems).toHaveLength(1);
      expect(result.recipeItems[0].ingredientName).toBe('Flour');
    });
  });
});
