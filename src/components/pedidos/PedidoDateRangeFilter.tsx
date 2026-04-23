'use client'

import * as React from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  PEDIDO_DATE_PRESET_LABELS,
  type PedidoDatePreset,
  formatPresetRange,
  getPresetRange,
  parseIsoDateEnd,
  parseIsoDateStart,
  toIsoDate,
} from '@/lib/pedido-date-presets'

export interface PedidoDateFilterValue {
  preset: PedidoDatePreset | null
  dateFrom?: string
  dateTo?: string
}

interface Props {
  value: PedidoDateFilterValue
  onChange: (next: PedidoDateFilterValue) => void
  className?: string
}

const PRESET_ORDER: PedidoDatePreset[] = [
  'THIS_WEEK',
  'THIS_MONTH',
  'NEXT_2_WEEKS',
  'NEXT_MONTH',
  'PREVIOUS_MONTH',
  'CUSTOM',
]

export function PedidoDateRangeFilter({ value, onChange, className }: Props) {
  const isActive = value.preset !== null
  const isCustom = value.preset === 'CUSTOM'

  const handlePreset = (preset: PedidoDatePreset) => {
    if (preset === 'CUSTOM') {
      onChange({ preset: 'CUSTOM' })
      return
    }
    const { start, end } = getPresetRange(preset)
    onChange({
      preset,
      dateFrom: toIsoDate(start),
      dateTo: toIsoDate(end),
    })
  }

  const handleCustomFrom = (dateFrom: string) => {
    onChange({ preset: 'CUSTOM', dateFrom: dateFrom || undefined, dateTo: value.dateTo })
  }

  const handleCustomTo = (dateTo: string) => {
    onChange({ preset: 'CUSTOM', dateFrom: value.dateFrom, dateTo: dateTo || undefined })
  }

  const handleClear = () => {
    onChange({ preset: null })
  }

  // Label on the trigger button
  let triggerLabel = 'Período'
  if (isActive) {
    if (value.preset === 'CUSTOM' && value.dateFrom && value.dateTo) {
      triggerLabel = formatPresetRange({
        start: parseIsoDateStart(value.dateFrom),
        end: parseIsoDateEnd(value.dateTo),
      })
    } else if (value.preset !== 'CUSTOM' && value.preset) {
      triggerLabel = PEDIDO_DATE_PRESET_LABELS[value.preset]
    } else {
      triggerLabel = PEDIDO_DATE_PRESET_LABELS.CUSTOM
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="h-10 gap-2"
          >
            <Calendar className="h-4 w-4" aria-hidden />
            <span className="truncate max-w-[160px]">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-3 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Período de entrega
          </p>
          <div className="flex flex-col gap-1">
            {PRESET_ORDER.map((preset) => {
              const active = value.preset === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={cn(
                    'w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-foreground text-background font-medium'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {PEDIDO_DATE_PRESET_LABELS[preset]}
                </button>
              )
            })}
          </div>

          {isCustom && (
            <div className="pt-2 border-t space-y-2">
              <label className="block text-xs">
                <span className="text-muted-foreground">Início</span>
                <input
                  type="date"
                  value={value.dateFrom ?? ''}
                  onChange={(e) => handleCustomFrom(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-input px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="text-muted-foreground">Fim</span>
                <input
                  type="date"
                  value={value.dateTo ?? ''}
                  onChange={(e) => handleCustomTo(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-input px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          )}

          {isActive && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                Limpar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {isActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          aria-label="Limpar filtro de período"
          className="h-10 w-10 p-0 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
