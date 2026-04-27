'use client';

import { useEffect, useState } from 'react';
import { subscribeToMessages } from '@/lib/whatsapp';
import type { WhatsAppMessage } from '@/types/whatsapp';

interface UseWhatsAppMessagesResult {
  messages: WhatsAppMessage[];
  isLoading: boolean;
  error: Error | null;
}

export function useWhatsAppMessages(conversationId: string | null): UseWhatsAppMessagesResult {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(conversationId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessages([]);

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToMessages(conversationId, (next) => {
        setMessages(next);
        setIsLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  return { messages, isLoading, error };
}
