'use client'

import { Share2, Link, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PedidoStatus } from '@/types/pedido'
import { cn } from '@/lib/utils'

interface ShareOrderButtonProps {
  publicToken: string
  pedidoStatus: PedidoStatus
  clienteNome: string
  numeroPedido: string
  /**
   * Visual emphasis. `'primary'` makes it a default-variant button
   * (used when the order is in a customer-handoff state and re-sharing
   * the link is the next action the admin should take).
   */
  variant?: 'primary' | 'subtle'
  className?: string
}

const VISIBLE_STATUSES: ReadonlyArray<PedidoStatus> = [
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
]

function getPortalUrl(publicToken: string): string {
  const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
  if (portalDomain) {
    return `https://${portalDomain}/${publicToken}`
  }
  return `${window.location.origin}/pedido/${publicToken}`
}

function buildWhatsAppMessage(
  pedidoStatus: PedidoStatus,
  clienteNome: string,
  numeroPedido: string,
  url: string,
): string {
  if (pedidoStatus === 'AGUARDANDO_PAGAMENTO') {
    return `Olá ${clienteNome}! Seu pedido ${numeroPedido} da Momento Cake está pronto para pagamento. Acesse aqui: ${url}`
  }
  return `Olá ${clienteNome}! Seu pedido ${numeroPedido} da Momento Cake está pronto para revisão. Acesse aqui: ${url}`
}

export function ShareOrderButton({
  publicToken,
  pedidoStatus,
  clienteNome,
  numeroPedido,
  variant = 'subtle',
  className,
}: ShareOrderButtonProps) {
  if (!VISIBLE_STATUSES.includes(pedidoStatus)) {
    return null
  }

  const handleCopyLink = async () => {
    const url = getPortalUrl(publicToken)
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const handleWhatsApp = () => {
    const url = getPortalUrl(publicToken)
    const message = buildWhatsAppMessage(
      pedidoStatus,
      clienteNome,
      numeroPedido,
      url,
    )
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const isPrimary = variant === 'primary'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isPrimary ? 'default' : 'outline'}
          size="sm"
          className={cn(isPrimary && 'shadow-sm', className)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          {isPrimary
            ? pedidoStatus === 'AGUARDANDO_PAGAMENTO'
              ? 'Reenviar para pagamento'
              : 'Enviar para o cliente'
            : 'Compartilhar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link className="h-4 w-4 mr-2" />
          Copiar Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Enviar via WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
