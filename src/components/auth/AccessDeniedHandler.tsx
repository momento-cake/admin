'use client';

import { useAccessDeniedNotification } from '@/hooks/useAccessDeniedNotification';

export function AccessDeniedHandler() {
  useAccessDeniedNotification();
  return null;
}
