'use client';

import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect } from 'react';

/**
 * Guards dashboard pages based on feature permissions.
 * Redirects users to their default page if they don't have access
 * to the current route's feature.
 */
export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccessPath, loading, user } = usePermissions();

  useEffect(() => {
    if (loading || !user) return;

    // Dashboard and profile are always accessible to authenticated users
    const alwaysAllowed = ['/dashboard', '/profile'];
    const normalizedPath = pathname.replace(/\/$/, '') || '/dashboard';
    if (alwaysAllowed.some(p => normalizedPath.startsWith(p))) return;

    if (!canAccessPath(normalizedPath)) {
      router.replace('/dashboard?access_denied=true');
    }
  }, [pathname, canAccessPath, loading, user, router]);

  return <>{children}</>;
}
