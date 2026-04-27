'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 rounded-lg px-2 py-2.5"
          style={{ opacity: 1 - idx * 0.12 }}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            <Skeleton className="h-2.5 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationList({ selectedId }: ConversationListProps) {
  const router = useRouter();
  const { conversations, isLoading, error } = useWhatsAppConversations();

  if (isLoading) {
    return (
      <div data-testid="conversation-list-loading">
        <ConversationListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-3 rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs text-red-700">
        Erro ao carregar conversas: {error.message}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[var(--secondary)]/20" />
          <span className="absolute inset-2 rounded-full bg-[var(--secondary)]/30" />
          <MessageCircle className="relative h-7 w-7 text-[var(--primary)]" />
        </div>
        <p className="text-sm font-medium text-foreground/90">
          Nenhuma conversa por aqui ainda
        </p>
        <p className="max-w-[18rem] text-xs leading-relaxed text-muted-foreground">
          Quando alguém escrever para o seu número WhatsApp Business, a conversa aparece aqui
          automaticamente.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-px py-1" role="list">
      {conversations.map((conv) => {
        const name = displayName(conv);
        const isSelected = selectedId === conv.id;
        const unread = conv.unreadCount && conv.unreadCount > 0 ? conv.unreadCount : null;
        const preview = conv.lastMessagePreview || '—';
        const isOutLast = conv.lastMessageDirection === 'out';
        return (
          <li key={conv.id}>
            <button
              type="button"
              data-testid={`conversation-row-${conv.id}`}
              onClick={() => router.push(`/whatsapp?c=${conv.id}`)}
              className={cn(
                'group relative flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
                'hover:bg-[var(--muted)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 focus-visible:ring-offset-0',
                isSelected
                  ? 'selected bg-[var(--secondary)]/15'
                  : unread
                    ? 'bg-amber-50/40'
                    : ''
              )}
            >
              {/* Selected: gold left rail */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-1 left-0 w-[3px] rounded-r-full transition-opacity',
                  isSelected
                    ? 'bg-[var(--secondary)] opacity-100'
                    : 'opacity-0'
                )}
              />

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar
                  className={cn(
                    'h-10 w-10 transition-colors',
                    isSelected
                      ? 'shadow-sm ring-2 ring-[var(--primary)]/20'
                      : ''
                  )}
                >
                  {conv.profilePictureUrl && (
                    <AvatarImage src={conv.profilePictureUrl} alt={name} />
                  )}
                  <AvatarFallback
                    className={cn(
                      'text-sm font-semibold',
                      isSelected
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'bg-[var(--muted)] text-[var(--primary)]'
                    )}
                  >
                    {initialsFor(name)}
                  </AvatarFallback>
                </Avatar>
                {/* Unread dot on avatar */}
                {unread && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-[var(--destructive)]"
                  />
                )}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm leading-tight text-foreground',
                      unread ? 'font-semibold' : 'font-medium'
                    )}
                  >
                    {name}
                  </span>
                  <span
                    className={cn(
                      'flex-shrink-0 text-[10px] font-medium uppercase tracking-wider',
                      unread ? 'text-[var(--destructive)]' : 'text-muted-foreground'
                    )}
                  >
                    {relativeTime(conv.lastMessageAt?.seconds)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      'block max-h-[2.4em] overflow-hidden text-xs leading-snug',
                      unread ? 'text-foreground/80' : 'text-muted-foreground'
                    )}
                    style={{
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 1,
                    }}
                  >
                    {isOutLast && (
                      <span className="mr-1 text-muted-foreground/70">Você:</span>
                    )}
                    {preview}
                  </span>
                  {unread ? (
                    <span
                      data-testid="unread-badge"
                      className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-bold text-white shadow-sm"
                    >
                      {unread > 99 ? '99+' : unread}
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
