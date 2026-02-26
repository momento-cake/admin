'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { RelatedPerson, RelationshipType } from '@/types/client'

interface RelatedPersonsSectionProps {
  isAdding?: boolean
  onShowAddForm?: () => void
  onHideAddForm?: () => void
  relatedPersons: RelatedPerson[]
  onAdd: (person: RelatedPerson) => void
  onUpdate: (index: number, person: RelatedPerson) => void
  onRemove: (index: number) => void
}

const RELATIONSHIP_TYPES: { label: string; value: RelationshipType }[] = [
  { label: 'Filho(a)', value: 'child' },
  { label: 'Pai/Mãe', value: 'parent' },
  { label: 'Irmão(ã)', value: 'sibling' },
  { label: 'Amigo(a)', value: 'friend' },
  { label: 'Cônjuge', value: 'spouse' },
  { label: 'Outro', value: 'other' }
]

export function RelatedPersonsSection({
  isAdding: parentIsAdding = false,
  onShowAddForm: parentOnShowAddForm,
  onHideAddForm: parentOnHideAddForm,
  relatedPersons,
  onAdd,
  onUpdate,
  onRemove
}: RelatedPersonsSectionProps) {
  const [localIsAdding, setLocalIsAdding] = useState(false)
  // Use parent-managed state if provided, otherwise fall back to local state
  const isAdding = parentOnShowAddForm !== undefined ? parentIsAdding : localIsAdding
  const setIsAdding = parentOnShowAddForm !== undefined ? (value: boolean) => {
    if (value) parentOnShowAddForm()
    else parentOnHideAddForm?.()
  } : setLocalIsAdding
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<RelatedPerson>({
    id: '',
    name: '',
    relationship: 'child',
    email: '',
    phone: '',
    birthDate: '',
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      relationship: 'child',
      email: '',
      phone: '',
      birthDate: '',
      notes: ''
    })
    setIsAdding(false)
    setEditingIndex(null)
  }

  const handleEdit = (index: number) => {
    setFormData(relatedPersons[index])
    setEditingIndex(index)
    setIsAdding(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Nome da pessoa relacionada é obrigatório')
      return
    }

    if (!formData.relationship) {
      alert('Selecione o tipo de relacionamento')
      return
    }

    const personToSave: RelatedPerson = {
      ...formData,
      id: formData.id || Date.now().toString()
    }

    if (editingIndex !== null) {
      onUpdate(editingIndex, personToSave)
    } else {
      onAdd(personToSave)
    }

    resetForm()
  }

  const getRelationshipLabel = (value: RelationshipType) => {
    return RELATIONSHIP_TYPES.find(t => t.value === value)?.label || value
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between relative z-0">
        <h3 className="text-lg font-semibold text-foreground">Pessoas Relacionadas</h3>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsAdding(true)
            }}
            className="flex items-center gap-2 relative z-10"
          >
            <Plus className="w-4 h-4" />
            Adicionar Pessoa
          </Button>
        )}
      </div>

      {/* List of Related Persons */}
      {relatedPersons.length > 0 && !isAdding && (
        <div className="space-y-2">
          {relatedPersons.map((person, index) => (
            <Card key={person.id} className="p-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{person.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getRelationshipLabel(person.relationship)}
                  </p>
                  {person.birthDate && (
                    <p className="text-sm text-muted-foreground">
                      Nasc: {formatDate(person.birthDate)}
                    </p>
                  )}
                </div>
                {(person.email || person.phone) && (
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {person.email && <span>{person.email}</span>}
                    {person.phone && <span>{person.phone}</span>}
                  </div>
                )}
                {person.notes && (
                  <p className="text-sm text-muted-foreground mt-1 italic truncate">{person.notes}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0 mt-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(index)}
                  className="text-primary hover:text-primary/80"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form for Adding/Editing */}
      {isAdding && (
        <Card className="p-4 bg-muted">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Relacionamento *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value as RelationshipType })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {RELATIONSHIP_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Observações adicionais"
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSubmit(e as any)
                }}
              >
                {editingIndex !== null ? 'Atualizar Pessoa' : 'Adicionar Pessoa'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {relatedPersons.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground italic">
          Nenhuma pessoa relacionada adicionada
        </p>
      )}
    </div>
  )
}
