'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react'
import { SpecialDate, SpecialDateType, RelatedPerson } from '@/types/client'

interface SpecialDatesSectionProps {
  isAdding?: boolean
  onShowAddForm?: () => void
  onHideAddForm?: () => void
  specialDates: SpecialDate[]
  relatedPersons?: RelatedPerson[]
  onAdd: (date: SpecialDate) => void
  onUpdate: (index: number, date: SpecialDate) => void
  onRemove: (index: number) => void
}

const SPECIAL_DATE_TYPES: { label: string; value: SpecialDateType; icon: string }[] = [
  { label: 'Aniversário', value: 'birthday', icon: '🎂' },
  { label: 'Aniversário de Casamento', value: 'anniversary', icon: '💍' },
  { label: 'Data Customizada', value: 'custom', icon: '📅' }
]

export function SpecialDatesSection({
  isAdding: parentIsAdding = false,
  onShowAddForm: parentOnShowAddForm,
  onHideAddForm: parentOnHideAddForm,
  specialDates,
  relatedPersons = [],
  onAdd,
  onUpdate,
  onRemove
}: SpecialDatesSectionProps) {
  const [localIsAdding, setLocalIsAdding] = useState(false)
  // Use parent-managed state if provided, otherwise fall back to local state
  const isAdding = parentOnShowAddForm !== undefined ? parentIsAdding : localIsAdding
  const setIsAdding = parentOnShowAddForm !== undefined ? (value: boolean) => {
    if (value) parentOnShowAddForm()
    else parentOnHideAddForm?.()
  } : setLocalIsAdding
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<SpecialDate>({
    id: '',
    date: '',
    type: 'birthday',
    description: '',
    relatedPersonId: undefined,
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      id: '',
      date: '',
      type: 'birthday',
      description: '',
      relatedPersonId: undefined,
      notes: ''
    })
    setIsAdding(false)
    setEditingIndex(null)
  }

  const handleEdit = (index: number) => {
    setFormData(specialDates[index])
    setEditingIndex(index)
    setIsAdding(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date) {
      alert('Data é obrigatória')
      return
    }

    if (!formData.description.trim()) {
      alert('Descrição é obrigatória')
      return
    }

    const dateToSave: SpecialDate = {
      ...formData,
      id: formData.id || Date.now().toString()
    }

    if (editingIndex !== null) {
      onUpdate(editingIndex, dateToSave)
    } else {
      onAdd(dateToSave)
    }

    resetForm()
  }

  const getDateTypeLabel = (value: SpecialDateType) => {
    return SPECIAL_DATE_TYPES.find(t => t.value === value)?.label || value
  }

  const getDateTypeIcon = (value: SpecialDateType) => {
    return SPECIAL_DATE_TYPES.find(t => t.value === value)?.icon || '📅'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const getDaysUntil = (dateString: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const targetYear = new Date().getFullYear()
    const [year, month, day] = dateString.split('-')
    const targetDate = new Date(
      parseInt(month) === new Date().getMonth() + 1 && parseInt(day) < today.getDate()
        ? targetYear + 1
        : targetYear,
      parseInt(month) - 1,
      parseInt(day)
    )

    const diffTime = targetDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getRelatedPersonName = (personId?: string) => {
    if (!personId) return null
    return relatedPersons.find(p => p.id === personId)?.name
  }

  const sortedDates = [...specialDates].sort((a, b) => {
    const daysA = getDaysUntil(a.date)
    const daysB = getDaysUntil(b.date)
    return daysA - daysB
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between relative z-0">
        <h3 className="text-lg font-semibold text-gray-900">Datas Especiais</h3>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('SpecialDatesSection: Add button clicked')
              setIsAdding(true)
            }}
            className="flex items-center gap-2 relative z-10"
          >
            <Plus className="w-4 h-4" />
            Adicionar Data
          </Button>
        )}
      </div>

      {/* List of Special Dates */}
      {specialDates.length > 0 && !isAdding && (
        <div className="space-y-2">
          {sortedDates.map((date, originalIndex) => {
            const daysUntil = getDaysUntil(date.date)
            const relatedPerson = getRelatedPersonName(date.relatedPersonId)
            const actualIndex = specialDates.findIndex(d => d.id === date.id)

            return (
              <Card key={date.id} className="p-3 flex items-start justify-between gap-4 hover:bg-gray-50 transition">
                <div className="flex gap-3 flex-1 min-w-0">
                  <div className="text-xl flex-shrink-0">
                    {getDateTypeIcon(date.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{date.description}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(date.date)}
                      </p>
                      {daysUntil === 0 && <span className="text-red-600 font-semibold text-xs">Hoje! 🎉</span>}
                      {daysUntil === 1 && <span className="text-orange-600 text-xs">Amanhã!</span>}
                      {daysUntil > 1 && daysUntil <= 30 && <span className="text-blue-600 text-xs">Em {daysUntil} dias</span>}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
                      <span>{getDateTypeLabel(date.type)}</span>
                      {relatedPerson && <span>→ {relatedPerson}</span>}
                      {date.notes && <span className="italic truncate">({date.notes})</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 mt-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(actualIndex)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(actualIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Form for Adding/Editing */}
      {isAdding && (
        <Card className="p-4 bg-gray-50">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Data *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as SpecialDateType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SPECIAL_DATE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Aniversário do João, Aniversário de Casamento"
                />
              </div>

              {relatedPersons.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pessoa Relacionada (Opcional)
                  </label>
                  <select
                    value={formData.relatedPersonId || ''}
                    onChange={(e) => setFormData({ ...formData, relatedPersonId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma</option>
                    {relatedPersons.map(person => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações ou detalhes adicionais"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSubmit(e as any)
                }}
              >
                {editingIndex !== null ? 'Atualizar Data' : 'Adicionar Data'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {specialDates.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 italic">
          Nenhuma data especial adicionada
        </p>
      )}
    </div>
  )
}
