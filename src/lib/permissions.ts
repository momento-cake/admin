import { UserRole } from '@/types';

/**
 * Feature keys that map to navigation sections
 */
export type FeatureKey =
  | 'dashboard'
  | 'users'
  | 'clients'
  | 'ingredients'
  | 'recipes'
  | 'products'
  | 'packaging'
  | 'orders'
  | 'reports'
  | 'settings';

/**
 * Maps features to allowed roles
 */
export const FEATURE_PERMISSIONS: Record<FeatureKey, UserRole[]> = {
  dashboard: ['admin', 'atendente'],
  clients: ['admin', 'atendente'],
  users: ['admin'],
  ingredients: ['admin'],
  recipes: ['admin'],
  products: ['admin'],
  packaging: ['admin'],
  orders: ['admin'],
  reports: ['admin'],
  settings: ['admin'],
};

/**
 * Maps URL paths to feature keys
 */
export const PATH_TO_FEATURE: Record<string, FeatureKey> = {
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/users/active': 'users',
  '/users/invitations': 'users',
  '/clients': 'clients',
  '/ingredients': 'ingredients',
  '/ingredients/inventory': 'ingredients',
  '/ingredients/suppliers': 'ingredients',
  '/recipes': 'recipes',
  '/products': 'products',
  '/packaging': 'packaging',
  '/orders': 'orders',
  '/reports': 'reports',
  '/settings': 'settings',
};

/**
 * Check if a role can access a specific feature
 */
export function canAccessFeature(role: UserRole, feature: FeatureKey): boolean {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false;
}

/**
 * Check if a role can access a specific path
 */
export function canAccessPath(role: UserRole, path: string): boolean {
  // Normalize path: remove trailing slash
  const normalizedPath = path.replace(/\/$/, '');

  // Direct match
  if (PATH_TO_FEATURE[normalizedPath]) {
    return canAccessFeature(role, PATH_TO_FEATURE[normalizedPath]);
  }

  // Check parent paths (for nested routes like /clients/123)
  const pathParts = normalizedPath.split('/');
  while (pathParts.length > 1) {
    pathParts.pop();
    const parentPath = pathParts.join('/');
    if (PATH_TO_FEATURE[parentPath]) {
      return canAccessFeature(role, PATH_TO_FEATURE[parentPath]);
    }
  }

  // Default to allowed (for routes not in the map, e.g., /login, /register)
  return true;
}

/**
 * Get the default redirect path for a role
 */
export function getDefaultRedirectPath(role: UserRole): string {
  if (role === 'atendente') {
    return '/clients';
  }
  return '/dashboard';
}

/**
 * Get all accessible features for a role
 */
export function getAccessibleFeatures(role: UserRole): FeatureKey[] {
  return Object.entries(FEATURE_PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([feature]) => feature as FeatureKey);
}
