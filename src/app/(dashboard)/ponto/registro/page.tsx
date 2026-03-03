'use client'

import { usePermissions } from '@/hooks/usePermissions'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { ClockWidget } from '@/components/time-tracking/ClockWidget'
import { TodayMarkings } from '@/components/time-tracking/TodayMarkings'
import { RecentDays } from '@/components/time-tracking/RecentDays'

export default function PontoRegistroPage() {
  const { canAccess, canPerformAction, loading } = usePermissions()
  const timeTracking = useTimeTracking()

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Registro de Ponto</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const hasAccess = canAccess('time_tracking')
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Registro de Ponto</h1>
          <p className="text-muted-foreground">
            Voce nao tem permissao para acessar esta pagina.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Registro de Ponto</h1>
        <p className="text-muted-foreground">
          Registre sua entrada, saida e intervalos do dia
        </p>
      </div>

      {/* Clock Widget */}
      <ClockWidget timeTracking={timeTracking} />

      {/* Today's Markings */}
      <TodayMarkings todayEntry={timeTracking.todayEntry} loading={timeTracking.loading} />

      {/* Recent Days */}
      <RecentDays />
    </div>
  )
}
