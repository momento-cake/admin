import { vi } from 'vitest';

// Mock user objects
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  photoURL: null,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  phoneNumber: null,
  getIdToken: vi.fn().mockResolvedValue('test-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'test-token',
    claims: { admin: true },
    signInProvider: 'password',
    signInTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    issuedAtTime: new Date().toISOString(),
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn(() => ({ uid: 'test-user-123', email: 'test@example.com' })),
  delete: vi.fn().mockResolvedValue(undefined),
};

export const mockAdminUser = {
  ...mockUser,
  email: 'admin@momentocake.com.br',
  displayName: 'Admin User',
};

// Mock Firebase Auth
export const mockAuth = {
  currentUser: mockUser,
  app: {},
};

// Mock Firestore operations
export const mockFirebaseError = {
  code: 'firestore/error',
  message: 'Firestore operation failed',
};

export const mockDocumentReference = {
  id: 'doc-123',
  path: 'collection/doc-123',
  parent: { path: 'collection' },
  firebaseKey: 'key-123',
};

export const mockQuerySnapshot = {
  empty: false,
  size: 1,
  docs: [
    {
      id: 'doc-123',
      exists: true,
      data: () => ({ name: 'Test Document' }),
      ref: mockDocumentReference,
    },
  ],
  forEach: vi.fn(),
  docChanges: () => [],
};

export const mockDocumentSnapshot = {
  id: 'doc-123',
  exists: true,
  ref: mockDocumentReference,
  data: () => ({ name: 'Test Document' }),
};

// Mock Firestore collection/document references
export const mockCollectionReference = vi.fn().mockReturnValue({
  doc: vi.fn().mockReturnValue(mockDocumentReference),
  add: vi.fn().mockResolvedValue(mockDocumentReference),
  getDocs: vi.fn().mockResolvedValue(mockQuerySnapshot),
});

export const mockDocRef = vi.fn().mockReturnValue({
  get: vi.fn().mockResolvedValue(mockDocumentSnapshot),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
});

// Mock Firestore instance
export const mockFirestore = {
  collection: mockCollectionReference,
  doc: mockDocRef,
  settings: vi.fn(),
  enableNetwork: vi.fn().mockResolvedValue(undefined),
  disableNetwork: vi.fn().mockResolvedValue(undefined),
};

// Helper to create mock user with custom properties
export function createMockUser(overrides = {}) {
  return { ...mockUser, ...overrides };
}

// Helper to create mock ingredient
export function createMockIngredient(overrides = {}) {
  return {
    id: 'ingredient-123',
    name: 'Flour',
    unit: 'kg',
    currentPrice: 10.5,
    supplier: 'Test Supplier',
    lastUpdated: new Date(),
    priceHistory: [
      { date: new Date(), price: 10.5 },
    ],
    ...overrides,
  };
}

// Helper to create mock recipe
export function createMockRecipe(overrides = {}) {
  return {
    id: 'recipe-123',
    name: 'Test Recipe',
    description: 'A test recipe',
    ingredients: [
      {
        id: 'ingredient-123',
        name: 'Flour',
        quantity: 500,
        unit: 'g',
        price: 10.5,
      },
    ],
    totalCost: 10.5,
    yield: 10,
    costPerUnit: 1.05,
    lastUpdated: new Date(),
    ...overrides,
  };
}

// Helper to create mock supplier
export function createMockSupplier(overrides = {}) {
  return {
    id: 'supplier-123',
    name: 'Test Supplier',
    email: 'supplier@example.com',
    phone: '123456789',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'Test Country',
    ...overrides,
  };
}

// Helper to reset all mocks
export function resetAllMocks() {
  vi.clearAllMocks();
}
