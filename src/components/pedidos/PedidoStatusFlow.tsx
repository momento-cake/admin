'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, ArrowRight } from 'lucide-react'
import { PedidoStatus, PEDIDO_STATUS_LABELS } from '@/types/pedido'
import { formatErrorMessage } from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'

/**
 * Valid status transitions.
 * Each key maps to the statuses it can transition to.
 */
const STATUS_TRANSITIONS: Record<PedidoStatus, PedidoStatus[]> = {
  RASCUNHO: ['AGUARDANDO_APROVACAO', 'CANCELADO'],
  AGUARDANDO_APROVACAO: ['CONFIRMADO', 'RASCUNHO', 'CANCELADO'],
  CONFIRMADO: ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: ['RASCUNHO'],
}

const TRANSITION_LABELS: Partial<Record<PedidoStatus, string>> = {
  AGUARDANDO_APROVACAO: 'Enviar para Aprovacao',
  CONFIRMADO: 'Confirmar Pedido',
  EM_PRODUCAO: 'Iniciar Producao',
  PRONTO: 'Marcar como Pronto',
  ENTREGUE: 'Marcar como Entregue',
  CANCELADO: 'Cancelar Pedido',
  RASCUNHO: 'Voltar para Rascunho',
}

const TRANSITION_VARIANTS: Partial<Record<PedidoStatus, 'default' | 'destructive' | 'outline'>> = {
  CANCELADO: 'destructive',
  RASCUNHO: 'outline',
}

interface PedidoStatusFlowProps {
  pedidoId: string
  currentStatus: PedidoStatus
  onStatusChange: (newStatus: PedidoStatus) => void
}

export function PedidoStatusFlow({ pedidoId, currentStatus, onStatusChange }: PedidoStatusFlowProps) {
  const [updating, setUpdating] = useState<PedidoStatus | null>(null)
  const pedidoCtx = usePedidoOptional()

  const validTransitions = STATUS_TRANSITIONS[currentStatus] || []

  if (validTransitions.length === 0) {
    return null
  }

  const handleTransition = async (newStatus: PedidoStatus) => {
    setUpdating(newStatus)

    // Apply optimistic update if context is available
    if (pedidoCtx) {
      pedidoCtx.optimisticUpdate((p) => ({ ...p, status: newStatus }))
    }

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast.success(`Status alterado para ${PEDIDO_STATUS_LABELS[newStatus]}`)

      // Sync with server in background
      if (pedidoCtx) {
        pedidoCtx.refreshPedido()
      } else {
        onStatusChange(newStatus)
      }
    } catch (error) {
      // Rollback on failure
      if (pedidoCtx) {
        pedidoCtx.rollback()
      }
      toast.error('Erro ao alterar status', {
        description: formatErrorMessage(error),
      })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {validTransitions.map((targetStatus) => {
        const variant = TRANSITION_VARIANTS[targetStatus] || 'default'
        const isUpdating = updating === targetStatus

        if (targetStatus === 'CANCELADO') {
          return (
            <AlertDialog key={targetStatus}>
              <AlertDialogTrigger asChild>
                <Button
                  variant={variant}
                  size="sm"
                  disabled={updating !== null}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {TRANSITION_LABELS[targetStatus] || PEDIDO_STATUS_LABELS[targetStatus]}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar pedido</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar este pedido? Esta acao nao pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleTransition(targetStatus)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Cancelar Pedido
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        }

        return (
          <Button
            key={targetStatus}
            variant={variant}
            size="sm"
            onClick={() => handleTransition(targetStatus)}
            disabled={updating !== null}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {TRANSITION_LABELS[targetStatus] || PEDIDO_STATUS_LABELS[targetStatus]}
          </Button>
        )
      })}
    </div>
  )
}
