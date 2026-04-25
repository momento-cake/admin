'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { formatPhoneForDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from '@/types/whatsapp';

interface ConversationListProps {
  selectedId: string | null;
}

function displayName(conv: WhatsAppConversation): string {
  if (conv.clienteNome) return conv.clienteNome;
  if (conv.whatsappName) return conv.whatsappName;
  return formatPhoneForDisplay(conv.phone);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

function relativeTime(secondsSeconds: number | undefined): string {
  if (!secondsSeconds) return '';
  try {
    return formatDistanceToNow(new Date(secondsSeconds * 1000), {
      locale: ptBR,
      addSuffix: false,
    });
  } catch {
    return '';
  }
}

export function ConversationList({ selectedId }: ConversationListProps) {
  const router = useRouter();
  const { conversations, isLoading, error } = useWhatsAppConversations();

  if (isLoading) {
    return (
      <div data-testid="conversation-list-loading" className="p-4 text-sm text-muted-foreground">
        Carregando conversas…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Erro ao carregar conversas: {error.message}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <MessageCircle className="mb-2 h-8 w-8 opacity-40" />
        Nenhuma conversa por aqui ainda.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border" role="list">
      {conversations.map((conv) => {
        const name = displayName(conv);
        const isSelected = selectedId === conv.id;
        const unread = conv.unreadCount && conv.unreadCount > 0 ? conv.unreadCount : null;
        return (
          <li key={conv.id}>
            <button
              type="button"
              data-testid={`conversation-row-${conv.id}`}
              onClick={() => router.push(`/whatsapp?c=${conv.id}`)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60',
                isSelected && 'selected bg-muted'
              )}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initialsFor(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm',
                      unread ? 'font-semibold text-foreground' : 'text-foreground'
                    )}
                  >
                    {name}
                  </span>
                  <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {relativeTime(conv.lastMessageAt?.seconds)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {conv.lastMessagePreview || '—'}
                  </span>
                  {unread ? (
                    <span
                      data-testid="unread-badge"
                      className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                    >
                      {unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
