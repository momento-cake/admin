'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Pencil, Loader2 } from 'lucide-react'
import { Orcamento, DescontoTipo } from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { parseApiResponse, describeError } from '@/lib/error-handler'
import { usePedidoOptional } from '@/contexts/PedidoContext'

interface OrcamentoDiscountPopoverProps {
  orcamento: Orcamento
  pedidoId: string
  onUpdate: () => void
}

export function OrcamentoDiscountPopover({
  orcamento,
  pedidoId,
  onUpdate,
}: OrcamentoDiscountPopoverProps) {
  const pedidoCtx = usePedidoOptional()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [desconto, setDesconto] = useState(orcamento.desconto)
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>(orcamento.descontoTipo)
  const [acrescimo, setAcrescimo] = useState(orcamento.acrescimo)

  const subtotal = orcamento.itens.reduce((sum, item) => sum + item.total, 0)
  const descontoValor = descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto
  const previewTotal = Math.max(0, subtotal - descontoValor + acrescimo)

  const handleSaveDiscounts = async () => {
    setSaving(true)

    // Apply optimistic update with handle (per-call rollback/commit)
    const newDescontoValor = descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto
    const newTotal = Math.max(0, subtotal - newDescontoValor + acrescimo)
    const handle = pedidoCtx?.optimisticUpdate((p) => ({
      ...p,
      orcamentos: p.orcamentos.map((o) =>
        o.id === orcamento.id
          ? { ...o, desconto, descontoTipo, acrescimo, subtotal, total: newTotal }
          : o
      ),
    }))

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/orcamento/${orcamento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desconto, descontoTipo, acrescimo }),
      })
      await parseApiResponse(response)
      toast.success('Desconto/acrescimo atualizado')
      setEditOpen(false)

      handle?.commit()
      if (pedidoCtx) {
        await pedidoCtx.refreshPedido()
      } else {
        onUpdate()
      }
    } catch (error) {
      handle?.rollback()
      toast.error('Erro ao salvar desconto/acrescimo', {
        description: describeError(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePopoverOpen = (open: boolean) => {
    if (open) {
      setDesconto(orcamento.desconto)
      setDescontoTipo(orcamento.descontoTipo)
      setAcrescimo(orcamento.acrescimo)
    }
    setEditOpen(open)
  }

  return (
    <Popover open={editOpen} onOpenChange={handlePopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Desconto/Acrescimo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Desconto e Acrescimo</p>

          {/* Discount */}
          <div className="space-y-1">
            <Label className="text-xs">Desconto</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={desconto}
                onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 h-8 text-sm"
              />
              <div className="flex border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDescontoTipo('valor')}
                  className={cn(
                    'px-2 py-1 text-xs font-medium transition-colors',
                    descontoTipo === 'valor'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  )}
                >
                  R$
                </button>
                <button
                  type="button"
                  onClick={() => setDescontoTipo('percentual')}
                  className={cn(
                    'px-2 py-1 text-xs font-medium transition-colors',
                    descontoTipo === 'percentual'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  )}
                >
                  %
                </button>
              </div>
            </div>
          </div>

          {/* Surcharge */}
          <div className="space-y-1">
            <Label className="text-xs">Acrescimo</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={acrescimo}
                onChange={(e) => setAcrescimo(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-muted/50 rounded-lg p-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Desconto {descontoTipo === 'percentual' ? `(${desconto}%)` : ''}</span>
                <span>- {formatPrice(descontoValor)}</span>
              </div>
            )}
            {acrescimo > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Acrescimo</span>
                <span>+ {formatPrice(acrescimo)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-1 mt-1">
              <span>Total</span>
              <span>{formatPrice(previewTotal)}</span>
            </div>
          </div>

          <Button
            size="sm"
            className="w-full"
            onClick={handleSaveDiscounts}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
