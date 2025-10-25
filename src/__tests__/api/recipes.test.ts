import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/recipes/route';
import { GET as GET_BY_ID, PUT, DELETE as DELETE_BY_ID } from '@/app/api/recipes/[id]/route';
import * as recipesLib from '@/lib/recipes';
import { NextRequest } from 'next/server';
import { mockRecipes, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/lib/recipes');

describe('Recipes API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/recipes', () => {
    it('should fetch all recipes successfully', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipes).toEqual(mockRecipes);
      expect(data.count).toBe(mockRecipes.length);
    });

    it('should filter recipes by category', async () => {
      const filtered = mockRecipes.slice(0, 1);
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: filtered,
        total: 1
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?category=pastries');
      const response = await GET(request);
      const data = await response.json();

      expect(data.recipes).toEqual(filtered);
      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'pastries' })
      );
    });

    it('should filter recipes by difficulty', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?difficulty=easy');
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ difficulty: 'easy' })
      );
    });

    it('should filter recipes by max cost per serving', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?maxCostPerServing=10.50');
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ maxCostPerServing: 10.50 })
      );
    });

    it('should filter recipes by max preparation time', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?maxPreparationTime=60');
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ maxPreparationTime: 60 })
      );
    });

    it('should search recipes by name', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?search=pao');
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'pao' })
      );
    });

    it('should filter recipes by ingredient', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest('http://localhost:3001/api/recipes?ingredientId=ing1');
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({ ingredientId: 'ing1' })
      );
    });

    it('should handle multiple filters', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: mockRecipes,
        total: mockRecipes.length
      });

      const request = new NextRequest(
        'http://localhost:3001/api/recipes?category=pastries&difficulty=easy&maxCostPerServing=10'
      );
      const response = await GET(request);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'pastries',
          difficulty: 'easy',
          maxCostPerServing: 10
        })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipes).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should return empty recipes when none exist', async () => {
      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: [],
        total: 0
      });

      const request = new NextRequest('http://localhost:3001/api/recipes');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(0);
      expect(data.recipes).toEqual([]);
    });
  });

  describe('POST /api/recipes', () => {
    it('should create recipe successfully', async () => {
      const newRecipe = factories.recipe();
      vi.mocked(recipesLib.createRecipe).mockResolvedValue(newRecipe);

      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify(newRecipe)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.recipe).toEqual(newRecipe);
    });

    it('should require recipe name', async () => {
      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          category: 'pastries',
          difficulty: 'easy'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should require recipe category', async () => {
      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          difficulty: 'easy'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should require recipe difficulty', async () => {
      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Recipe',
          category: 'pastries'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should create recipe with default values', async () => {
      const recipeData = {
        name: 'Test Recipe',
        category: 'pastries',
        difficulty: 'easy'
      };

      const newRecipe = factories.recipe(recipeData);
      vi.mocked(recipesLib.createRecipe).mockResolvedValue(newRecipe);

      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.recipe.generatedAmount).toBeDefined();
      expect(data.recipe.servings).toBeDefined();
    });

    it('should handle recipe creation errors', async () => {
      vi.mocked(recipesLib.createRecipe).mockRejectedValue(
        new Error('Cannot create recipe')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          category: 'pastries',
          difficulty: 'easy'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3001/api/recipes', {
        method: 'POST',
        body: 'invalid json'
      });

      await expect(POST(request)).rejects.toThrow();
    });
  });

  describe('GET /api/recipes/[id]', () => {
    it('should fetch single recipe by id', async () => {
      const recipe = mockRecipes[0];
      vi.mocked(recipesLib.fetchRecipe).mockResolvedValue(recipe);

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1');
      const response = await GET_BY_ID(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipe).toEqual(recipe);
    });

    it('should return 404 if recipe not found', async () => {
      vi.mocked(recipesLib.fetchRecipe).mockRejectedValue(
        new Error('Receita não encontrada')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/nonexistent');
      const response = await GET_BY_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should handle database errors', async () => {
      vi.mocked(recipesLib.fetchRecipe).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1');
      const response = await GET_BY_ID(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/recipes/[id]', () => {
    it('should update recipe successfully', async () => {
      const updated = {
        ...mockRecipes[0],
        name: 'Updated Recipe'
      };
      vi.mocked(recipesLib.updateRecipe).mockResolvedValue(updated);

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Recipe' })
      });

      const response = await PUT(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recipe.name).toBe('Updated Recipe');
    });

    it('should handle partial updates', async () => {
      const updated = {
        ...mockRecipes[0],
        difficulty: 'hard'
      };
      vi.mocked(recipesLib.updateRecipe).mockResolvedValue(updated);

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'PUT',
        body: JSON.stringify({ difficulty: 'hard' })
      });

      const response = await PUT(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.recipe.difficulty).toBe('hard');
    });

    it('should return 404 if recipe not found', async () => {
      vi.mocked(recipesLib.updateRecipe).mockRejectedValue(
        new Error('Receita não encontrada')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' })
      });

      const response = await PUT(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle update errors', async () => {
      vi.mocked(recipesLib.updateRecipe).mockRejectedValue(
        new Error('Circular dependency detected')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'PUT',
        body: JSON.stringify({ recipeItems: [] })
      });

      const response = await PUT(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/recipes/[id]', () => {
    it('should delete recipe by id', async () => {
      vi.mocked(recipesLib.deleteRecipe).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(vi.mocked(recipesLib.deleteRecipe)).toHaveBeenCalledWith('rec1');
    });

    it('should return 404 if recipe not found', async () => {
      vi.mocked(recipesLib.deleteRecipe).mockRejectedValue(
        new Error('Receita não encontrada')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/nonexistent', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle deletion errors', async () => {
      vi.mocked(recipesLib.deleteRecipe).mockRejectedValue(
        new Error('Cannot delete recipe in use')
      );

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should perform soft delete', async () => {
      vi.mocked(recipesLib.deleteRecipe).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/recipes/rec1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'rec1' } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('removida');
    });
  });
});
