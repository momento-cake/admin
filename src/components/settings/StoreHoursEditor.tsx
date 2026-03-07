'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, Loader2 } from 'lucide-react'
import { DIAS_SEMANA, StoreHours } from '@/types/store-settings'
import { useAuth } from '@/hooks/useAuth'
import { formatErrorMessage } from '@/lib/error-handler'

interface DayRow {
  diaSemana: number
  diaSemanaLabel: string
  abreAs: string
  fechaAs: string
  fechado: boolean
}

export function StoreHoursEditor() {
  const { userModel } = useAuth()
  const [days, setDays] = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/store-hours')
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Erro ao carregar horários')
        const hours = result.data as StoreHours[]
        setDays(
          DIAS_SEMANA.map((d) => {
            const existing = hours.find((h: StoreHours) => h.diaSemana === d.diaSemana)
            return {
              diaSemana: d.diaSemana,
              diaSemanaLabel: d.label,
              abreAs: existing?.abreAs || '08:00',
              fechaAs: existing?.fechaAs || '18:00',
              fechado: existing?.fechado ?? (d.diaSemana === 0),
            }
          })
        )
      } catch (error) {
        toast.error('Erro ao carregar horários', {
          description: formatErrorMessage(error),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateDay = (index: number, field: keyof DayRow, value: string | boolean) => {
    setDays((prev) =>
      prev.map((day, i) =>
        i === index ? { ...day, [field]: value } : day
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/store-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: days.map((d) => ({
            diaSemana: d.diaSemana,
            diaSemanaLabel: d.diaSemanaLabel,
            abreAs: d.abreAs,
            fechaAs: d.fechaAs,
            fechado: d.fechado,
          })),
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao salvar horários')
      toast.success('Horários salvos com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar horários', {
        description: formatErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os horários de funcionamento da loja para cada dia da semana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mobile card layout */}
        <div className="block md:hidden space-y-3">
          {days.map((day, index) => (
            <div
              key={day.diaSemana}
              className={`p-4 rounded-lg border space-y-3 ${
                day.fechado ? 'bg-muted/50 opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <Label className="font-medium text-sm">
                  {day.diaSemanaLabel}
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`fechado-mobile-${day.diaSemana}`}
                    checked={day.fechado}
                    onCheckedChange={(checked) =>
                      updateDay(index, 'fechado', checked === true)
                    }
                  />
                  <Label
                    htmlFor={`fechado-mobile-${day.diaSemana}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Fechado
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Abre</Label>
                  <Input
                    type="time"
                    value={day.abreAs}
                    onChange={(e) => updateDay(index, 'abreAs', e.target.value)}
                    disabled={day.fechado}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha</Label>
                  <Input
                    type="time"
                    value={day.fechaAs}
                    onChange={(e) => updateDay(index, 'fechaAs', e.target.value)}
                    disabled={day.fechado}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop grid layout */}
        <div className="hidden md:block space-y-3">
          {days.map((day, index) => (
            <div
              key={day.diaSemana}
              className={`grid grid-cols-[140px_1fr_1fr_auto] gap-3 items-center p-3 rounded-lg border ${
                day.fechado ? 'bg-muted/50 opacity-60' : ''
              }`}
            >
              <Label className="font-medium text-sm">
                {day.diaSemanaLabel}
              </Label>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Abre</Label>
                <Input
                  type="time"
                  value={day.abreAs}
                  onChange={(e) => updateDay(index, 'abreAs', e.target.value)}
                  disabled={day.fechado}
                  className="h-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Fecha</Label>
                <Input
                  type="time"
                  value={day.fechaAs}
                  onChange={(e) => updateDay(index, 'fechaAs', e.target.value)}
                  disabled={day.fechado}
                  className="h-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`fechado-${day.diaSemana}`}
                  checked={day.fechado}
                  onCheckedChange={(checked) =>
                    updateDay(index, 'fechado', checked === true)
                  }
                />
                <Label
                  htmlFor={`fechado-${day.diaSemana}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Fechado
                </Label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Horários'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
