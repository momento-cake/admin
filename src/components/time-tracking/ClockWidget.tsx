'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGeolocation } from '@/hooks/useGeolocation'
import { MarkingType } from '@/types/time-tracking'
import {
  Clock,
  PlayCircle,
  Coffee,
  UtensilsCrossed,
  LogOut,
  CheckCircle,
  MapPin,
  Loader2,
} from 'lucide-react'

const ACTION_CONFIG: Record<string, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  className: string
}> = {
  clock_in: {
    label: 'Registrar Entrada',
    icon: PlayCircle,
    className: 'bg-green-600 hover:bg-green-700 text-white',
  },
  lunch_out: {
    label: 'Registrar Saida p/ Almoco',
    icon: Coffee,
    className: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  lunch_in: {
    label: 'Registrar Retorno do Almoco',
    icon: UtensilsCrossed,
    className: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  clock_out: {
    label: 'Registrar Saida',
    icon: LogOut,
    className: 'bg-red-600 hover:bg-red-700 text-white',
  },
  completed: {
    label: 'Dia Completo',
    icon: CheckCircle,
    className: 'bg-gray-400 text-white cursor-not-allowed',
  },
}

const ACTION_SUCCESS_MESSAGES: Record<string, string> = {
  clock_in: 'Entrada registrada com sucesso!',
  lunch_out: 'Saida para almoco registrada!',
  lunch_in: 'Retorno do almoco registrado!',
  clock_out: 'Saida registrada com sucesso!',
}

function GeoStatusBadge({ position, loading, error }: {
  position: { latitude: number; longitude: number; accuracy: number } | null
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Capturando GPS...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <MapPin className="h-3 w-3" />
        GPS indisponivel
      </Badge>
    )
  }

  if (position) {
    return (
      <Badge variant="success" className="text-xs gap-1">
        <MapPin className="h-3 w-3" />
        GPS capturado
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <MapPin className="h-3 w-3" />
      GPS pendente
    </Badge>
  )
}

interface ClockWidgetProps {
  timeTracking: {
    todayEntry: import('@/types/time-tracking').TimeEntry | null
    loading: boolean
    nextAction: MarkingType | null
    clockIn: (options?: any) => Promise<void>
    clockLunchOut: (options?: any) => Promise<void>
    clockLunchIn: (options?: any) => Promise<void>
    clockOut: (options?: any) => Promise<void>
  }
}

export function ClockWidget({ timeTracking }: ClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClocking, setIsClocking] = useState(false)
  const {
    todayEntry,
    loading: trackingLoading,
    nextAction,
    clockIn,
    clockLunchOut,
    clockLunchIn,
    clockOut,
  } = timeTracking
  const { position, loading: geoLoading, error: geoError, requestPermission } = useGeolocation()

  // Request geolocation on mount
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleClock = useCallback(async () => {
    if (!nextAction || isClocking) return

    setIsClocking(true)
    try {
      const geoOptions = position
        ? {
            geolocation: {
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy,
              capturedAt: new Date(),
            },
          }
        : undefined

      switch (nextAction) {
        case 'clock_in':
          await clockIn(geoOptions)
          break
        case 'lunch_out':
          await clockLunchOut(geoOptions)
          break
        case 'lunch_in':
          await clockLunchIn(geoOptions)
          break
        case 'clock_out':
          await clockOut(geoOptions)
          break
      }

      toast.success(ACTION_SUCCESS_MESSAGES[nextAction] || 'Ponto registrado!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar ponto'
      toast.error(message)
    } finally {
      setIsClocking(false)
    }
  }, [nextAction, isClocking, position, clockIn, clockLunchOut, clockLunchIn, clockOut])

  const actionKey = nextAction || 'completed'
  const config = ACTION_CONFIG[actionKey]
  const ActionIcon = config.icon
  const isCompleted = !nextAction

  return (
    <Card className="overflow-hidden">
      {/* Brown/gold gradient header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-700 px-6 py-4">
        <div className="flex items-center gap-2 text-amber-100/80">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Registro de Ponto</span>
        </div>
      </div>

      <CardContent className="pt-6 pb-6 space-y-6">
        {/* Digital clock */}
        <div className="text-center space-y-1">
          <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums tracking-tight text-foreground">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-muted-foreground capitalize">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col items-center gap-3">
          {trackingLoading ? (
            <Button disabled className="h-14 px-8 text-lg gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando...
            </Button>
          ) : (
            <Button
              onClick={handleClock}
              disabled={isCompleted || isClocking}
              className={`h-14 px-8 text-lg gap-2 cursor-pointer ${config.className}`}
            >
              {isClocking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ActionIcon className="h-5 w-5" />
              )}
              {isClocking ? 'Registrando...' : config.label}
            </Button>
          )}

          {/* Geolocation status */}
          <GeoStatusBadge
            position={position}
            loading={geoLoading}
            error={geoError}
          />
        </div>
      </CardContent>
    </Card>
  )
}
