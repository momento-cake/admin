# Role-Based Feature Access - Web Implementation

## Overview

This document details the web-specific implementation for role-based feature access in the Momento Cake Admin system.

## Current State Analysis

### Existing Role System
- **File**: `src/types/index.ts`
- **Current Roles**: `admin` | `viewer`
- **Storage**: Firestore `users` collection, `role.type` field

### Navigation Structure
- **File**: `src/components/layout/Sidebar.tsx`
- **Pattern**: Role-based filtering via `item.roles.includes(userRole)`

### Route Protection
- **File**: `src/middleware.ts`
- **Pattern**: Cookie-based auth + role checks

## Implementation Details

---

## Phase 1: Core Permission System

### Task 1.1: Update UserRole Type

**File**: `src/types/index.ts`

```typescript
// Before
export type UserRole = 'admin' | 'viewer';

// After
export type UserRole = 'admin' | 'atendente';
```

Also add helper type for role display:
```typescript
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  atendente: 'Atendente',
};
```

### Task 1.2: Create Permissions Module

**New File**: `src/lib/permissions.ts`

```typescript
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
  // Find matching feature for path
  const normalizedPath = path.replace(/\/$/, ''); // Remove trailing slash

  // Direct match
  if (PATH_TO_FEATURE[normalizedPath]) {
    return canAccessFeature(role, PATH_TO_FEATURE[normalizedPath]);
  }

  // Check parent paths
  const pathParts = normalizedPath.split('/');
  while (pathParts.length > 1) {
    pathParts.pop();
    const parentPath = pathParts.join('/');
    if (PATH_TO_FEATURE[parentPath]) {
      return canAccessFeature(role, PATH_TO_FEATURE[parentPath]);
    }
  }

  // Default to allowed (for routes not in the map)
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
    .filter(([_, roles]) => roles.includes(role))
    .map(([feature]) => feature as FeatureKey);
}
```

### Task 1.3: Create usePermissions Hook

**New File**: `src/hooks/usePermissions.ts`

```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  canAccessFeature,
  canAccessPath,
  getAccessibleFeatures,
  FeatureKey
} from '@/lib/permissions';

export function usePermissions() {
  const { userModel } = useAuth();
  const role = userModel?.role?.type ?? 'atendente';

  return {
    role,
    canAccess: (feature: FeatureKey) => canAccessFeature(role, feature),
    canAccessPath: (path: string) => canAccessPath(role, path),
    accessibleFeatures: getAccessibleFeatures(role),
    isAdmin: role === 'admin',
    isAtendente: role === 'atendente',
  };
}
```

### Task 1.4: Update AuthContext

**File**: `src/contexts/AuthContext.tsx`

Add permission helpers to context:
```typescript
interface AuthContextType {
  // ... existing properties
  canAccessFeature: (feature: string) => boolean;
  canAccessPath: (path: string) => boolean;
}
```

---

## Phase 2: Navigation Updates

### Task 2.1: Update Sidebar Navigation Structure

**File**: `src/components/layout/Sidebar.tsx`

Update navigation items to include feature keys:
```typescript
interface NavItem {
  name: string;
  href?: string;
  icon?: React.ComponentType;
  feature: FeatureKey;  // Add this
  submenu?: {
    name: string;
    href: string;
  }[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    feature: 'dashboard',
  },
  {
    name: 'Clientes',
    href: '/clients',
    icon: Users,
    feature: 'clients',
  },
  {
    name: 'Usuários',
    icon: UserCog,
    feature: 'users',
    submenu: [
      { name: 'Usuários Ativos', href: '/users/active' },
      { name: 'Convites', href: '/users/invitations' },
    ],
  },
  // ... other items with feature keys
];
```

### Task 2.2: Add Disabled Menu Item Styling

```typescript
// Inside Sidebar component
const { canAccess } = usePermissions();

// Render function
{navigation.map((item) => {
  const hasAccess = canAccess(item.feature);

  return (
    <div
      key={item.name}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg',
        hasAccess
          ? 'cursor-pointer hover:bg-accent'
          : 'cursor-not-allowed opacity-50'
      )}
      title={!hasAccess ? 'Acesso restrito' : undefined}
      onClick={hasAccess ? () => navigate(item.href) : undefined}
    >
      {/* ... icon and label */}
    </div>
  );
})}
```

### Task 2.3: Add Tooltip for Disabled Items

Use shadcn/ui Tooltip component:
```typescript
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Wrap disabled items
{!hasAccess ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="cursor-not-allowed opacity-50">
        {/* menu item content */}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Acesso restrito</p>
    </TooltipContent>
  </Tooltip>
) : (
  // Normal menu item
)}
```

---

## Phase 3: Route Protection

### Task 3.1: Update Middleware

