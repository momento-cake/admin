'use client';

import { toast } from 'sonner';
import { PedidoFormDialog } from '@/components/pedidos/PedidoFormDialog';
import { formatPhoneForDisplay } from '@/lib/phone';
import type { WhatsAppConversation } from '@/types/whatsapp';

interface CreatePedidoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
  clienteId: string;
  clienteNome: string;
}

/**
 * WhatsApp's entry point into order creation. Keeps its name and props so the
 * chat call sites don't move, but delegates to the shared dialog — which also
 * fixes Cancel navigating the whole app to /orders from inside the chat.
 */
export function CreatePedidoSheet({
  open,
  onOpenChange,
  conversation,
  clienteId,
  clienteNome,
}: CreatePedidoSheetProps) {
  const subtitle =
    conversation.clienteNome ||
    conversation.whatsappName ||
    formatPhoneForDisplay(conversation.phone);

  return (
    <PedidoFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar pedido — WhatsApp"
      description={subtitle}
      initialClienteId={clienteId}
      initialClienteNome={clienteNome}
      initialClienteTelefone={conversation.phone}
      onCreated={(pedido) => {
        toast.success(`Pedido ${pedido.numeroPedido} criado`, {
          description: 'Abrir pedido',
          action: {
            label: 'Abrir',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = `/orders/${pedido.id}`;
              }
            },
          },
        });
        onOpenChange(false);
      }}
    />
  );
}
