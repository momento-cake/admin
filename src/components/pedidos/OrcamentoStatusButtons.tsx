'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Send,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from 'lucide-react'
import { Orcamento, OrcamentoStatus, ORCAMENTO_STATUS_LABELS } from '@/types/pedido'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'

const ORC_STATUS_TRANSITIONS: Record<OrcamentoStatus, { target: OrcamentoStatus; label: string; icon: typeof Send; variant: 'default' | 'destructive' | 'outline' }[]> = {
  RASCUNHO: [
    { target: 'ENVIADO', label: 'Enviar ao Cliente', icon: Send, variant: 'default' },
  ],
  ENVIADO: [
    { target: 'APROVADO', label: 'Aprovar', icon: ThumbsUp, variant: 'default' },
    { target: 'REJEITADO', label: 'Rejeitar', icon: ThumbsDown, variant: 'destructive' },
  ],
  APROVADO: [],
  REJEITADO: [
    { target: 'RASCUNHO', label: 'Revisar', icon: RotateCcw, variant: 'outline' },
  ],
}

interface OrcamentoStatusButtonsProps {
  orcamento: Orcamento
  pedidoId: string
  onUpdate: () => void
}

export function OrcamentoStatusButtons({
  orcamento,
  pedidoId,
  onUpdate,
}: OrcamentoStatusButtonsProps) {
  const [transitioning, setTransitioning] = useState<OrcamentoStatus | null>(null)
  const pedidoCtx = usePedidoOptional()

  const transitions = ORC_STATUS_TRANSITIONS[orcamento.status] || []

  if (!orcamento.isAtivo || transitions.length === 0) {
    return null
  }

  const handleStatusTransition = async (newStatus: OrcamentoStatus) => {
    setTransitioning(newStatus)

    // Apply optimistic update
    if (pedidoCtx) {
      pedidoCtx.optimisticUpdate((p) => ({
        ...p,
        orcamentos: p.orcamentos.map((o) =>
          o.id === orcamento.id ? { ...o, status: newStatus } : o
        ),
      }))
    }

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/orcamento/${orcamento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Erro ao alterar status')
      }
      toast.success(`Status alterado para ${ORCAMENTO_STATUS_LABELS[newStatus]}`)

      if (pedidoCtx) {
        pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      if (pedidoCtx) {
        pedidoCtx.rollback()
      }
      toast.error('Erro ao alterar status do orcamento', {
        description: formatErrorMessage(error),
      })
    } finally {
      setTransitioning(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
      {transitions.map(({ target, label, icon: Icon, variant }) => {
        const isTransitioning = transitioning === target
        return (
          <Button
            key={target}
            variant={variant}
            size="sm"
            onClick={() => handleStatusTransition(target)}
            disabled={transitioning !== null}
          >
            {isTransitioning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Icon className="h-4 w-4 mr-1" />
            )}
            {label}
          </Button>
        )
      })}
    </div>
  )
}
