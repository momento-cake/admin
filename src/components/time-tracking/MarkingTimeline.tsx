'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TimeMarking, TimeEntrySummary, MarkingType } from '@/types/time-tracking'
import {
  PlayCircle,
  Coffee,
  UtensilsCrossed,
  LogOut,
  MapPin,
} from 'lucide-react'

interface MarkingTimelineProps {
  markings: TimeMarking[]
  summary?: TimeEntrySummary
}

const MARKING_CONFIG: Record<MarkingType, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  dotColor: string
}> = {
  clock_in: {
    label: 'Entrada',
    icon: PlayCircle,
    color: 'text-green-700',
    dotColor: 'bg-green-500',
  },
  lunch_out: {
    label: 'Saida Almoco',
    icon: Coffee,
    color: 'text-orange-700',
    dotColor: 'bg-orange-500',
  },
  lunch_in: {
    label: 'Retorno Almoco',
    icon: UtensilsCrossed,
    color: 'text-blue-700',
    dotColor: 'bg-blue-500',
  },
  clock_out: {
    label: 'Saida',
    icon: LogOut,
    color: 'text-red-700',
    dotColor: 'bg-red-500',
  },
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m.toString().padStart(2, '0')}min`
}

function toSafeDate(value: Date | { toDate: () => Date }): Date {
  if (value instanceof Date) return value
  if (typeof (value as any).toDate === 'function') return (value as any).toDate()
  return new Date(value as any)
}

export function MarkingTimeline({ markings, summary }: MarkingTimelineProps) {
  const sorted = [...markings].sort(
    (a, b) => toSafeDate(a.timestamp).getTime() - toSafeDate(b.timestamp).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Nenhum registro encontrado
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border" />

        {sorted.map((marking, index) => {
          const config = MARKING_CONFIG[marking.type]
          const Icon = config.icon
          const timestamp = toSafeDate(marking.timestamp)

          return (
            <div key={marking.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {/* Dot on timeline */}
              <div
                className={cn(
                  'absolute left-[-15px] top-1 h-[14px] w-[14px] rounded-full border-2 border-white shadow-sm z-10',
                  config.dotColor
                )}
              />

              {/* Content */}
              <div className="flex flex-1 items-center justify-between min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                  <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {marking.geolocation && (
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-sm font-mono tabular-nums">
                    {format(timestamp, 'HH:mm:ss')}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <Badge variant="secondary" className="text-xs">
            Total: {formatMinutes(summary.totalWorkedMinutes)}
          </Badge>
          {summary.totalBreakMinutes > 0 && (
            <Badge variant="outline" className="text-xs">
              Intervalo: {formatMinutes(summary.totalBreakMinutes)}
            </Badge>
          )}
          <Badge
            variant={
              summary.status === 'complete'
                ? 'success'
                : summary.status === 'absent'
                  ? 'destructive'
                  : 'warning'
            }
            className="text-xs"
          >
            {summary.status === 'complete'
              ? 'Completo'
              : summary.status === 'absent'
                ? 'Ausente'
                : 'Incompleto'}
          </Badge>
        </div>
      )}
    </div>
  )
}
