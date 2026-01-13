'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import {
  canAccessFeature,
  canAccessPath,
  getAccessibleFeatures,
  FeatureKey,
} from '@/lib/permissions';

export function usePermissions() {
  const { userModel } = useAuthContext();
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
