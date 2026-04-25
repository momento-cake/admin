'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ArrowDown, Check, CheckCheck, Clock, MessageCircle } from 'lucide-react';
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

function StatusIndicator({ messageId, status, reason }: {
  messageId: string;
  status?: WhatsAppMessageStatus;
  reason?: string;
}) {
  if (!status) return null;
  let icon: React.ReactNode = null;
  let label = '';
  switch (status) {
    case 'pending':
    case 'sending':
      icon = <Clock className="h-3 w-3" />;
      label = 'Enviando';
      break;
    case 'sent':
      icon = <Check className="h-3 w-3" />;
      label = 'Enviado';
      break;
    case 'delivered':
      icon = <CheckCheck className="h-3 w-3" />;
      label = 'Entregue';
      break;
    case 'read':
      icon = <CheckCheck className="h-3 w-3 text-sky-500" />;
      label = 'Lido';
      break;
    case 'failed':
      icon = <AlertCircle className="h-3 w-3 text-red-500" />;
      label = reason ? `Falha: ${reason}` : 'Falha';
      break;
  }
  return (
    <span
      data-testid={`message-status-${messageId}`}
      data-status={status}
      title={label}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
    >
      {icon}
      {status === 'failed' && reason ? <span className="text-red-600">{reason}</span> : null}
    </span>
  );
}

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const isOut = message.direction === 'out';
  const isUnsupported = message.type !== 'text';
  return (
    <div
      data-testid={`message-bubble-${message.id}`}
      className={cn(
        'flex w-full',
        isOut ? 'items-end justify-end' : 'items-start justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          isOut
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {isUnsupported ? (
          <p className="italic opacity-80">
            [{TYPE_LABELS[message.type]}] Tipo de mensagem ainda não suportado
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}
        <div className={cn('mt-1 flex items-center gap-2', isOut ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] opacity-70">
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
  );
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { messages, isLoading, error } = useWhatsAppMessages(conversationId);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const userScrolledUpRef = useRef(false);
  const lastCountRef = useRef(0);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

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
    return (
      <div data-testid="message-thread-loading" className="p-6 text-sm text-muted-foreground">
        Carregando mensagens…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">Erro ao carregar mensagens: {error.message}</div>;
  }

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={scrollerRef}
        data-testid="message-scroller"
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Sem mensagens ainda.
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
      {showNewMessagePill && (
        <button
          type="button"
          data-testid="new-message-pill"
          onClick={handleScrollToBottom}
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md"
        >
          Nova mensagem <ArrowDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
