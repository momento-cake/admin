// Test data fixtures and factories for unit tests

// Note: These mocks use simplified types for testing purposes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockIngredients: any[] = [
  {
    id: 'ing-1',
    name: 'Flour',
    unit: 'kg',
    currentPrice: 8.5,
    supplier: 'supplier-1',
    lastUpdated: new Date('2025-01-01'),
    category: 'Dry Goods',
  },
  {
    id: 'ing-2',
    name: 'Sugar',
    unit: 'kg',
    currentPrice: 5.2,
    supplier: 'supplier-1',
    lastUpdated: new Date('2025-01-01'),
    category: 'Dry Goods',
  },
  {
    id: 'ing-3',
    name: 'Butter',
    unit: 'kg',
    currentPrice: 12.0,
    supplier: 'supplier-2',
    lastUpdated: new Date('2025-01-01'),
    category: 'Dairy',
  },
  {
    id: 'ing-4',
    name: 'Eggs',
    unit: 'dozen',
    currentPrice: 6.5,
    supplier: 'supplier-2',
    lastUpdated: new Date('2025-01-01'),
    category: 'Dairy',
  },
  {
    id: 'ing-5',
    name: 'Vanilla Extract',
    unit: 'ml',
    currentPrice: 0.25,
    supplier: 'supplier-3',
    lastUpdated: new Date('2025-01-01'),
    category: 'Flavoring',
  },
];

export const mockRecipes = [
  {
    id: 'recipe-1',
    name: 'Simple Cake',
    description: 'A basic vanilla cake',
    ingredients: [
      { id: 'ing-1', name: 'Flour', quantity: 2, unit: 'kg', price: 8.5 },
      { id: 'ing-2', name: 'Sugar', quantity: 1, unit: 'kg', price: 5.2 },
      { id: 'ing-3', name: 'Butter', quantity: 0.5, unit: 'kg', price: 12.0 },
      { id: 'ing-4', name: 'Eggs', quantity: 1, unit: 'dozen', price: 6.5 },
      { id: 'ing-5', name: 'Vanilla Extract', quantity: 15, unit: 'ml', price: 0.25 },
    ],
    yield: 10,
    totalCost: 32.7,
    costPerUnit: 3.27,
    lastUpdated: new Date('2025-01-01'),
    notes: '',
  },
  {
    id: 'recipe-2',
    name: 'Chocolate Cake',
    description: 'Rich chocolate cake',
    ingredients: [
      { id: 'ing-1', name: 'Flour', quantity: 2.5, unit: 'kg', price: 8.5 },
      { id: 'ing-2', name: 'Sugar', quantity: 1.5, unit: 'kg', price: 5.2 },
      { id: 'ing-3', name: 'Butter', quantity: 0.75, unit: 'kg', price: 12.0 },
    ],
    yield: 12,
    totalCost: 40.5,
    costPerUnit: 3.375,
    lastUpdated: new Date('2025-01-01'),
    notes: 'Requires cocoa powder',
  },
];

export const mockSuppliers = [
  {
    id: 'supplier-1',
    name: 'Grains & Co',
    email: 'contact@grainsco.com',
    phone: '+55 11 98765-4321',
    address: 'Rua das Flores 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'Brazil',
  },
  {
    id: 'supplier-2',
    name: 'Dairy Fresh',
    email: 'info@dairyfresh.com',
    phone: '+55 11 87654-3210',
    address: 'Avenida Paulista 1000',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01311-100',
    country: 'Brazil',
  },
  {
    id: 'supplier-3',
    name: 'Gourmet Flavors',
    email: 'sales@gourmetflavors.com',
    phone: '+55 21 99999-8888',
    address: 'Rua do Comércio 456',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '20000-000',
    country: 'Brazil',
  },
];

export const mockUsers = [
  {
    uid: 'user-1',
    email: 'admin@momentocake.com.br',
    displayName: 'Admin User',
    role: 'admin',
    createdAt: new Date('2025-01-01'),
    lastLogin: new Date('2025-01-15'),
  },
  {
    uid: 'user-2',
    email: 'viewer@momentocake.com.br',
    displayName: 'Viewer User',
    role: 'viewer',
    createdAt: new Date('2025-01-02'),
    lastLogin: new Date('2025-01-14'),
  },
  {
    uid: 'user-3',
    email: 'manager@momentocake.com.br',
    displayName: 'Manager User',
    role: 'admin',
    createdAt: new Date('2025-01-03'),
    lastLogin: new Date('2025-01-13'),
  },
];

export const mockInvitations = [
  {
    id: 'inv-1',
    email: 'newuser@example.com',
    role: 'viewer',
    status: 'pending',
    invitedBy: 'user-1',
    invitedAt: new Date('2025-01-10'),
    expiresAt: new Date('2025-02-10'),
  },
  {
    id: 'inv-2',
    email: 'accepted@example.com',
    role: 'admin',
    status: 'accepted',
    invitedBy: 'user-1',
    invitedAt: new Date('2025-01-05'),
    acceptedAt: new Date('2025-01-06'),
  },
];

export const mockPriceHistory = [
  {
    id: 'price-1',
    ingredientId: 'ing-1',
    price: 8.0,
    date: new Date('2024-12-01'),
  },
  {
    id: 'price-2',
    ingredientId: 'ing-1',
    price: 8.25,
    date: new Date('2024-12-15'),
  },
  {
    id: 'price-3',
    ingredientId: 'ing-1',
    price: 8.5,
    date: new Date('2025-01-01'),
  },
  {
    id: 'price-4',
    ingredientId: 'ing-2',
    price: 4.8,
    date: new Date('2024-11-01'),
  },
  {
    id: 'price-5',
    ingredientId: 'ing-2',
    price: 5.2,
    date: new Date('2024-12-15'),
  },
];

// Factory functions for creating test data
export const factories = {
  ingredient: (overrides = {}) => ({
    id: `ing-${Math.random()}`,
    name: 'Test Ingredient',
    unit: 'kg',
    currentPrice: 10.0,
    supplier: 'supplier-1',
    lastUpdated: new Date(),
    category: 'General',
    ...overrides,
  }),

  recipe: (overrides = {}) => ({
    id: `recipe-${Math.random()}`,
    name: 'Test Recipe',
    description: 'Test recipe description',
    ingredients: [],
    yield: 10,
    totalCost: 0,
    costPerUnit: 0,
    lastUpdated: new Date(),
    notes: '',
    ...overrides,
  }),

  supplier: (overrides = {}) => ({
    id: `supplier-${Math.random()}`,
    name: 'Test Supplier',
    email: 'test@supplier.com',
    phone: '+55 11 98765-4321',
    address: 'Test Address',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345-678',
    country: 'Brazil',
    ...overrides,
  }),

  user: (overrides = {}) => ({
    uid: `user-${Math.random()}`,
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'viewer',
    createdAt: new Date(),
    lastLogin: new Date(),
    ...overrides,
  }),

  invitation: (overrides = {}) => ({
    id: `inv-${Math.random()}`,
    email: 'invite@example.com',
    role: 'viewer',
    status: 'pending',
    invitedBy: 'user-1',
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  }),

  priceHistory: (overrides = {}) => ({
    id: `price-${Math.random()}`,
    ingredientId: 'ing-1',
    price: 10.0,
    date: new Date(),
    ...overrides,
  }),
};
