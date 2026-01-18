import { UserRole, UserModel } from '@/types';

// ============================================================================
// FEATURE & ACTION DEFINITIONS
// ============================================================================

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
 * Action types for granular permission control
 */
export type ActionKey = 'view' | 'create' | 'update' | 'delete';

/**
 * All available actions
 */
export const ALL_ACTIONS: ActionKey[] = ['view', 'create', 'update', 'delete'];

/**
 * Feature permission configuration
 */
export interface FeaturePermission {
  enabled: boolean;
  actions: ActionKey[];
}

/**
 * Custom permissions map for a user
 */
export type CustomPermissions = Partial<Record<FeatureKey, FeaturePermission>>;

/**
 * Feature metadata for UI display
 */
export interface FeatureMetadata {
  key: FeatureKey;
  label: string;
  description: string;
  availableActions: ActionKey[];
}

/**
 * All features with their metadata
 */
export const FEATURE_METADATA: FeatureMetadata[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel principal com visão geral', availableActions: ['view'] },
  { key: 'users', label: 'Usuários', description: 'Gerenciamento de usuários e convites', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'clients', label: 'Clientes', description: 'Cadastro e gestão de clientes', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'ingredients', label: 'Ingredientes', description: 'Estoque e fornecedores de ingredientes', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'recipes', label: 'Receitas', description: 'Cadastro de receitas e custos', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'products', label: 'Produtos', description: 'Catálogo de produtos e categorias', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'packaging', label: 'Embalagens', description: 'Estoque de embalagens', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'orders', label: 'Pedidos', description: 'Gestão de pedidos', availableActions: ['view', 'create', 'update', 'delete'] },
  { key: 'reports', label: 'Relatórios', description: 'Relatórios e análises', availableActions: ['view'] },
  { key: 'settings', label: 'Configurações', description: 'Configurações do sistema', availableActions: ['view', 'update'] },
];

/**
 * Action labels for UI display
 */
export const ACTION_LABELS: Record<ActionKey, string> = {
  view: 'Visualizar',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
};

// ============================================================================
// DEFAULT ROLE PERMISSIONS
// ============================================================================

/**
 * Default permissions for atendente role
 * Admin role always has ALL permissions - no defaults needed
 */
export const DEFAULT_ATENDENTE_PERMISSIONS: CustomPermissions = {
  dashboard: { enabled: true, actions: ['view'] },
  clients: { enabled: true, actions: ['view', 'create', 'update'] },
  // All other features are disabled by default for atendente
};

/**
 * All features available in the system
 */
export const ALL_FEATURES: FeatureKey[] = [
  'dashboard', 'users', 'clients', 'ingredients', 'recipes',
  'products', 'packaging', 'orders', 'reports', 'settings'
];

// ============================================================================
// PATH MAPPING
// ============================================================================

/**
 * Maps URL paths to feature keys
 */
export const PATH_TO_FEATURE: Record<string, FeatureKey> = {
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/users/active': 'users',
  '/users/invitations': 'users',
  '/clients': 'clients',
  '/clients/special-dates': 'clients',
  '/ingredients': 'ingredients',
  '/ingredients/inventory': 'ingredients',
  '/ingredients/suppliers': 'ingredients',
  '/recipes': 'recipes',
  '/recipes/list': 'recipes',
  '/products': 'products',
  '/products/categories': 'products',
  '/packaging': 'packaging',
  '/packaging/inventory': 'packaging',
  '/orders': 'orders',
  '/reports': 'reports',
  '/settings': 'settings',
};

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

/**
 * Get effective permissions for a user
 * - Admin: ALL features with ALL actions
 * - Atendente: Default permissions + custom overrides
 */
export function getEffectivePermissions(user: UserModel | null): CustomPermissions {
  if (!user) return {};

  const role = user.role?.type;

  // Admin has ALL permissions - cannot be restricted
  if (role === 'admin') {
    const allPermissions: CustomPermissions = {};
    for (const feature of ALL_FEATURES) {
      const metadata = FEATURE_METADATA.find(f => f.key === feature);
      allPermissions[feature] = {
        enabled: true,
        actions: metadata?.availableActions || ALL_ACTIONS
      };
    }
    return allPermissions;
  }

  // Atendente: Start with defaults, apply custom overrides
  const permissions: CustomPermissions = { ...DEFAULT_ATENDENTE_PERMISSIONS };

  if (user.customPermissions) {
    for (const [feature, permission] of Object.entries(user.customPermissions)) {
      if (permission) {
        permissions[feature as FeatureKey] = permission;
      }
    }
  }

  return permissions;
}

