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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2, ArrowRight } from 'lucide-react'
import { PedidoStatus, PEDIDO_STATUS_LABELS } from '@/types/pedido'
import { parseApiResponse, describeError } from '@/lib/error-handler'
import { calcularTotalPedido } from '@/lib/payment-logic'
import { usePedidoOptional } from '@/contexts/PedidoContext'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

/**
 * Valid status transitions.
 * Each key maps to the statuses it can transition to.
 */
const STATUS_TRANSITIONS: Record<PedidoStatus, PedidoStatus[]> = {
  RASCUNHO: ['AGUARDANDO_APROVACAO', 'CANCELADO'],
  AGUARDANDO_APROVACAO: ['CONFIRMADO', 'RASCUNHO', 'CANCELADO'],
  CONFIRMADO: ['AGUARDANDO_PAGAMENTO', 'EM_PRODUCAO', 'CANCELADO'],
  AGUARDANDO_PAGAMENTO: ['EM_PRODUCAO', 'CONFIRMADO', 'CANCELADO'],
  EM_PRODUCAO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: ['RASCUNHO'],
}

const TRANSITION_LABELS: Partial<Record<PedidoStatus, string>> = {
  AGUARDANDO_APROVACAO: 'Enviar para Aprovacao',
  CONFIRMADO: 'Confirmar Pedido',
  AGUARDANDO_PAGAMENTO: 'Aguardar Pagamento',
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
  const pedido = pedidoCtx?.pedido ?? null

  const validTransitions = STATUS_TRANSITIONS[currentStatus] || []

  if (validTransitions.length === 0) {
    return null
  }

  const total = pedido ? calcularTotalPedido(pedido) : 0
  const totalPago = pedido?.totalPago ?? 0
  const saldo = Math.max(0, total - totalPago)
  const entregueDisabled = pedido?.statusPagamento !== 'PAGO'

  const handleTransition = async (newStatus: PedidoStatus) => {
    setUpdating(newStatus)

    // Apply optimistic update with handle (per-call rollback/commit)
    const handle = pedidoCtx?.optimisticUpdate((p) => ({ ...p, status: newStatus }))

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await parseApiResponse(response)

      toast.success(`Status alterado para ${PEDIDO_STATUS_LABELS[newStatus]}`)

      // Sync with server, awaited so we can rollback if it fails
      handle?.commit()
      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onStatusChange(newStatus)
      }
    } catch (error) {
      handle?.rollback()
      toast.error('Erro ao alterar status', {
        description: describeError(error),
      })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
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

          if (targetStatus === 'ENTREGUE') {
            const button = (
              <Button
                variant={variant}
                size="sm"
                onClick={() => handleTransition(targetStatus)}
                disabled={entregueDisabled || updating !== null}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {TRANSITION_LABELS[targetStatus] || PEDIDO_STATUS_LABELS[targetStatus]}
              </Button>
            )

            if (!entregueDisabled) {
              return <span key={targetStatus}>{button}</span>
            }

            return (
              <Tooltip key={targetStatus}>
                <TooltipTrigger asChild>
                  {/* span wrapper allows tooltip to work over a disabled button */}
                  <span tabIndex={0}>{button}</span>
                </TooltipTrigger>
                <TooltipContent>
                  Registre o pagamento total antes de marcar como entregue. Saldo em aberto: {formatBRL(saldo)}
                </TooltipContent>
              </Tooltip>
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
    </TooltipProvider>
  )
}
