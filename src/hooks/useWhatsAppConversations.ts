'use client';

import { useEffect, useState } from 'react';
import { subscribeToConversations } from '@/lib/whatsapp';
import type { WhatsAppConversation } from '@/types/whatsapp';

interface UseWhatsAppConversationsResult {
  conversations: WhatsAppConversation[];
  isLoading: boolean;
  error: Error | null;
}

export function useWhatsAppConversations(): UseWhatsAppConversationsResult {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToConversations((next) => {
        setConversations(next);
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

  return { conversations, isLoading, error };
}
