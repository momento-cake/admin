'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CreditCard, Plus, CalendarCog } from 'lucide-react'
import { toast } from 'sonner'
import type { Pedido } from '@/types/pedido'
import { calcularTotalPedido, roundCurrency } from '@/lib/payment-logic'
import { formatPrice } from '@/lib/products'
import { usePermissions } from '@/hooks/usePermissions'
import { PaymentStatusBadge } from './pagamentos/PaymentStatusBadge'
import { PaymentDialog } from './pagamentos/PaymentDialog'
import { PaymentList } from './pagamentos/PaymentList'

interface PaymentSectionProps {
  pedido: Pedido
  onUpdate: () => void
}

function toDateLoose(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const v = value as {
    toDate?: () => Date
    _seconds?: number
    seconds?: number
  }
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function toInputDate(value: unknown): string {
  const d = toDateLoose(value)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDisplayDate(value: unknown): string {
  const d = toDateLoose(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function PaymentSection({ pedido, onUpdate }: PaymentSectionProps) {
  const { canPerformAction } = usePermissions()
  const canDelete = canPerformAction('orders', 'delete')
  const canRegister = canPerformAction('orders', 'update')

  const total = useMemo(() => calcularTotalPedido(pedido), [pedido])
  const totalPago = roundCurrency(pedido.totalPago ?? 0)
  const saldo = roundCurrency(Math.max(0, total - totalPago))

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vencPopoverOpen, setVencPopoverOpen] = useState(false)
  const [newVenc, setNewVenc] = useState<string>(toInputDate(pedido.dataVencimento))
  const [savingVenc, setSavingVenc] = useState(false)

  const handleSaveVencimento = async () => {
    if (!newVenc) return
    setSavingVenc(true)
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataVencimento: new Date(newVenc).toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Erro ao atualizar vencimento')
      }
      toast.success('Vencimento atualizado')
      setVencPopoverOpen(false)
      onUpdate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao atualizar vencimento'
      )
    } finally {
      setSavingVenc(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold text-base">{formatPrice(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="font-semibold text-base">{formatPrice(totalPago)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={`font-semibold text-base ${
                saldo === 0 ? 'text-emerald-700' : ''
              }`}
            >
              {formatPrice(saldo)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <PaymentStatusBadge status={pedido.statusPagamento} />
            <span className="text-muted-foreground">
              Vencimento: {formatDisplayDate(pedido.dataVencimento)}
            </span>
            {canRegister && (
              <Popover open={vencPopoverOpen} onOpenChange={setVencPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2">
                    <CalendarCog className="h-4 w-4" />
                    <span className="sr-only">Editar vencimento</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-venc">Nova data de vencimento</Label>
                    <Input
                      id="new-venc"
                      type="date"
                      value={newVenc}
                      onChange={(e) => setNewVenc(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingVenc}
                      onClick={() => setVencPopoverOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      disabled={savingVenc || !newVenc}
                      onClick={handleSaveVencimento}
                    >
                      Salvar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {canRegister && saldo > 0 && (
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Registrar pagamento
            </Button>
          )}
        </div>

        <PaymentList
          pedidoId={pedido.id}
          pagamentos={pedido.pagamentos ?? []}
          canDelete={canDelete}
          onChanged={onUpdate}
        />
      </CardContent>

      {canRegister && (
        <PaymentDialog
          pedidoId={pedido.id}
          total={total}
          totalPago={totalPago}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onRegistered={onUpdate}
        />
      )}
    </Card>
  )
}
