'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import {
  PedidoCancelCategoria,
  PEDIDO_CANCEL_CATEGORIA_LABELS,
} from '@/types/pedido'
import { formatErrorMessage } from '@/lib/error-handler'
import { cn } from '@/lib/utils'

/** Preset categories in display order. OUTRO always comes last. */
const CATEGORIA_ORDER: PedidoCancelCategoria[] = [
  'CLIENTE_DESISTIU',
  'PEDIDO_DUPLICADO',
  'PAGAMENTO_NAO_REALIZADO',
  'INDISPONIBILIDADE',
  'OUTRO',
]

interface CancelPedidoDialogProps {
  pedidoId: string
  numeroPedido: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful cancellation so the caller can refresh. */
  onCanceled: () => void
}

export function CancelPedidoDialog({
  pedidoId,
  numeroPedido,
  open,
  onOpenChange,
  onCanceled,
}: CancelPedidoDialogProps) {
  const [categoria, setCategoria] = useState<PedidoCancelCategoria | null>(null)
  const [outroText, setOutroText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOutro = categoria === 'OUTRO'
  const canConfirm =
    categoria !== null && (!isOutro || outroText.trim().length > 0)

  const reset = () => {
    setCategoria(null)
    setOutroText('')
  }

  const handleOpenChange = (next: boolean) => {
    if (submitting) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!categoria || !canConfirm) return
    const motivo = isOutro
      ? outroText.trim()
      : PEDIDO_CANCEL_CATEGORIA_LABELS[categoria]

    setSubmitting(true)
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELADO',
          cancelamento: { categoria, motivo },
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao cancelar pedido')
      }
      toast.success('Pedido cancelado')
      reset()
      onOpenChange(false)
      onCanceled()
    } catch (error) {
      toast.error('Erro ao cancelar pedido', {
        description: formatErrorMessage(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar pedido {numeroPedido}</DialogTitle>
          <DialogDescription>
            Selecione o motivo do cancelamento. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label>Motivo do cancelamento</Label>
          <div className="grid gap-2">
            {CATEGORIA_ORDER.map((cat) => (
              <Button
                key={cat}
                type="button"
                variant={categoria === cat ? 'default' : 'outline'}
                className={cn('justify-start h-auto py-2 text-left whitespace-normal')}
                aria-pressed={categoria === cat}
                disabled={submitting}
                onClick={() => setCategoria(cat)}
              >
                {PEDIDO_CANCEL_CATEGORIA_LABELS[cat]}
              </Button>
            ))}
          </div>

          {isOutro && (
            <div className="space-y-1">
              <Label htmlFor="cancel-motivo-outro">Descreva o motivo</Label>
              <Textarea
                id="cancel-motivo-outro"
                value={outroText}
                onChange={(e) => setOutroText(e.target.value)}
                placeholder="Informe o motivo do cancelamento"
                rows={3}
                maxLength={500}
                disabled={submitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cancelando...
              </>
            ) : (
              'Confirmar Cancelamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
