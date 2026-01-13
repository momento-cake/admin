/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/ingredients/route';
import { GET as GET_BY_ID, PUT, DELETE as DELETE_BY_ID } from '@/app/api/ingredients/[id]/route';
import * as ingredientsLib from '@/lib/ingredients';
import { NextRequest } from 'next/server';
import { mockIngredients, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/lib/ingredients');
vi.mock('@/lib/validators/ingredient', () => ({
  ingredientValidation: {
    safeParse: (data: any) => ({
      success: true,
      data
    })
  },
  updateIngredientValidation: {
    safeParse: (data: any) => ({
      success: true,
      data
    })
  }
}));

describe('Ingredients API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ingredients', () => {
    it('should fetch all ingredients successfully', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(mockIngredients);

      const request = new NextRequest('http://localhost:3001/api/ingredients');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ingredients).toEqual(mockIngredients);
      expect(data.count).toBe(mockIngredients.length);
    });

    it('should filter ingredients by category', async () => {
      const filtered = mockIngredients.slice(0, 1);
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(filtered);

      const request = new NextRequest('http://localhost:3001/api/ingredients?category=grains');
      const response = await GET(request);
      const data = await response.json();

      expect(data.ingredients).toEqual(filtered);
      expect(vi.mocked(ingredientsLib.fetchIngredients)).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'grains' })
      );
    });

    it('should filter ingredients by supplier', async () => {
      const filtered = mockIngredients.slice(0, 1);
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(filtered);

      const request = new NextRequest('http://localhost:3001/api/ingredients?supplierId=sup1');
      const response = await GET(request);

      expect(vi.mocked(ingredientsLib.fetchIngredients)).toHaveBeenCalledWith(
        expect.objectContaining({ supplierId: 'sup1' })
      );
    });

    it('should filter ingredients by stock status', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(mockIngredients);

      const request = new NextRequest('http://localhost:3001/api/ingredients?stockStatus=low');
      const response = await GET(request);

      expect(vi.mocked(ingredientsLib.fetchIngredients)).toHaveBeenCalledWith(
        expect.objectContaining({ stockStatus: 'low' })
      );
    });

    it('should search ingredients by query', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(mockIngredients);

      const request = new NextRequest('http://localhost:3001/api/ingredients?searchQuery=flour');
      const response = await GET(request);

      expect(vi.mocked(ingredientsLib.fetchIngredients)).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'flour' })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.ingredients).toEqual([]);
      expect(data.error).toBeDefined();
    });

    it('should return empty array when no ingredients exist', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3001/api/ingredients');
      const response = await GET(request);
      const data = await response.json();

      expect(data.count).toBe(0);
      expect(data.ingredients).toEqual([]);
    });
  });

  describe('POST /api/ingredients', () => {
    it('should create ingredient successfully', async () => {
      const newIngredient = factories.ingredient();
      vi.mocked(ingredientsLib.createIngredient).mockResolvedValue(newIngredient);

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(newIngredient)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.ingredient).toEqual(newIngredient);
      expect(data.message).toContain('sucesso');
    });

    it('should validate ingredient data before creation', async () => {
      const invalidIngredient = { name: '', price: -10 };

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(invalidIngredient)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle duplicate ingredient creation', async () => {
      vi.mocked(ingredientsLib.createIngredient).mockRejectedValue(
        new Error('Ingredient already exists')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(mockIngredients[0])
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'POST',
        body: 'invalid json'
      });

      await expect(POST(request)).rejects.toThrow();
    });

    it('should create ingredient with minimal required fields', async () => {
      const minimal = {
        name: 'Test Flour',
        price: 5.50,
        supplierId: 'sup1',
        measurement: {
          value: 1,
          unit: 'kg'
        },
        category: 'grains'
      };

      const newIngredient = factories.ingredient(minimal);
      vi.mocked(ingredientsLib.createIngredient).mockResolvedValue(newIngredient);

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(minimal)
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(vi.mocked(ingredientsLib.createIngredient)).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/ingredients', () => {
    it('should bulk delete ingredients', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({
          ingredientIds: ['ing1', 'ing2', 'ing3']
        })
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(3);
    });

    it('should require ingredientIds array', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should not allow empty array', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({
          ingredientIds: []
        })
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should handle delete errors', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockRejectedValue(
        new Error('Cannot delete ingredient in use')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({
          ingredientIds: ['ing1']
        })
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should delete multiple ingredients in batch', async () => {
      vi.mocked(ingredientsLib.deleteIngredient)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const request = new NextRequest('http://localhost:3001/api/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({
          ingredientIds: ['ing1', 'ing2', 'ing3']
        })
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(data.deletedCount).toBe(3);
      expect(vi.mocked(ingredientsLib.deleteIngredient)).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET /api/ingredients/[id]', () => {
    it('should fetch single ingredient by id', async () => {
      const ingredient = mockIngredients[0];
      vi.mocked(ingredientsLib.fetchIngredient).mockResolvedValue(ingredient);

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1');
      const response = await GET_BY_ID(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ingredient).toEqual(ingredient);
    });

    it('should return 404 if ingredient not found', async () => {
      vi.mocked(ingredientsLib.fetchIngredient).mockRejectedValue(
        new Error('Ingrediente não encontrado')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/nonexistent');
      const response = await GET_BY_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should require ingredient id', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients/');
      const response = await GET_BY_ID(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      vi.mocked(ingredientsLib.fetchIngredient).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1');
      const response = await GET_BY_ID(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/ingredients/[id]', () => {
    it('should update ingredient successfully', async () => {
      const updated = {
        ...mockIngredients[0],
        price: 10.00
      };
      vi.mocked(ingredientsLib.updateIngredient).mockResolvedValue(updated);

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'PUT',
        body: JSON.stringify({ price: 10.00 })
      });

      const response = await PUT(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ingredient.price).toBe(10.00);
    });

    it('should require ingredient id', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients/', {
        method: 'PUT',
        body: JSON.stringify({ price: 10.00 })
      });

      const response = await PUT(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should validate update data', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'PUT',
        body: JSON.stringify({ price: -10 })
      });

      const response = await PUT(request, { params: { id: 'ing1' } });

      expect(response.status).toBe(400);
    });

    it('should handle partial updates', async () => {
      const updated = {
        ...mockIngredients[0],
        currentStock: 50
      };
      vi.mocked(ingredientsLib.updateIngredient).mockResolvedValue(updated);

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'PUT',
        body: JSON.stringify({ currentStock: 50 })
      });

      const response = await PUT(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.ingredient.currentStock).toBe(50);
    });

    it('should return 404 if ingredient not found', async () => {
      vi.mocked(ingredientsLib.updateIngredient).mockRejectedValue(
        new Error('Ingrediente não encontrado')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ price: 10.00 })
      });

      const response = await PUT(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should handle server errors', async () => {
      vi.mocked(ingredientsLib.updateIngredient).mockRejectedValue(
        new Error('Internal server error')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'PUT',
        body: JSON.stringify({ price: 10.00 })
      });

      const response = await PUT(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/ingredients/[id]', () => {
    it('should delete ingredient by id', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(vi.mocked(ingredientsLib.deleteIngredient)).toHaveBeenCalledWith('ing1');
    });

    it('should require ingredient id', async () => {
      const request = new NextRequest('http://localhost:3001/api/ingredients/', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 404 if ingredient not found', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockRejectedValue(
        new Error('Ingrediente não encontrado')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/nonexistent', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should handle soft delete', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('removido');
    });

    it('should handle deletion errors', async () => {
      vi.mocked(ingredientsLib.deleteIngredient).mockRejectedValue(
        new Error('Cannot delete ingredient in use')
      );

      const request = new NextRequest('http://localhost:3001/api/ingredients/ing1', {
        method: 'DELETE'
      });

      const response = await DELETE_BY_ID(request, { params: { id: 'ing1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
