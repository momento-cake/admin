'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Holiday, HolidayType } from '@/types/time-tracking'

const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  national: 'Nacional',
  state: 'Estadual',
  municipal: 'Municipal',
}

const HOLIDAY_TYPE_COLORS: Record<HolidayType, string> = {
  national: 'bg-blue-100 text-blue-800',
  state: 'bg-green-100 text-green-800',
  municipal: 'bg-amber-100 text-amber-800',
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

interface HolidayCalendarProps {
  isAdmin: boolean
}

export function HolidayCalendar({ isAdmin }: HolidayCalendarProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Add form state
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HolidayType>('national')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/holidays?year=${year}`)
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar feriados')
      }
      setHolidays(result.data)
    } catch (error) {
      console.error('Error fetching holidays:', error)
      toast.error('Erro ao carregar feriados')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const handleSeedHolidays = async () => {
    try {
      setSeeding(true)
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed', year }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar feriados nacionais')
      }

      if (result.data.length === 0) {
        toast.info('Todos os feriados nacionais ja estao cadastrados para este ano')
      } else {
        toast.success(`${result.data.length} feriados adicionados com sucesso!`)
      }
      await fetchHolidays()
    } catch (error) {
      console.error('Error seeding holidays:', error)
      toast.error('Erro ao carregar feriados nacionais')
    } finally {
      setSeeding(false)
    }
  }

  const handleAddHoliday = async () => {
    setAddError(null)

    if (!newDate) {
      setAddError('Data e obrigatoria')
      return
    }

    if (!newName.trim()) {
      setAddError('Nome do feriado e obrigatorio')
      return
    }

    try {
      setAddLoading(true)

      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          name: newName.trim(),
          type: newType,
          year: parseInt(newDate.split('-')[0]),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao adicionar feriado')
      }

      toast.success('Feriado adicionado com sucesso!')
      setShowAddDialog(false)
      setNewDate('')
      setNewName('')
      setNewType('national')
      await fetchHolidays()
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Erro ao adicionar feriado')
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o feriado "${name}"?`)) return

    try {
      const response = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir feriado')
      }
      toast.success('Feriado excluido com sucesso!')
      setHolidays((prev) => prev.filter((h) => h.id !== id))
    } catch (error) {
      console.error('Error deleting holiday:', error)
      toast.error('Erro ao excluir feriado')
    }
  }

  return (
    <div className="space-y-4">
      {/* Year selector + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[4rem] text-center">{year}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedHolidays}
              disabled={seeding}
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Carregar Feriados Nacionais
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Feriado
            </Button>
          </div>
        )}
      </div>

      {/* Holiday list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Nenhum feriado cadastrado para {year}</p>
          {isAdmin && (
            <p className="text-sm mt-1">
              Clique em &quot;Carregar Feriados Nacionais&quot; para adicionar automaticamente
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                {isAdmin && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDateBR(holiday.date)}
                  </TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={HOLIDAY_TYPE_COLORS[holiday.type]}>
                      {HOLIDAY_TYPE_LABELS[holiday.type]}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Feriado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {addError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="holiday-date">Data</Label>
              <Input
                id="holiday-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-name">Nome</Label>
              <Input
                id="holiday-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Dia da Consciencia Negra"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as HolidayType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">Nacional</SelectItem>
                  <SelectItem value="state">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addLoading}>
              Cancelar
            </Button>
            <Button onClick={handleAddHoliday} disabled={addLoading}>
              {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {addLoading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
