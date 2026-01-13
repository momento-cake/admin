'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function useAccessDeniedNotification() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('access_denied') === 'true') {
      toast.error('Voce nao tem permissao para acessar esta pagina');
      // Clean up URL by removing the query param
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('access_denied');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, [searchParams]);
}
