'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResumoView } from '@/components/pedidos/resumo/ResumoView'
import type { Pedido } from '@/types/pedido'
import { parseApiResponse, formatErrorMessage } from '@/lib/error-handler'
import {
  getPresetRange,
  toIsoDate,
  RESUMO_PRESET_ORDER,
  PEDIDO_DATE_PRESET_LABELS,
  type PedidoDatePreset,
} from '@/lib/pedido-date-presets'

type RangeChoice = PedidoDatePreset // one of RESUMO_PRESET_ORDER, or 'CUSTOM'

export default function OrdersResumoPage() {
  const [choice, setChoice] = useState<RangeChoice>('THIS_WEEK')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  // Resolve the active [from, to] ISO range from the current choice.
  const { fromIso, toIso } = useMemo(() => {
    if (choice === 'CUSTOM') {
      return { fromIso: customFrom, toIso: customTo }
    }
    const { start, end } = getPresetRange(choice)
    return { fromIso: toIsoDate(start), toIso: toIsoDate(end) }
  }, [choice, customFrom, customTo])

  useEffect(() => {
    if (!fromIso || !toIso) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const res = await fetch(`/api/pedidos/resumo?from=${fromIso}&to=${toIso}`)
        const data = await parseApiResponse<Pedido[]>(res)
        if (!cancelled) setPedidos(data ?? [])
      } catch (err) {
        if (!cancelled) {
          setPedidos([])
          toast.error('Erro ao carregar resumo', { description: formatErrorMessage(err) })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fromIso, toIso])

  const rangeSelector = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Período</Label>
        <Select value={choice} onValueChange={(v) => setChoice(v as RangeChoice)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESUMO_PRESET_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                {PEDIDO_DATE_PRESET_LABELS[p]}
              </SelectItem>
            ))}
            <SelectItem value="CUSTOM">{PEDIDO_DATE_PRESET_LABELS.CUSTOM}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {choice === 'CUSTOM' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="resumo-from" className="text-xs text-muted-foreground">
              De
            </Label>
            <Input
              id="resumo-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="resumo-to" className="text-xs text-muted-foreground">
              Até
            </Label>
            <Input
              id="resumo-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resumo de Pedidos</h1>
        <p className="text-muted-foreground">
          Visão de produção e financeira dos pedidos por período de entrega
        </p>
      </div>

      <ResumoView
        pedidos={pedidos}
        fromIso={fromIso}
        toIso={toIso}
        rangeSelector={rangeSelector}
        loading={loading}
      />
    </div>
  )
}
