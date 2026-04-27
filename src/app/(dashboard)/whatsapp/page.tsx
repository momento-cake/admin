'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, MessageCircle, User, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { MessageComposer } from '@/components/whatsapp/MessageComposer';
import { ContactPanel } from '@/components/whatsapp/ContactPanel';
import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import { formatPhoneForDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { WhatsAppConversation } from '@/types/whatsapp';

type MobileView = 'list' | 'thread' | 'contact';

function displayName(conv: WhatsAppConversation): string {
  if (conv.clienteNome) return conv.clienteNome;
  if (conv.whatsappName) return conv.whatsappName;
  return formatPhoneForDisplay(conv.phone);
}

/**
 * Hero shown in the center pane when no conversation is selected and the
 * inbox is empty. Frames first-use as something positive rather than
 * presenting an apologetic empty box.
 */
function InboxHero({ status }: { status: 'pairing' | 'connected' | 'unknown' | 'disconnected' }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 py-10 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[var(--secondary)]/15"
        />
        <span
          aria-hidden="true"
          className="absolute inset-3 rounded-full bg-[var(--secondary)]/25"
        />
        <span
          aria-hidden="true"
          className="absolute inset-6 rounded-full bg-gradient-to-br from-green-100 to-green-50 ring-1 ring-green-200/70"
        />
        <MessageCircle className="relative h-9 w-9 text-green-600" strokeWidth={2.2} />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {status === 'connected'
            ? 'Aguardando sua primeira conversa'
            : 'Sua inbox WhatsApp aparece aqui'}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {status === 'connected'
            ? 'Compartilhe seu número WhatsApp Business com seus clientes — assim que alguém escrever, a conversa aparece nesta tela.'
            : 'Conecte sua instância na página de configurações para começar a receber e enviar mensagens.'}
        </p>
      </div>
      {status !== 'connected' && (
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href="/whatsapp/settings">
            <SettingsIcon className="h-4 w-4" /> Ir para configuração
          </Link>
        </Button>
      )}
    </div>
  );
}

function ThreadHeader({
  conversation,
  onBack,
  onShowContact,
}: {
  conversation: WhatsAppConversation | null;
  onBack: () => void;
  onShowContact: () => void;
}) {
  if (!conversation) return null;
  const name = displayName(conversation);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  const subtitle = conversation.clienteId
    ? formatPhoneForDisplay(conversation.phone)
    : conversation.whatsappName
      ? `${formatPhoneForDisplay(conversation.phone)} · não cadastrado`
      : 'Não cadastrado';
  return (
    <div className="flex items-center gap-3 border-b border-border/70 bg-white/80 px-3 py-2.5 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="md:hidden"
        aria-label="Voltar para conversas"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          conversation.clienteId
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'bg-[var(--muted)] text-[var(--primary)]'
        )}
      >
        {initials || <User className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onShowContact}
        className="md:hidden"
      >
        Contato
      </Button>
    </div>
  );
}

function WhatsAppInbox() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('c');
  const { conversations, isLoading: convsLoading } = useWhatsAppConversations();
  const { status } = useWhatsAppStatus();
  const selectedConversation = conversationId
    ? conversations.find((c) => c.id === conversationId) ?? null
    : null;
  const [mobileView, setMobileView] = useState<MobileView>(
    conversationId ? 'thread' : 'list'
  );

  useEffect(() => {
    if (conversationId) setMobileView('thread');
    else setMobileView('list');
  }, [conversationId]);

  const goBackToList = () => {
    router.push('/whatsapp');
  };

  const inboxIsEmpty = !convsLoading && conversations.length === 0 && !conversationId;
  const heroStatus: 'pairing' | 'connected' | 'unknown' | 'disconnected' =
    status?.state === 'connected'
      ? 'connected'
      : status?.state === 'disconnected'
        ? 'disconnected'
        : status?.state === 'pairing' || status?.state === 'connecting'
          ? 'pairing'
          : 'unknown';

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3 md:h-[calc(100vh-5rem)] md:flex-row md:gap-0 md:overflow-hidden md:rounded-xl md:border md:border-border/70 md:bg-white md:shadow-sm">
      {/* Mobile-only header */}
      <div className="flex items-center justify-between md:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <WhatsAppStatusBadge />
      </div>

      {/* Left: conversation list */}
      <aside
        className={cn(
          'flex h-full w-full flex-col border-r border-border/70 bg-[var(--background)] md:w-80',
          mobileView !== 'list' && 'hidden md:flex'
        )}
      >
        <div className="hidden items-center justify-between border-b border-border/70 bg-white/60 px-4 py-3 backdrop-blur-sm md:flex">
          <div>
            <h1 className="text-sm font-semibold leading-tight">Conversas</h1>
            <p className="text-[11px] text-muted-foreground">
              {convsLoading
                ? 'Carregando…'
                : `${conversations.length} ${conversations.length === 1 ? 'conversa' : 'conversas'}`}
            </p>
          </div>
          <WhatsAppStatusBadge />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList selectedId={conversationId} />
        </div>
      </aside>

      {/* Center: thread */}
      <section
        className={cn(
          'flex h-full w-full flex-1 flex-col bg-[var(--background)]',
          mobileView !== 'thread' && 'hidden md:flex'
        )}
      >
        {conversationId ? (
          <>
            <ThreadHeader
              conversation={selectedConversation}
              onBack={goBackToList}
              onShowContact={() => setMobileView('contact')}
            />
            <div className="min-h-0 flex-1">
              <MessageThread conversationId={conversationId} />
            </div>
            <MessageComposer conversationId={conversationId} />
          </>
        ) : inboxIsEmpty ? (
          <InboxHero status={heroStatus} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <MessageCircle className="h-9 w-9 opacity-40" />
            <p className="text-sm">Escolha uma conversa à esquerda para começar.</p>
          </div>
        )}
      </section>

      {/* Right: contact panel */}
      <aside
        className={cn(
          'h-full w-full overflow-y-auto border-l border-border/70 bg-[var(--background)] p-3 md:w-96',
          mobileView !== 'contact' && 'hidden md:block',
          !selectedConversation && 'md:hidden'
        )}
      >
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView('thread')}
            className="mb-2"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </div>
        <ContactPanel conversation={selectedConversation} />
      </aside>
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={null}>
      <WhatsAppInbox />
    </Suspense>
  );
}
