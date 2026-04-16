'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PedidoForm } from '@/components/pedidos/PedidoForm'

export default function NewOrderPage() {
  return (
    <div className="py-4 sm:py-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-5 px-1">
        <Link href="/orders" className="hover:text-foreground transition-colors">Pedidos</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Novo Pedido</span>
      </nav>

      <PedidoForm mode="create" />
    </div>
  )
}
