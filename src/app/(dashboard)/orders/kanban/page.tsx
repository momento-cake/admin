'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pedido } from '@/types/pedido'
import { KanbanBoard } from '@/components/pedidos/KanbanBoard'
import { PedidoFormDialog } from '@/components/pedidos/PedidoFormDialog'
import { usePermissions } from '@/hooks/usePermissions'

export default function OrdersKanbanPage() {
  const router = useRouter()
  const { canPerformAction } = usePermissions()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const canUpdate = canPerformAction('orders', 'update')

  const handleCreate = () => {
    setCreateOpen(true)
  }

  const handleView = (pedido: Pedido) => {
    router.push(`/orders/${pedido.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos · Kanban</h1>
        <p className="text-muted-foreground">
          Arraste os cards entre as colunas para atualizar o status do pedido.
        </p>
      </div>

      <KanbanBoard
        onPedidoView={handleView}
        onPedidoCreate={handleCreate}
        canUpdate={canUpdate}
        refreshToken={refreshToken}
      />

      <PedidoFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          setRefreshToken((t) => t + 1)
        }}
      />
    </div>
  )
}
