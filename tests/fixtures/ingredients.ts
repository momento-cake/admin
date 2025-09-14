import { Ingredient, IngredientCategory, IngredientUnit } from '@/types/ingredient';

/**
 * Test fixtures for ingredients management system
 */

export const testSuppliers = [
  {
    id: 'supplier-1',
    name: 'Fornecedor Teste A',
    email: 'teste-a@fornecedor.com',
    phone: '(11) 1234-5678',
    address: 'Rua Teste A, 123',
    isActive: true,
  },
  {
    id: 'supplier-2', 
    name: 'Fornecedor Teste B',
    email: 'teste-b@fornecedor.com',
    phone: '(11) 8765-4321',
    address: 'Rua Teste B, 456',
    isActive: true,
  }
];

export const testIngredients: Partial<Ingredient>[] = [
  {
    name: 'Farinha de Trigo Especial',
    description: 'Farinha de trigo tipo 1 especial para bolos',
    unit: IngredientUnit.KG,
    currentPrice: 8.50,
    currentStock: 25,
    minStock: 5,
    supplierId: 'supplier-1',
    category: IngredientCategory.FLOUR,
    allergens: ['glúten'],
    isActive: true
  },
  {
    name: 'Açúcar Cristal',
    description: 'Açúcar cristal refinado especial',
    unit: IngredientUnit.KG,
    currentPrice: 4.20,
    currentStock: 50,
    minStock: 10,
    supplierId: 'supplier-1',
    category: IngredientCategory.SUGAR,
    allergens: [],
    isActive: true
  },
  {
    name: 'Leite Integral',
    description: 'Leite integral pasteurizado',
    unit: IngredientUnit.LITER,
    currentPrice: 5.80,
    currentStock: 3, // Low stock for testing
    minStock: 15,
    supplierId: 'supplier-2',
    category: IngredientCategory.DAIRY,
    allergens: ['lactose'],
    isActive: true
  },
  {
    name: 'Ovos Grandes',
    description: 'Ovos grandes tipo extra',
    unit: IngredientUnit.UNIT,
    currentPrice: 0.75,
    currentStock: 0, // Out of stock for testing
    minStock: 30,
    supplierId: 'supplier-2',
    category: IngredientCategory.EGGS,
    allergens: ['ovo'],
    isActive: true
  },
  {
    name: 'Manteiga Sem Sal',
    description: 'Manteiga sem sal de primeira qualidade',
    unit: IngredientUnit.KG,
    currentPrice: 18.90,
    currentStock: 8,
    minStock: 3,
    supplierId: 'supplier-1',
    category: IngredientCategory.FATS,
    allergens: ['lactose'],
    isActive: true
  },
  {
    name: 'Chocolate em Pó',
    description: 'Chocolate em pó premium 70% cacau',
    unit: IngredientUnit.KG,
    currentPrice: 45.00,
    currentStock: 12,
    minStock: 2,
    supplierId: 'supplier-2',
    category: IngredientCategory.CHOCOLATE,
    allergens: ['lactose', 'soja'],
    isActive: true
  }
];

export const createIngredientFormData = {
  valid: {
    name: 'Novo Ingrediente Teste',
    description: 'Descrição do novo ingrediente para teste',
    unit: IngredientUnit.KG,
    currentPrice: '12.50',
    currentStock: '20',
    minStock: '5',
    category: IngredientCategory.OTHER,
    allergens: 'glúten, lactose',
    supplierId: 'supplier-1'
  },
  invalid: {
    name: '', // Required field empty
    description: 'Ingrediente inválido',
    unit: IngredientUnit.KG,
    currentPrice: '-5.00', // Negative price
    currentStock: '-10', // Negative stock
    minStock: '5',
    category: IngredientCategory.OTHER,
    allergens: '',
    supplierId: ''
  },
  duplicate: {
    name: 'Farinha de Trigo Especial', // Same name as existing ingredient
    description: 'Tentativa de criar duplicado',
    unit: IngredientUnit.KG,
    currentPrice: '8.50',
    currentStock: '25',
    minStock: '5',
    category: IngredientCategory.FLOUR,
    allergens: 'glúten',
    supplierId: 'supplier-1'
  }
};

export const stockMovementData = {
  add: {
    quantity: 10,
    unitCost: 8.75,
    reason: 'Compra de estoque',
    notes: 'Reposição mensal'
  },
  remove: {
    quantity: 5,
    reason: 'Uso em produção',
    notes: 'Bolo de chocolate - pedido #123'
  },
  adjust: {
    newQuantity: 15,
    reason: 'Ajuste de inventário',
    notes: 'Correção após contagem física'
  }
};

export const searchAndFilterData = {
  searchTerms: [
    'farinha',
    'açúcar',
    'chocolate',
    'teste'
  ],
  categories: [
    IngredientCategory.FLOUR,
    IngredientCategory.SUGAR,
    IngredientCategory.DAIRY,
    IngredientCategory.CHOCOLATE
  ],
  stockStatuses: [
    'good',
    'low', 
    'critical',
    'out'
  ]
};

export const ingredientUpdateData = {
  name: 'Farinha de Trigo Premium Atualizada',
  description: 'Descrição atualizada com mais detalhes',
  currentPrice: 9.75,
  minStock: 8,
  allergens: ['glúten', 'traços de soja']
};