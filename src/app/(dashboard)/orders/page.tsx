'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pedido } from '@/types/pedido'
import { PedidoList } from '@/components/pedidos/PedidoList'
import { formatErrorMessage } from '@/lib/error-handler'

export default function OrdersPage() {
  const router = useRouter()

  const handleCreate = () => {
    router.push('/orders/new')
  }

  const handleView = (pedido: Pedido) => {
    router.push(`/orders/${pedido.id}`)
  }

  const handleEdit = (pedido: Pedido) => {
    router.push(`/orders/${pedido.id}/edit`)
  }

  const handleDelete = async (pedido: Pedido) => {
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast.success('Pedido excluído com sucesso!', {
        description: `O pedido "${pedido.numeroPedido}" foi desativado`,
      })
    } catch (error) {
      toast.error('Erro ao excluir pedido', {
        description: formatErrorMessage(error),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">Gerencie os pedidos da loja</p>
      </div>

      <PedidoList
        onPedidoCreate={handleCreate}
        onPedidoView={handleView}
        onPedidoEdit={handleEdit}
        onPedidoDelete={handleDelete}
      />
    </div>
  )
}
