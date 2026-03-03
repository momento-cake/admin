'use client'

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { useTimeEntries } from '@/hooks/useTimeTracking'
import { MarkingTimeline } from './MarkingTimeline'
import { TimeEntry, TimeEntryStatus } from '@/types/time-tracking'
import { Calendar, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}

const STATUS_CONFIG: Record<TimeEntryStatus, {
  label: string
  dotColor: string
  variant: 'success' | 'warning' | 'destructive' | 'secondary'
}> = {
  complete: {
    label: 'Completo',
    dotColor: 'bg-green-500',
    variant: 'success',
  },
  incomplete: {
    label: 'Incompleto',
    dotColor: 'bg-yellow-500',
    variant: 'warning',
  },
  absent: {
    label: 'Ausente',
    dotColor: 'bg-red-500',
    variant: 'destructive',
  },
  justified_absence: {
    label: 'Falta Justificada',
    dotColor: 'bg-blue-500',
    variant: 'secondary',
  },
  day_off: {
    label: 'Folga',
    dotColor: 'bg-gray-400',
    variant: 'secondary',
  },
}

interface DayRowProps {
  date: string
  entry?: TimeEntry
}

function DayRow({ date, entry }: DayRowProps) {
  const dateObj = new Date(date + 'T12:00:00')
  const status = entry?.summary?.status || 'absent'
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.absent
  const totalMinutes = entry?.summary?.totalWorkedMinutes || 0

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer text-left">
        <div className="flex items-center gap-3">
          <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', config.dotColor)} />
          <div>
            <div className="text-sm font-medium capitalize">
              {format(dateObj, 'EEEE', { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(dateObj, "dd 'de' MMM", { locale: ptBR })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalMinutes > 0 && (
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {formatMinutes(totalMinutes)}
            </span>
          )}
          <Badge variant={config.variant} className="text-[10px]">
            {config.label}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3 pt-1">
          {entry && entry.markings.length > 0 ? (
            <MarkingTimeline markings={entry.markings} summary={entry.summary} />
          ) : (
            <div className="py-3 text-center text-xs text-muted-foreground">
              Sem registros neste dia
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function RecentDays() {
  const today = new Date()
  const startDate = format(subDays(today, 7), 'yyyy-MM-dd')
  const endDate = format(subDays(today, 1), 'yyyy-MM-dd')

  const { entries, loading } = useTimeEntries({
    startDate,
    endDate,
  })

  const days = useMemo(() => {
    const result: { date: string; entry?: TimeEntry }[] = []
    for (let i = 1; i <= 7; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd')
      const entry = entries.find((e) => e.date === date)
      result.push({ date, entry })
    }
    return result
  }, [entries, today])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Ultimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="divide-y">
            {days.map((day) => (
              <DayRow key={day.date} date={day.date} entry={day.entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
