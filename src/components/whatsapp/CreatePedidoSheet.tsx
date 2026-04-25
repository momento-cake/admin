'use client';

import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PedidoForm } from '@/components/pedidos/PedidoForm';
import { formatPhoneForDisplay } from '@/lib/phone';
import type { WhatsAppConversation } from '@/types/whatsapp';

interface CreatePedidoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
  clienteId: string;
  clienteNome: string;
}

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Criar pedido — WhatsApp</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        <div className="px-2 pb-6">
          <PedidoForm
            initialClienteId={clienteId}
            initialClienteNome={clienteNome}
            initialClienteTelefone={conversation.phone}
            redirectOnSuccess={false}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
