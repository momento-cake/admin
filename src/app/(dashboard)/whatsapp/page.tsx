'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { MessageComposer } from '@/components/whatsapp/MessageComposer';
import { ContactPanel } from '@/components/whatsapp/ContactPanel';
import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { cn } from '@/lib/utils';

type MobileView = 'list' | 'thread' | 'contact';

function WhatsAppInbox() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get('c');
  const { conversations } = useWhatsAppConversations();
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

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3 md:h-[calc(100vh-5rem)] md:flex-row md:gap-0">
      {/* Header */}
      <div className="flex items-center justify-between md:hidden">
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <WhatsAppStatusBadge />
      </div>

      {/* Left: list */}
      <aside
        className={cn(
          'flex h-full w-full flex-col border-r bg-background md:w-80',
          mobileView !== 'list' && 'hidden md:flex'
        )}
      >
        <div className="hidden items-center justify-between border-b px-3 py-2 md:flex">
          <h1 className="text-sm font-semibold">Conversas</h1>
          <WhatsAppStatusBadge />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList selectedId={conversationId} />
        </div>
      </aside>

      {/* Center: thread */}
      <section
        className={cn(
          'flex h-full w-full flex-1 flex-col',
          mobileView !== 'thread' && 'hidden md:flex'
        )}
      >
        {conversationId ? (
          <>
            <div className="flex items-center justify-between border-b px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBackToList}
                className="md:hidden"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Conversas
              </Button>
              <div className="truncate text-sm font-medium">
                {selectedConversation?.clienteNome ||
                  selectedConversation?.whatsappName ||
                  selectedConversation?.phone ||
                  'Conversa'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView('contact')}
                className="md:hidden"
              >
                Contato
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <MessageThread conversationId={conversationId} />
            </div>
            <MessageComposer conversationId={conversationId} />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-40" />
            <p className="text-sm">
              Escolha uma conversa à esquerda para começar.
            </p>
          </div>
        )}
      </section>

      {/* Right: contact */}
      <aside
        className={cn(
          'h-full w-full overflow-y-auto border-l bg-background p-3 md:w-96',
          mobileView !== 'contact' && 'hidden md:block'
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
