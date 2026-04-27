'use client';

import { useEffect, useState } from 'react';
import { subscribeToStatus } from '@/lib/whatsapp';
import type { WhatsAppStatus } from '@/types/whatsapp';

interface UseWhatsAppStatusResult {
  status: WhatsAppStatus | null;
  isLoading: boolean;
  error: Error | null;
}

export function useWhatsAppStatus(): UseWhatsAppStatusResult {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToStatus((next) => {
        setStatus(next);
        setIsLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { status, isLoading, error };
}