/**
 * Check if a user can access a specific feature
 */
export function canAccessFeature(user: UserModel | null, feature: FeatureKey): boolean {
  const permissions = getEffectivePermissions(user);
  return permissions[feature]?.enabled ?? false;
}

/**
 * Check if a user can perform a specific action on a feature
 */
export function canPerformAction(user: UserModel | null, feature: FeatureKey, action: ActionKey): boolean {
  const permissions = getEffectivePermissions(user);
  const featurePermission = permissions[feature];

  if (!featurePermission?.enabled) return false;
  return featurePermission.actions.includes(action);
}

/**
 * Check if a user can access a specific path
 */
export function canAccessPath(user: UserModel | null, path: string): boolean {
  // Normalize path: remove trailing slash
  const normalizedPath = path.replace(/\/$/, '');

  // Direct match
  if (PATH_TO_FEATURE[normalizedPath]) {
    return canAccessFeature(user, PATH_TO_FEATURE[normalizedPath]);
  }

  // Check parent paths (for nested routes like /clients/123)
  const pathParts = normalizedPath.split('/');
  while (pathParts.length > 1) {
    pathParts.pop();
    const parentPath = pathParts.join('/');
    if (PATH_TO_FEATURE[parentPath]) {
      return canAccessFeature(user, PATH_TO_FEATURE[parentPath]);
    }
  }

  // Default to allowed (for routes not in the map, e.g., /login, /register)
  return true;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use canAccessFeature(user, feature) instead
 */
export function canAccessFeatureByRole(role: UserRole, feature: FeatureKey): boolean {
  if (role === 'admin') return true;
  return DEFAULT_ATENDENTE_PERMISSIONS[feature]?.enabled ?? false;
}

/**
 * Get the default redirect path for a user
 */
export function getDefaultRedirectPath(user: UserModel | null): string {
  if (!user) return '/login';

  if (user.role?.type === 'admin') {
    return '/dashboard';
  }

  // For atendente, redirect to first accessible feature
  const permissions = getEffectivePermissions(user);

  if (permissions.dashboard?.enabled) return '/dashboard';
  if (permissions.clients?.enabled) return '/clients';

  // Fallback
  return '/dashboard';
}

/**
 * Get all accessible features for a user
 */
export function getAccessibleFeatures(user: UserModel | null): FeatureKey[] {
  const permissions = getEffectivePermissions(user);
  return Object.entries(permissions)
    .filter(([, permission]) => permission?.enabled)
    .map(([feature]) => feature as FeatureKey);
}

// ============================================================================
// ADMIN PERMISSION MANAGEMENT
// ============================================================================

/**
 * Check if an admin can modify another user's permissions
 * - Admins cannot modify other admins
 * - Admins can only modify atendente users
 */
export function canModifyUserPermissions(adminUser: UserModel | null, targetUser: UserModel): boolean {
  // Must be an admin to modify permissions
  if (!adminUser || adminUser.role?.type !== 'admin') return false;

  // Cannot modify other admins
  if (targetUser.role?.type === 'admin') return false;

  // Cannot modify yourself (role change)
  if (adminUser.uid === targetUser.uid) return false;

  return true;
}

/**
 * Get the features that can be customized for a user
 * Only returns features that are NOT enabled by default for their role
 */
export function getCustomizableFeatures(user: UserModel): FeatureMetadata[] {
  // Admins cannot be customized
  if (user.role?.type === 'admin') return [];

  // For atendente, return all features (they can be enabled/disabled)
  return FEATURE_METADATA.filter(f => f.key !== 'users'); // Users management always admin-only
}

/**
 * Validate custom permissions before saving
 * Returns error message if invalid, null if valid
 */
export function validateCustomPermissions(permissions: CustomPermissions): string | null {
  for (const [feature, permission] of Object.entries(permissions)) {
    if (!permission) continue;

    const metadata = FEATURE_METADATA.find(f => f.key === feature);
    if (!metadata) {
      return `Feature desconhecida: ${feature}`;
    }

    // Validate actions are valid for this feature
    for (const action of permission.actions) {
      if (!metadata.availableActions.includes(action)) {
        return `Ação "${action}" não é válida para ${metadata.label}`;
      }
    }

    // Users feature cannot be enabled for non-admins
    if (feature === 'users' && permission.enabled) {
      return 'Gerenciamento de usuários é exclusivo para administradores';
    }
  }

  return null;
}
