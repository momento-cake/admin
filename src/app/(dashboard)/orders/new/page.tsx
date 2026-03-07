'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PedidoForm } from '@/components/pedidos/PedidoForm'

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          <Link href="/orders" className="hover:text-foreground">Pedidos</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Novo Pedido</span>
        </nav>
        <h1 className="text-3xl font-bold">Novo Pedido</h1>
        <p className="text-muted-foreground">Crie um novo pedido para um cliente</p>
      </div>

      <PedidoForm mode="create" />
    </div>
  )
}
