'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowLeft, Edit } from 'lucide-react'
import { PedidoProvider, usePedido } from '@/contexts/PedidoContext'
import { PedidoDetailView } from '@/components/pedidos/PedidoDetailView'

function OrderDetailContent() {
  const router = useRouter()
  const { pedido, isLoading, error, refreshPedido } = usePedido()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-9 w-64 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || 'Pedido nao encontrado'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/orders"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Pedidos
          </Link>
          <h1 className="text-3xl font-bold">Pedido {pedido.numeroPedido}</h1>
          <p className="text-muted-foreground">
            Detalhes e gerenciamento do pedido
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => router.push(`/orders/${pedido.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      <PedidoDetailView pedido={pedido} onUpdate={refreshPedido} />
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const pedidoId = params.id as string

  return (
    <PedidoProvider pedidoId={pedidoId}>
      <OrderDetailContent />
    </PedidoProvider>
  )
}
