# Role-Based Feature Access

## Metadata
- **Type**: Feature
- **Platforms**: Web
- **Complexity**: Medium
- **Estimated Effort**: 2-3 days
- **Slug**: `role-based-feature-access`

## Problem Statement

Currently, the Momento Cake Admin system has only two roles (`admin` and `viewer`) but doesn't have granular feature access control. The business needs a new role type called "Atendente" (attendant/service person) who should only have access to:
- **Dashboard** (view only)
- **Clients Management** (full CRUD)

All other features (users, ingredients, recipes, products, packaging, orders, reports) should be visible but disabled in the navigation for Atendente users.

## Solution Overview

Implement role-based feature access control by:
1. Adding `atendente` to the `UserRole` type
2. Creating a permission system that maps roles to allowed features
3. Updating the sidebar to show disabled menu items for restricted features
4. Adding route protection for feature-level access
5. Providing admin UI to change user roles

## User Stories

### US-01: Atendente Limited Access
**As** an Atendente user
**I want** to see the dashboard and manage clients
**So that** I can perform my daily customer service tasks without accessing sensitive business data

### US-02: Disabled Menu Visibility
**As** an Atendente user
**I want** to see all menu items (even disabled ones)
**So that** I understand the full system capabilities and can request access if needed

### US-03: Admin Role Management
**As** an Admin user
**I want** to change a user's role after they've been created
**So that** I can promote or demote users based on their responsibilities

## Requirements Clarification

| Requirement | Decision |
|-------------|----------|
| Access denied behavior | Show menu items as disabled/grayed out |
| Role assignment method | Admin edits user profile after creation |
| Atendente access scope | Dashboard (view) + Clients (full CRUD) |
| Client permissions for Atendente | Full CRUD (create, read, update, delete) |
| Role storage | User document field in Firestore (`role.type`) |
| Future role extensibility | Simple two-role system (admin/atendente) |
| Portuguese role name | "Atendente" |

## Technical Design

### Role Type Update
```typescript
// src/types/index.ts
export type UserRole = 'admin' | 'atendente';
```

### Feature Permissions Map
```typescript
// src/lib/permissions.ts
export const FEATURE_PERMISSIONS: Record<string, UserRole[]> = {
  'dashboard': ['admin', 'atendente'],
  'clients': ['admin', 'atendente'],
  'users': ['admin'],
  'ingredients': ['admin'],
  'recipes': ['admin'],
  'products': ['admin'],
  'packaging': ['admin'],
  'orders': ['admin'],
  'reports': ['admin'],
  'settings': ['admin'],
};

export function canAccessFeature(role: UserRole, feature: string): boolean {
  return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false;
}
```

### Sidebar Navigation Update
- Add `disabled` state for menu items the user can't access
- Show tooltip on hover explaining "Acesso restrito"
- Gray out disabled items but keep them visible

### Route Protection
- Update middleware to check feature permissions
- Add redirect to dashboard for unauthorized feature access
- Show toast notification when access is denied

### User Edit Dialog
- Add role selector dropdown in user edit form
- Only admins can change roles
- Cannot change own role to prevent lockout

## Affected Files

### Types & Permissions
- `src/types/index.ts` - Update UserRole type
- `src/lib/permissions.ts` - New file for permission logic

### Navigation & Layout
- `src/components/layout/Sidebar.tsx` - Add disabled menu item states
- `src/middleware.ts` - Add feature-level route protection

### User Management
- `src/components/users/UsersList.tsx` - Update role display
- `src/components/users/UserEditDialog.tsx` - New component for editing users
- `src/components/users/InviteUserDialog.tsx` - Update role options

### Context & Hooks
- `src/contexts/AuthContext.tsx` - Add permission check helpers
- `src/hooks/usePermissions.ts` - New hook for permission checks

## Implementation Phases

### Phase 1: Core Permission System
1. Update `UserRole` type to include `atendente`
2. Create `src/lib/permissions.ts` with feature permission map
3. Create `usePermissions` hook
4. Update AuthContext with permission helpers

### Phase 2: Navigation Updates
1. Update Sidebar to use permission checks
2. Add disabled styling for restricted menu items
3. Add tooltip for disabled items
4. Test navigation states

### Phase 3: Route Protection
1. Update middleware with feature-level checks
2. Add access denied handling (redirect + toast)
3. Test route protection for all features

### Phase 4: User Role Management
1. Create UserEditDialog component
2. Add edit functionality to UsersList
3. Update role options (admin/atendente)
4. Add validation (can't change own role)

### Phase 5: Testing & Polish
1. Test all role combinations
2. Verify disabled states work correctly
3. Test route protection
4. Update any hardcoded "viewer" references

## Acceptance Criteria

### AC-01: Role Types
- [ ] `UserRole` type includes `admin` and `atendente`
- [ ] Existing `viewer` role is migrated to `atendente`
- [ ] Role badge shows "Administrador" or "Atendente"

### AC-02: Navigation
- [ ] Atendente sees all menu items
- [ ] Restricted items appear disabled (grayed out)
- [ ] Disabled items show "Acesso restrito" tooltip
- [ ] Dashboard and Clients are fully accessible for Atendente

### AC-03: Route Protection
- [ ] Direct URL access to restricted features redirects to dashboard
- [ ] Toast notification shows "Você não tem permissão para acessar esta página"
- [ ] Admin can access all features

### AC-04: User Management
- [ ] Admin can edit user roles via UsersList
- [ ] Role dropdown shows Admin/Atendente options
- [ ] Admin cannot change their own role
- [ ] Role changes take effect immediately

### AC-05: Clients Feature
- [ ] Atendente can view client list
- [ ] Atendente can create new clients
- [ ] Atendente can edit existing clients
- [ ] Atendente can delete clients

## Testing Strategy

### Unit Tests
- Permission check functions
- Role validation logic

### E2E Tests
- Login as Atendente and verify limited access
- Login as Admin and verify full access
- Test role change workflow
- Test direct URL access protection

## Migration Notes

The existing `viewer` role will be deprecated and replaced with `atendente`. A migration strategy should:
1. Update all existing users with `role.type: 'viewer'` to `role.type: 'atendente'`
2. Update invitation schema to use new role value
3. Update any pending invitations

## Platform-Specific Plans

- **Web**: `context/specs/web/role-based-feature-access.md`

## Validation Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# E2E tests
npx playwright test

# Development server
npm run dev
```
