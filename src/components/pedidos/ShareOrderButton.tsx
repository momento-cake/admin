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

interface ShareOrderButtonProps {
  publicToken: string
  pedidoStatus: PedidoStatus
  clienteNome: string
  numeroPedido: string
}

function getPortalUrl(publicToken: string): string {
  const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN
  if (portalDomain) {
    return `https://${portalDomain}/${publicToken}`
  }
  return `${window.location.origin}/pedido/${publicToken}`
}

export function ShareOrderButton({
  publicToken,
  pedidoStatus,
  clienteNome,
  numeroPedido,
}: ShareOrderButtonProps) {
  if (pedidoStatus !== 'AGUARDANDO_APROVACAO') {
    return null
  }

  const handleCopyLink = async () => {
    const url = getPortalUrl(publicToken)
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const handleWhatsApp = () => {
    const url = getPortalUrl(publicToken)
    const message = `Olá ${clienteNome}! Seu pedido ${numeroPedido} da Momento Cake está pronto para revisão. Acesse aqui: ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
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
