'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2, Clock, MapPin, CalendarDays, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { WorkSchedule } from '@/types/time-tracking'
import { WorkplaceLocation } from '@/types/time-tracking'
import { WorkScheduleForm } from '@/components/time-tracking/settings/WorkScheduleForm'
import { LocationForm } from '@/components/time-tracking/settings/LocationForm'
import { HolidayCalendar } from '@/components/time-tracking/settings/HolidayCalendar'

const DAY_LABELS_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
}

const COMPENSATION_LABELS: Record<string, string> = {
  late_entry: 'Entrada tardia',
  early_exit: 'Saida antecipada',
  weekly_off: 'Folga semanal',
  payment_55: 'Pagamento 55%',
}

function formatWorkDays(schedule: WorkSchedule): string {
  const ws = schedule.weeklySchedule
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    if (ws[i]?.isWorkDay) {
      days.push(DAY_LABELS_SHORT[i])
    }
  }
  return days.join(', ')
}

export default function SettingsPage() {
  const { isAdmin } = usePermissions()
  const [activeTab, setActiveTab] = useState('schedules')

  // Schedules state
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null)

  // Locations state
  const [locations, setLocations] = useState<WorkplaceLocation[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<WorkplaceLocation | null>(null)

  const fetchSchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true)
      const response = await fetch('/api/work-schedules')
      const result = await response.json()
      if (result.success) {
        setSchedules(result.data)
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      toast.error('Erro ao carregar escalas')
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true)
      const response = await fetch('/api/workplace-locations')
      const result = await response.json()
      if (result.success) {
        setLocations(result.data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Erro ao carregar locais')
    } finally {
      setLocationsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetchLocations()
  }, [fetchSchedules, fetchLocations])

  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a escala "${name}"?`)) return

    try {
      const response = await fetch(`/api/work-schedules/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Escala excluida com sucesso!')
        setSchedules((prev) => prev.filter((s) => s.id !== id))
      } else {
        toast.error(result.error || 'Erro ao excluir escala')
      }
    } catch (error) {
      toast.error('Erro ao excluir escala')
    }
  }

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o local "${name}"?`)) return

    try {
      const response = await fetch(`/api/workplace-locations/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Local excluido com sucesso!')
        setLocations((prev) => prev.filter((l) => l.id !== id))
      } else {
        toast.error(result.error || 'Erro ao excluir local')
      }
    } catch (error) {
      toast.error('Erro ao excluir local')
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Configuracoes do Ponto</h1>
          <p className="text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Configuracoes do Ponto</h1>
        <p className="text-muted-foreground">
          Gerencie escalas de trabalho, locais e feriados
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="cursor-pointer">
            <Clock className="h-4 w-4 mr-2" />
            Escalas
          </TabsTrigger>
          <TabsTrigger value="locations" className="cursor-pointer">
            <MapPin className="h-4 w-4 mr-2" />
            Locais
          </TabsTrigger>
          <TabsTrigger value="holidays" className="cursor-pointer">
            <CalendarDays className="h-4 w-4 mr-2" />
            Feriados
          </TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Escalas de Trabalho</CardTitle>
                <CardDescription>
                  Configure as escalas de trabalho e atribua aos funcionarios
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSchedule(null)
                  setShowScheduleForm(true)
                }}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Escala
              </Button>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Settings className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nenhuma escala cadastrada</p>
                  <p className="text-sm mt-1">Crie uma nova escala de trabalho para comecar</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Valor/Hora</TableHead>
                        <TableHead>Almoco</TableHead>
                        <TableHead>Compensacao</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell className="text-sm">{formatWorkDays(schedule)}</TableCell>
                          <TableCell>R$ {schedule.hourlyRate.toFixed(2)}</TableCell>
                          <TableCell>{schedule.lunchBreakMinimum} min</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {COMPENSATION_LABELS[schedule.lunchCompensation] || schedule.lunchCompensation}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSchedule(schedule)
                                  setShowScheduleForm(true)
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSchedule(schedule.id, schedule.name)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Locais de Trabalho</CardTitle>
                <CardDescription>
                  Configure os locais de trabalho com geofence para referencia
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingLocation(null)
                  setShowLocationForm(true)
                }}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Local
              </Button>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nenhum local cadastrado</p>
                  <p className="text-sm mt-1">Adicione um local de trabalho para configurar geofence</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Endereco</TableHead>
                        <TableHead>Raio</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{location.address}</TableCell>
                          <TableCell>{location.radiusMeters}m</TableCell>
                          <TableCell>
                            <Badge variant={location.isActive ? 'default' : 'secondary'}>
                              {location.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingLocation(location)
                                  setShowLocationForm(true)
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocation(location.id, location.name)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <CardTitle>Calendario de Feriados</CardTitle>
              <CardDescription>
                Gerencie os feriados nacionais, estaduais e municipais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HolidayCalendar isAdmin={isAdmin} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Form Dialog */}
      {showScheduleForm && (
        <WorkScheduleForm
          schedule={editingSchedule}
          open={showScheduleForm}
          onOpenChange={(open) => {
            setShowScheduleForm(open)
            if (!open) setEditingSchedule(null)
          }}
          onSuccess={fetchSchedules}
        />
      )}

      {/* Location Form Dialog */}
      {showLocationForm && (
        <LocationForm
          location={editingLocation}
          open={showLocationForm}
          onOpenChange={(open) => {
            setShowLocationForm(open)
            if (!open) setEditingLocation(null)
          }}
          onSuccess={fetchLocations}
        />
      )}
    </div>
  )
}
