'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { cn } from '@/lib/utils';
import type {
  WhatsAppMessage,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from '@/types/whatsapp';

interface MessageThreadProps {
  conversationId: string | null;
}

const TYPE_LABELS: Record<WhatsAppMessageType, string> = {
  text: 'texto',
  image: 'imagem',
  audio: 'áudio',
  document: 'documento',
  video: 'vídeo',
  sticker: 'sticker',
  location: 'localização',
  contact: 'contato',
  system: 'sistema',
};

function formatTimestamp(seconds: number | undefined): string {
  if (!seconds) return '';
  const date = new Date(seconds * 1000);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return format(date, sameDay ? 'HH:mm' : 'dd/MM HH:mm', { locale: ptBR });
}

function formatDayDivider(seconds: number | undefined): string {
  if (!seconds) return '';
  const date = new Date(seconds * 1000);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Ontem';
  }
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

function StatusIndicator({
  messageId,
  status,
  reason,
}: {
  messageId: string;
  status?: WhatsAppMessageStatus;
  reason?: string;
}) {
  if (!status) return null;
  let icon: React.ReactNode = null;
  let label = '';
  let className = 'text-foreground/40';
  switch (status) {
    case 'pending':
    case 'sending':
      icon = <Clock className="h-3.5 w-3.5" />;
      label = 'Enviando';
      break;
    case 'sent':
      icon = <Check className="h-3.5 w-3.5" />;
      label = 'Enviado';
      break;
    case 'delivered':
      icon = <CheckCheck className="h-3.5 w-3.5" />;
      label = 'Entregue';
      break;
    case 'read':
      icon = <CheckCheck className="h-3.5 w-3.5" />;
      label = 'Lido';
      className = 'text-sky-500';
      break;
    case 'failed':
      icon = <AlertCircle className="h-3.5 w-3.5" />;
      label = reason ? `Falha: ${reason}` : 'Falha';
      className = 'text-red-500';
      break;
  }
  return (
    <span
      data-testid={`message-status-${messageId}`}
      data-status={status}
      title={label}
      className={cn(
        'inline-flex items-center gap-1 text-[10px]',
        className
      )}
    >
      {icon}
      {status === 'failed' && reason ? (
        <span className="text-red-600">{reason}</span>
      ) : null}
    </span>
  );
}

interface BubbleProps {
  message: WhatsAppMessage;
  groupPosition: 'first' | 'middle' | 'last' | 'only';
  showName?: boolean;
}

function MessageBubble({ message, groupPosition, showName }: BubbleProps) {
  const isOut = message.direction === 'out';
  const isUnsupported = message.type !== 'text';

  // Asymmetric corners: keep the outer corner pointed (rounded-sm) only on the
  // last message of the sequence, otherwise round all corners.
  const cornerClasses = isOut
    ? cn(
        'rounded-2xl',
        (groupPosition === 'last' || groupPosition === 'only') && 'rounded-br-sm'
      )
    : cn(
        'rounded-2xl',
        (groupPosition === 'last' || groupPosition === 'only') && 'rounded-bl-sm'
      );

  return (
    <div
      data-testid={`message-bubble-${message.id}`}
      className={cn(
        'flex w-full',
        isOut ? 'items-end justify-end' : 'items-start justify-start'
      )}
    >
      <div className="max-w-[78%] min-w-0">
        {showName && !isOut && (message.text || isUnsupported) && (
          <p className="mb-0.5 ml-3 text-[11px] font-semibold tracking-wide text-[var(--primary)]">
            {/* We don't carry the sender's name on the message; the bubble
                acts as a visual marker that a new sequence begins. */}
            <span className="sr-only">Mensagem recebida</span>
          </p>
        )}
        <div
          className={cn(
            'px-3 py-2 text-sm shadow-[0_1px_1px_rgba(45,35,25,0.06)]',
            cornerClasses,
            isOut
              ? 'bg-gradient-to-br from-[#dcf6c4] to-[#c9eba5] text-[#2d3b1a] ring-1 ring-inset ring-green-200/60'
              : 'bg-white text-foreground ring-1 ring-inset ring-border/70'
          )}
        >
          {isUnsupported ? (
            <p className="italic opacity-80">
              [{TYPE_LABELS[message.type]}] Tipo de mensagem ainda não suportado
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          )}
          <div
            className={cn(
              'mt-1 flex items-center gap-1.5',
              isOut ? 'justify-end' : 'justify-start'
            )}
          >
            <span
              className={cn(
                'text-[10px]',
                isOut ? 'text-[#3d5a1f]/65' : 'text-muted-foreground'
              )}
            >
              {formatTimestamp(message.timestamp?.seconds)}
            </span>
            {isOut && (
              <StatusIndicator
                messageId={message.id}
                status={message.status}
                reason={message.failureReason}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border/70" />
      <span className="rounded-full bg-white/70 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border/60 shadow-sm backdrop-blur-sm">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/70" />
    </div>
  );
}

function MessageThreadSkeleton() {
  // Alternating bubble skeletons to suggest a thread.
  const widths = ['w-40', 'w-56', 'w-32', 'w-48', 'w-44', 'w-36'];
  const directions: Array<'in' | 'out'> = ['in', 'in', 'out', 'in', 'out', 'in'];
  return (
    <div
      data-testid="message-thread-loading"
      className="flex h-full flex-col gap-2 px-4 py-4"
      aria-hidden="true"
    >
      {directions.map((dir, idx) => (
        <div
          key={idx}
          className={cn(
            'flex w-full',
            dir === 'out' ? 'justify-end' : 'justify-start'
          )}
        >
          <Skeleton
            className={cn(
              'h-7 rounded-2xl',
              widths[idx],
              dir === 'out' ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}
          />
        </div>
      ))}
    </div>
  );
}

interface RenderItem {
  kind: 'divider' | 'bubble';
  key: string;
  label?: string;
  message?: WhatsAppMessage;
  groupPosition?: 'first' | 'middle' | 'last' | 'only';
  showName?: boolean;
}

function buildRenderItems(messages: WhatsAppMessage[]): RenderItem[] {
  const out: RenderItem[] = [];
  let prevDay: string | null = null;
  let prevDir: 'in' | 'out' | null = null;
  let prevSecs: number | null = null;
  const GROUP_GAP_SECONDS = 60 * 5; // 5min
  // First pass: track group end positions.
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const next = messages[i + 1];
    const dayLabel = formatDayDivider(m.timestamp?.seconds);
    if (dayLabel !== prevDay) {
      out.push({ kind: 'divider', key: `d-${dayLabel}-${i}`, label: dayLabel });
      prevDay = dayLabel;
      prevDir = null;
      prevSecs = null;
    }
    const startsNewGroup =
      prevDir !== m.direction ||
      (prevSecs !== null &&
        m.timestamp?.seconds !== undefined &&
        m.timestamp.seconds - prevSecs > GROUP_GAP_SECONDS);

    const nextStartsNewGroup =
      !next ||
      next.direction !== m.direction ||
      formatDayDivider(next.timestamp?.seconds) !== dayLabel ||
      (m.timestamp?.seconds !== undefined &&
        next.timestamp?.seconds !== undefined &&
        next.timestamp.seconds - m.timestamp.seconds > GROUP_GAP_SECONDS);

    let position: 'first' | 'middle' | 'last' | 'only';
    if (startsNewGroup && nextStartsNewGroup) position = 'only';
    else if (startsNewGroup) position = 'first';
    else if (nextStartsNewGroup) position = 'last';
    else position = 'middle';

    out.push({
      kind: 'bubble',
      key: m.id,
      message: m,
      groupPosition: position,
      showName: startsNewGroup && m.direction === 'in',
    });
    prevDir = m.direction;
    prevSecs = m.timestamp?.seconds ?? null;
  }
  return out;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { messages, isLoading, error } = useWhatsAppMessages(conversationId);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);
  const lastCountRef = useRef(0);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  const items = useMemo(() => buildRenderItems(messages), [messages]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const newCount = messages.length;
    const previous = lastCountRef.current;
    lastCountRef.current = newCount;

    const atBottom = !userScrolledUpRef.current;
    if (atBottom) {
      node.scrollTop = node.scrollHeight;
      setShowNewMessagePill(false);
    } else if (newCount > previous) {
      setShowNewMessagePill(true);
    }
  }, [messages]);

  const handleScroll = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - (node.scrollTop + node.clientHeight);
    userScrolledUpRef.current = distanceFromBottom > 80;
    if (!userScrolledUpRef.current) {
      setShowNewMessagePill(false);
    }
  };

  const handleScrollToBottom = () => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    userScrolledUpRef.current = false;
    setShowNewMessagePill(false);
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <MessageCircle className="h-8 w-8 opacity-40" />
        <p className="text-sm">Selecione uma conversa para começar.</p>
      </div>
    );
  }

  if (isLoading) {
    return <MessageThreadSkeleton />;
  }

  if (error) {
    return (
      <div className="m-4 rounded-lg border border-red-200 bg-red-50/40 p-3 text-sm text-red-700">
        Erro ao carregar mensagens: {error.message}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full flex-col"
      style={{
        // Soft warm cream wash to imitate paper rather than flat gray.
        background:
          'linear-gradient(180deg, var(--background) 0%, color-mix(in srgb, var(--muted) 60%, transparent) 100%)',
      }}
    >
      <div
        ref={scrollerRef}
        data-testid="message-scroller"
        onScroll={handleScroll}
        className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4"
      >
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageCircle className="h-6 w-6 opacity-40" />
            <p className="text-sm">Sem mensagens ainda.</p>
            <p className="text-xs opacity-80">
              Envie a primeira mensagem para começar a conversa.
            </p>
          </div>
        ) : (
          items.map((item) => {
            if (item.kind === 'divider') {
              return <DayDivider key={item.key} label={item.label || ''} />;
            }
            return (
              <MessageBubble
                key={item.key}
                message={item.message!}
                groupPosition={item.groupPosition!}
                showName={item.showName}
              />
            );
          })
        )}
      </div>
      {showNewMessagePill && (
        <button
          type="button"
          data-testid="new-message-pill"
          onClick={handleScrollToBottom}
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-lg ring-2 ring-white/60 transition-transform hover:-translate-y-px hover:translate-x-[-50%]"
        >
          Nova mensagem <ArrowDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
