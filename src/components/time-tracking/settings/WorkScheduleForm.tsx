'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { WorkSchedule, LunchCompensation, DaySchedule, MIN_HOURLY_RATE, MIN_LUNCH_BREAK_MINUTES } from '@/types/time-tracking'

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terca-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sabado',
}

const COMPENSATION_OPTIONS: { value: LunchCompensation; label: string }[] = [
  { value: 'late_entry', label: 'Entrada tardia' },
  { value: 'early_exit', label: 'Saida antecipada' },
  { value: 'weekly_off', label: 'Folga semanal' },
  { value: 'payment_55', label: 'Pagamento 55%' },
]

const DEFAULT_WEEKLY_SCHEDULE: Record<number, DaySchedule> = {
  0: { isWorkDay: false },
  1: { isWorkDay: true, expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 },
  2: { isWorkDay: true, expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 },
  3: { isWorkDay: true, expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 },
  4: { isWorkDay: true, expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 },
  5: { isWorkDay: true, expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 },
  6: { isWorkDay: false },
}

interface WorkScheduleFormProps {
  schedule?: WorkSchedule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WorkScheduleForm({ schedule, open, onOpenChange, onSuccess }: WorkScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(schedule?.name ?? '')
  const [hourlyRate, setHourlyRate] = useState(schedule?.hourlyRate?.toString() ?? '')
  const [lunchBreakMinimum, setLunchBreakMinimum] = useState(
    schedule?.lunchBreakMinimum?.toString() ?? '60'
  )
  const [lunchCompensation, setLunchCompensation] = useState<LunchCompensation>(
    schedule?.lunchCompensation ?? 'late_entry'
  )
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>(
    schedule?.weeklySchedule
      ? Object.fromEntries(
          Object.entries(schedule.weeklySchedule).map(([k, v]) => [Number(k), v])
        )
      : { ...DEFAULT_WEEKLY_SCHEDULE }
  )

  const updateDay = (day: number, updates: Partial<DaySchedule>) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...updates },
    }))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Nome da escala e obrigatorio')
      return
    }

    const rate = parseFloat(hourlyRate)
    if (isNaN(rate) || rate < MIN_HOURLY_RATE) {
      setError(`Valor hora minimo e R$ ${MIN_HOURLY_RATE.toFixed(2)} conforme CCT`)
      return
    }

    const breakMin = parseInt(lunchBreakMinimum)
    if (isNaN(breakMin) || breakMin < MIN_LUNCH_BREAK_MINUTES) {
      setError(`Intervalo minimo de almoco e ${MIN_LUNCH_BREAK_MINUTES} minutos`)
      return
    }

    // Validate work days have start/end times
    for (const [day, config] of Object.entries(weeklySchedule)) {
      if (config.isWorkDay && (!config.expectedStart || !config.expectedEnd)) {
        setError(`${DAY_LABELS[Number(day)]}: horario de inicio e fim sao obrigatorios para dias uteis`)
        return
      }
    }

    try {
      setLoading(true)

      // Convert weeklySchedule keys to strings for the API (Zod schema expects string keys)
      const weeklyScheduleForApi = Object.fromEntries(
        Object.entries(weeklySchedule).map(([key, val]) => [
          String(key),
          val.isWorkDay
            ? val
            : { isWorkDay: false },
        ])
      )

      const body = {
        name: name.trim(),
        hourlyRate: rate,
        lunchBreakMinimum: breakMin,
        lunchCompensation,
        weeklySchedule: weeklyScheduleForApi,
        effectiveFrom: schedule?.effectiveFrom ?? new Date().toISOString(),
        isActive: true,
        // userId is required by schema - use empty string for template schedules
        userId: schedule?.userId ?? 'template',
      }

      const method = schedule ? 'PUT' : 'POST'
      const url = schedule
        ? `/api/work-schedules/${schedule.id}`
        : '/api/work-schedules'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Erro ao salvar escala')
        return
      }

      toast.success(schedule ? 'Escala atualizada com sucesso!' : 'Escala criada com sucesso!')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar escala')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Editar Escala' : 'Nova Escala de Trabalho'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Nome da Escala</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Turno Manha, Turno Tarde"
            />
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourly-rate">
              Valor Hora (R$) <span className="text-xs text-muted-foreground">minimo R$ {MIN_HOURLY_RATE.toFixed(2)}</span>
            </Label>
            <Input
              id="hourly-rate"
              type="number"
              step="0.01"
              min={MIN_HOURLY_RATE}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder={MIN_HOURLY_RATE.toFixed(2)}
            />
          </div>

          {/* Weekly Schedule Grid */}
          <div className="space-y-3">
            <Label>Grade Semanal</Label>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div
                  key={day}
                  className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30"
                >
                  <div className="w-32 flex items-center gap-2">
                    <Switch
                      checked={weeklySchedule[day]?.isWorkDay ?? false}
                      onCheckedChange={(checked) =>
                        updateDay(day, {
                          isWorkDay: checked,
                          ...(checked && !weeklySchedule[day]?.expectedStart
                            ? { expectedStart: '06:00', expectedEnd: '14:00', expectedBreakMinutes: 60 }
                            : {}),
                        })
                      }
                    />
                    <span className="text-sm font-medium truncate">
                      {DAY_LABELS[day]}
                    </span>
                  </div>

                  {weeklySchedule[day]?.isWorkDay && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={weeklySchedule[day]?.expectedStart ?? '06:00'}
                        onChange={(e) => updateDay(day, { expectedStart: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">ate</span>
                      <Input
                        type="time"
                        value={weeklySchedule[day]?.expectedEnd ?? '14:00'}
                        onChange={(e) => updateDay(day, { expectedEnd: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                  )}

                  {!weeklySchedule[day]?.isWorkDay && (
                    <span className="text-sm text-muted-foreground italic">Folga</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lunch Break Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lunch-break">
                Intervalo Almoco (min) <span className="text-xs text-muted-foreground">minimo {MIN_LUNCH_BREAK_MINUTES}</span>
              </Label>
              <Input
                id="lunch-break"
                type="number"
                min={MIN_LUNCH_BREAK_MINUTES}
                value={lunchBreakMinimum}
                onChange={(e) => setLunchBreakMinimum(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Compensacao do Almoco</Label>
              <Select
                value={lunchCompensation}
                onValueChange={(v) => setLunchCompensation(v as LunchCompensation)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COMPENSATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? 'Salvando...' : schedule ? 'Atualizar' : 'Criar Escala'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
