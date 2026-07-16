'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PedidoForm } from '@/components/pedidos/PedidoForm'

interface PedidoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialClienteId?: string
  initialClienteNome?: string
  initialClienteTelefone?: string
  onCreated?: (pedido: { id: string; numeroPedido: string }) => void
}

/**
 * The single new-order creation surface. Named for the form rather than for
 * "novo pedido" because WhatsApp reuses it with its own title.
 *
 * Responsive via Tailwind breakpoints rather than a JS media query: a JS
 * breakpoint would add an SSR/hydration mismatch, and pure CSS has none of that.
 * `100dvh` (not `100vh`) keeps the wizard's footer buttons reachable on mobile
 * Safari, whose collapsing URL bar would otherwise clip them. The `p-4` (vs
 * `p-6`) is what lets the six-step indicator fit a 360px viewport.
 */
export function PedidoFormDialog({
  open,
  onOpenChange,
  title = 'Novo Pedido',
  description,
  initialClienteId,
  initialClienteNome,
  initialClienteTelefone,
  onCreated,
}: PedidoFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[calc(100%-1rem)] sm:max-w-3xl
                   h-[calc(100dvh-2rem)] sm:h-auto
                   max-h-[calc(100dvh-2rem)] sm:max-h-[85vh]
                   overflow-y-auto p-4 sm:p-6"
        // A stray overlay click or Escape would destroy a half-filled 6-step
        // wizard, so only Cancelar/X close this. Radix dispatches Escape to the
        // innermost layer, so ClienteStep's own dialog still closes normally.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <PedidoForm
          mode="create"
          variant="plain"
          redirectOnSuccess={false}
          onCancel={() => onOpenChange(false)}
          initialClienteId={initialClienteId}
          initialClienteNome={initialClienteNome}
          initialClienteTelefone={initialClienteTelefone}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}
