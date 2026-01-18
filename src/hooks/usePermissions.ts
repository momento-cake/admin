'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { UserModel } from '@/types';
import {
  canAccessFeature,
  canAccessPath,
  canPerformAction,
  getAccessibleFeatures,
  getEffectivePermissions,
  canModifyUserPermissions,
  FeatureKey,
  ActionKey,
  CustomPermissions,
} from '@/lib/permissions';

export function usePermissions() {
  const { userModel } = useAuthContext();
  const role = userModel?.role?.type ?? 'atendente';

  return {
    /** Current user's role */
    role,

    /** Current user model */
    user: userModel,

    /**
     * Check if current user can access a feature
     */
    canAccess: (feature: FeatureKey) => canAccessFeature(userModel, feature),

    /**
     * Check if current user can perform a specific action on a feature
     * @example canPerformAction('clients', 'delete')
     */
    canPerformAction: (feature: FeatureKey, action: ActionKey) =>
      canPerformAction(userModel, feature, action),

    /**
     * Check if current user can access a specific path
     */
    canAccessPath: (path: string) => canAccessPath(userModel, path),

    /**
     * Get all features the current user can access
     */
    accessibleFeatures: getAccessibleFeatures(userModel),

    /**
     * Get the effective permissions for the current user
     */
    effectivePermissions: getEffectivePermissions(userModel) as CustomPermissions,

    /**
     * Check if current user is admin
     */
    isAdmin: role === 'admin',

    /**
     * Check if current user is atendente
     */
    isAtendente: role === 'atendente',

    /**
     * Check if current user can modify another user's permissions
     * Admins cannot modify other admins
     */
    canModifyPermissions: (targetUser: UserModel) =>
      canModifyUserPermissions(userModel, targetUser),
  };
}
