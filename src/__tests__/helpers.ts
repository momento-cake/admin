import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ReactElement } from 'react';
import { vi } from 'vitest';

// Custom render function with common providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { ...options });
}

// Create a user event instance for testing
export function createUser() {
  return userEvent.setup();
}

// Wait for async operations
export async function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock fetch responses
export function mockFetchResponse(data: any, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// Mock fetch error response
export function mockFetchError(message = 'Network error', status = 500) {
  return Promise.resolve(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// Create mock form data
export function createMockFormData(data: Record<string, any>) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
}

// Wait for element to appear (with timeout)
export async function waitForElement(
  callback: () => HTMLElement | null,
  timeout = 3000,
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = callback();
    if (element) return element;
    await waitForAsync(100);
  }
  throw new Error('Element not found within timeout');
}

// Mock local storage
export function setupLocalStorageMock() {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

// Mock session storage
export function setupSessionStorageMock() {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
  };
}

// Create a promise that can be resolved/rejected externally
export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// Mock debounce for testing
export function createMockDebounce() {
  return (fn: (...args: any[]) => any, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };
}

// Mock API response factory
export function createApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: () => createApiResponse(data, status),
  };
}

// Wait for all pending promises
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

// Create a spy on console methods
export function createConsoleSpy(method: 'log' | 'error' | 'warn' = 'log') {
  const originalMethod = console[method];
  const calls: any[] = [];

  console[method] = vi.fn((...args: any[]) => {
    calls.push(args);
  });

  return {
    calls,
    restore: () => {
      console[method] = originalMethod;
    },
    clear: () => {
      calls.length = 0;
    },
  };
}

// Create a spy on window methods
export function createWindowSpy(method: keyof Window) {
  const original = window[method];
  const calls: any[] = [];

  window[method] = vi.fn((...args: any[]) => {
    calls.push(args);
    return original;
  });

  return {
    calls,
    restore: () => {
      window[method] = original;
    },
    clear: () => {
      calls.length = 0;
    },
  };
}

// Common test data generators
export const testDataFactory = {
  ingredient: (overrides = {}) => ({
    id: 'ingredient-1',
    name: 'Test Ingredient',
    unit: 'kg',
    currentPrice: 10.0,
    supplier: 'Test Supplier',
    lastUpdated: new Date(),
    ...overrides,
  }),

  recipe: (overrides = {}) => ({
    id: 'recipe-1',
    name: 'Test Recipe',
    description: 'Test Description',
    ingredients: [],
    totalCost: 0,
    yield: 1,
    costPerUnit: 0,
    ...overrides,
  }),

  supplier: (overrides = {}) => ({
    id: 'supplier-1',
    name: 'Test Supplier',
    email: 'test@supplier.com',
    phone: '1234567890',
    ...overrides,
  }),

  user: (overrides = {}) => ({
    uid: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'viewer',
    ...overrides,
  }),
};