**File**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessPath, getDefaultRedirectPath } from '@/lib/permissions';
import type { UserRole } from '@/types';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth cookies
  const authToken = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value as UserRole | undefined;

  // Check if route requires auth
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Redirect to login if not authenticated
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check feature access
    if (userRole && !canAccessPath(userRole, pathname)) {
      const redirectPath = getDefaultRedirectPath(userRole);
      const redirectUrl = new URL(redirectPath, request.url);
      redirectUrl.searchParams.set('access_denied', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}
```

### Task 3.2: Add Access Denied Toast

**File**: `src/app/(dashboard)/layout.tsx` or create a hook

```typescript
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function useAccessDeniedNotification() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('access_denied') === 'true') {
      toast.error('Você não tem permissão para acessar esta página');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);
}
```

---

## Phase 4: User Role Management

### Task 4.1: Create UserEditDialog Component

**New File**: `src/components/users/UserEditDialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserModel, UserRole, ROLE_LABELS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UserEditDialogProps {
  user: UserModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: UserEditDialogProps) {
  const { userModel: currentUser } = useAuth();
  const [role, setRole] = useState<UserRole>(user.role.type);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);

  const isOwnAccount = currentUser?.uid === user.uid;

  const handleSubmit = async () => {
    if (isOwnAccount && role !== user.role.type) {
      toast.error('Você não pode alterar seu próprio cargo');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'role.type': role,
        isActive,
      });

      toast.success('Usuário atualizado com sucesso');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={user.displayName || ''} disabled />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={isOwnAccount}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="atendente">{ROLE_LABELS.atendente}</SelectItem>
              </SelectContent>
            </Select>
            {isOwnAccount && (
              <p className="text-sm text-muted-foreground">
                Você não pode alterar seu próprio cargo
              </p>
            )}
          </div>

          {/* Active status toggle could go here */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 4.2: Update UsersList Component

**File**: `src/components/users/UsersList.tsx`

Add edit button and dialog:
```typescript
import { UserEditDialog } from './UserEditDialog';

// Inside component
const [editingUser, setEditingUser] = useState<UserModel | null>(null);

// In table row actions
<Button
  variant="ghost"
  size="sm"
  onClick={() => setEditingUser(user)}
>
  <Pencil className="h-4 w-4" />
</Button>

// Add dialog
{editingUser && (
  <UserEditDialog
    user={editingUser}
    open={!!editingUser}
    onOpenChange={(open) => !open && setEditingUser(null)}
    onSuccess={() => {
      // Refetch users
    }}
  />
)}
```

### Task 4.3: Update Role Display

Update role badge to use new role labels:
```typescript
import { ROLE_LABELS } from '@/types';

// In role badge
<Badge variant={user.role.type === 'admin' ? 'default' : 'secondary'}>
  {ROLE_LABELS[user.role.type]}
</Badge>
```

### Task 4.4: Update InviteUserDialog

**File**: `src/components/users/InviteUserDialog.tsx`

Update role options:
```typescript
<SelectContent>
  <SelectItem value="admin">Administrador</SelectItem>
  <SelectItem value="atendente">Atendente</SelectItem>
</SelectContent>
```

---

## Phase 5: Migration & Testing

### Task 5.1: Migrate Existing Users

Create migration script or do manually:
```typescript
// One-time migration
const usersRef = collection(db, 'users');
const viewerUsersQuery = query(usersRef, where('role.type', '==', 'viewer'));
const snapshot = await getDocs(viewerUsersQuery);

const batch = writeBatch(db);
snapshot.docs.forEach(doc => {
  batch.update(doc.ref, { 'role.type': 'atendente' });
});
await batch.commit();
```

### Task 5.2: Update Any Hardcoded References

Search for and update:
- `'viewer'` string literals
- Role validation checks
- Default role assignments

### Task 5.3: E2E Testing

Create Playwright tests:
```typescript
// tests/role-based-access.spec.ts
test.describe('Role-based access', () => {
  test('Atendente can access clients', async ({ page }) => {
    // Login as atendente
    // Navigate to /clients
    // Verify access
  });

  test('Atendente cannot access users', async ({ page }) => {
    // Login as atendente
    // Try to navigate to /users
    // Verify redirect to dashboard with toast
  });

  test('Atendente sees disabled menu items', async ({ page }) => {
    // Login as atendente
    // Check sidebar
    // Verify users/ingredients/etc are disabled
  });
});
```

---

## Validation Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build (ensures no build errors)
npm run build

# Run E2E tests
npx playwright test tests/role-based-access.spec.ts

# Development testing
npm run dev
```

## Files to Create/Modify

### New Files
- `src/lib/permissions.ts`
- `src/hooks/usePermissions.ts`
- `src/components/users/UserEditDialog.tsx`
- `tests/role-based-access.spec.ts`

### Modified Files
- `src/types/index.ts`
- `src/components/layout/Sidebar.tsx`
- `src/middleware.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/users/UsersList.tsx`
- `src/components/users/InviteUserDialog.tsx`
- `src/app/(dashboard)/layout.tsx`

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Existing `viewer` users lose access | Migration script converts to `atendente` |
| Admin locks themselves out | Prevent changing own role |
| Missing route protection | Comprehensive path mapping in permissions |
| Cookie desync | Force re-login on role change |

## Dependencies

- No external package dependencies
- Uses existing shadcn/ui components (Dialog, Select, Tooltip)
- Uses existing Firebase Firestore patterns
