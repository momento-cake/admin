'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimeEntry } from '@/types/time-tracking'
import { MarkingTimeline } from './MarkingTimeline'
import { Clock } from 'lucide-react'

interface TodayMarkingsProps {
  todayEntry: TimeEntry | null
  loading: boolean
}

export function TodayMarkings({ todayEntry, loading }: TodayMarkingsProps) {

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Registros de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    )
  }

  const markings = todayEntry?.markings || []
  const summary = todayEntry?.summary

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Registros de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {markings.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhum registro hoje
          </div>
        ) : (
          <MarkingTimeline markings={markings} summary={summary} />
        )}
      </CardContent>
    </Card>
  )
}
