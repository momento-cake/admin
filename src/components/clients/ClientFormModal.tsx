'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Loader2, Trash2, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Client, ClientType, Address, RelatedPerson, SpecialDate } from '@/types/client'
import { getContactFieldConfig } from '@/lib/masks'
import { toast } from 'sonner'
import { AddressesSection } from './AddressesSection'
import { RelatedPersonsSection } from './RelatedPersonsSection'
import { SpecialDatesSection } from './SpecialDatesSection'

interface ClientFormModalProps {
  client?: Client | null
  onClose: () => void
  onSuccess: () => void
}

export function ClientFormModal({ client, onClose, onSuccess }: ClientFormModalProps) {
  const [clientType, setClientType] = useState<ClientType>(client?.type || 'person')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showAddPersonForm, setShowAddPersonForm] = useState(false)
  const [showAddDateForm, setShowAddDateForm] = useState(false)
  const [formData, setFormData] = useState({
    type: client?.type || ('person' as ClientType),
    name: client?.name || '',
    cpfCnpj: client?.cpfCnpj || '',
    contactMethods: client?.contactMethods && client.contactMethods.length > 0
      ? client.contactMethods
      : [{ id: '1', type: 'phone' as const, value: '', isPrimary: true, notes: '' }],
    addresses: client?.addresses || [] as Address[],
    notes: client?.notes || '',
    tags: client?.tags || [],
    relatedPersons: client?.relatedPersons || [],
    specialDates: client?.specialDates || [],
    ...(client?.type === 'business' && {
      companyInfo: (client as any).companyInfo || {},
      representative: (client as any).representative || {}
    })
  })

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    let formattedValue = value
    if (name === 'cpfCnpj') {
      formattedValue = clientType === 'person' ? formatCPF(value) : formatCNPJ(value)
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório'
    if (formData.contactMethods.length === 0) {
      errors.contactMethods = 'Pelo menos um método de contato é obrigatório'
    } else {
      formData.contactMethods.forEach((cm, index) => {
        if (!cm.value.trim()) {
          errors[`contactMethod_${index}`] = 'Preencha o valor do contato'
        } else if ((cm.type === 'phone' || cm.type === 'whatsapp') && cm.value.replace(/\D/g, '').length < 10) {
          errors[`contactMethod_${index}`] = 'Telefone deve ter pelo menos 10 dígitos'
        } else if (cm.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cm.value)) {
          errors[`contactMethod_${index}`] = 'Email inválido'
        }
      })
    }
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Corrija os erros no formulário')
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setLoading(true)
      const submitData = {
        type: clientType,
        name: formData.name,
        cpfCnpj: formData.cpfCnpj || undefined,
        addresses: formData.addresses.length > 0 ? formData.addresses : undefined,
        contactMethods: formData.contactMethods,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        relatedPersons: formData.relatedPersons.length > 0 ? formData.relatedPersons : undefined,
        specialDates: formData.specialDates.length > 0 ? formData.specialDates : undefined,
        notes: formData.notes || undefined,
        ...(clientType === 'business' && {
          companyInfo: (formData as any).companyInfo,
          representative: (formData as any).representative
        })
      }

      const method = client ? 'PUT' : 'POST'
      const url = client ? `/api/clients/${client.id}` : '/api/clients'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()
      if (!result.success) {
        setValidationErrors({ submit: result.error || 'Erro ao salvar cliente' })
        return
      }

      onSuccess()
    } catch (err) {
      setValidationErrors({ submit: err instanceof Error ? err.message : 'Erro ao salvar cliente' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-xl font-semibold text-foreground">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {validationErrors.submit && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{validationErrors.submit}</span>
            </div>
          )}

          {/* Client Type */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">Tipo de Cliente</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="person"
                  checked={clientType === 'person'}
                  onChange={(e) => {
                    setClientType(e.target.value as ClientType)
                    setFormData(prev => ({ ...prev, type: 'person' }))
                  }}
                />
                <span>Pessoa Física</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="business"
                  checked={clientType === 'business'}
                  onChange={(e) => {
                    setClientType(e.target.value as ClientType)
                    setFormData(prev => ({ ...prev, type: 'business' }))
                  }}
                />
                <span>Pessoa Jurídica</span>
              </label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informações Básicas</h3>
            <div className="space-y-2">
              <Label>
                {clientType === 'person' ? 'Nome Completo' : 'Razão Social'} <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={clientType === 'person' ? 'João da Silva' : 'Empresa LTDA'}
                className={validationErrors.name ? 'border-destructive' : ''}
                data-error={!!validationErrors.name || undefined}
                aria-required
              />
              {validationErrors.name && <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">
                {clientType === 'person' ? 'CPF' : 'CNPJ'}
              </Label>
              <Input
                id="cpfCnpj"
                type="text"
                name="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-4">
            <h3 className="font-semibold">Métodos de Contato <span className="text-destructive">*</span></h3>
            {validationErrors.contactMethods && (
              <p className="text-sm text-destructive">{validationErrors.contactMethods}</p>
            )}
            <div className="space-y-3">
              {formData.contactMethods.map((cm, index) => (
                <div key={cm.id} className={`p-3 border rounded-md bg-muted/30 ${validationErrors[`contactMethod_${index}`] ? 'border-destructive' : 'border-input'}`} data-error={!!validationErrors[`contactMethod_${index}`] || undefined}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">Tipo</Label>
                      <Select
                        value={cm.type}
                        onValueChange={(value) => {
                          const newMethods = [...formData.contactMethods]
                          newMethods[index].type = value as any
                          setFormData(prev => ({ ...prev, contactMethods: newMethods }))
                          if (validationErrors[`contactMethod_${index}`]) {
                            setValidationErrors(prev => ({ ...prev, [`contactMethod_${index}`]: '' }))
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      {(() => {
                        const config = getContactFieldConfig(cm.type)
                        return (
                          <>
                            <Label className="text-xs mb-1 block">{config.label}</Label>
                            <Input
                              type={config.inputType}
                              value={cm.value}
                              onChange={(e) => {
                                const newMethods = [...formData.contactMethods]
                                newMethods[index].value = config.mask ? config.mask(e.target.value) : e.target.value
                                setFormData(prev => ({ ...prev, contactMethods: newMethods }))
                                if (validationErrors[`contactMethod_${index}`]) {
                                  setValidationErrors(prev => ({ ...prev, [`contactMethod_${index}`]: '' }))
                                }
                              }}
                              placeholder={config.placeholder}
                              className={`h-9 ${validationErrors[`contactMethod_${index}`] ? 'border-destructive' : ''}`}
                            />
                          </>
                        )
                      })()}
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer text-sm mb-1 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={cm.isPrimary}
                        onChange={(e) => {
                          const newMethods = [...formData.contactMethods]
                          newMethods[index].isPrimary = e.target.checked
                          setFormData(prev => ({ ...prev, contactMethods: newMethods }))
                        }}
                      />
                      <span className="text-xs">Principal</span>
                    </label>
                    {formData.contactMethods.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          contactMethods: prev.contactMethods.filter((_, i) => i !== index)
                        }))}
                        className="h-9 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {validationErrors[`contactMethod_${index}`] && (
                    <p className="text-sm text-destructive mt-1">{validationErrors[`contactMethod_${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Adding new contact method')
                setFormData(prev => ({
                  ...prev,
                  contactMethods: [...prev.contactMethods, {
                    id: Date.now().toString(),
                    type: 'phone' as const,
                    value: '',
                    isPrimary: false,
                    notes: ''
                  }]
                }))
              }}
            >
              + Adicionar Método
            </Button>
          </div>

          {/* Addresses */}
          <div>
            <AddressesSection
              addresses={formData.addresses}
              onAdd={(addr) => setFormData(prev => ({ ...prev, addresses: [...prev.addresses, addr] }))}
              onUpdate={(index, addr) => setFormData(prev => ({
                ...prev,
                addresses: prev.addresses.map((a, i) => i === index ? addr : a)
              }))}
              onRemove={(index) => setFormData(prev => ({
                ...prev,
                addresses: prev.addresses.filter((_, i) => i !== index)
              }))}
            />
          </div>

          {/* Related Persons */}
          <div>
            <RelatedPersonsSection
              isAdding={showAddPersonForm}
              onShowAddForm={() => setShowAddPersonForm(true)}
              onHideAddForm={() => setShowAddPersonForm(false)}
              relatedPersons={formData.relatedPersons}
              onAdd={(person) => {
                setFormData(prev => {
                  const newState = { ...prev, relatedPersons: [...prev.relatedPersons, person] }
                  if (person.birthDate) {
                    const birthdayDate: SpecialDate = {
                      id: `birthday-${person.id}`,
                      date: person.birthDate,
                      type: 'birthday',
                      description: `Aniversário de ${person.name}`,
                      relatedPersonId: person.id,
                      notes: ''
                    }
                    newState.specialDates = [...prev.specialDates, birthdayDate]
                  }
                  return newState
                })
                setShowAddPersonForm(false)
              }}
              onUpdate={(index, person) => {
                setFormData(prev => {
                  const newState = {
                    ...prev,
                    relatedPersons: prev.relatedPersons.map((p, i) => i === index ? person : p)
                  }
                  const existingBirthdayIdx = prev.specialDates.findIndex(
                    d => d.relatedPersonId === person.id && d.type === 'birthday' && d.id.startsWith('birthday-')
                  )
                  if (person.birthDate) {
                    const birthdayDate: SpecialDate = {
                      id: `birthday-${person.id}`,
                      date: person.birthDate,
                      type: 'birthday',
                      description: `Aniversário de ${person.name}`,
                      relatedPersonId: person.id,
                      notes: existingBirthdayIdx >= 0 ? prev.specialDates[existingBirthdayIdx].notes : ''
                    }
                    if (existingBirthdayIdx >= 0) {
                      newState.specialDates = prev.specialDates.map((d, i) => i === existingBirthdayIdx ? birthdayDate : d)
                    } else {
                      newState.specialDates = [...prev.specialDates, birthdayDate]
                    }
                  } else if (existingBirthdayIdx >= 0) {
                    newState.specialDates = prev.specialDates.filter((_, i) => i !== existingBirthdayIdx)
                  }
                  return newState
                })
                setShowAddPersonForm(false)
              }}
              onRemove={(index) => setFormData(prev => {
                const removedPerson = prev.relatedPersons[index]
                return {
                  ...prev,
                  relatedPersons: prev.relatedPersons.filter((_, i) => i !== index),
                  specialDates: prev.specialDates.filter(
                    d => !(d.relatedPersonId === removedPerson.id && d.type === 'birthday' && d.id.startsWith('birthday-'))
                  )
                }
              })}
            />
          </div>

          {/* Special Dates */}
          <div>
            <SpecialDatesSection
              isAdding={showAddDateForm}
              onShowAddForm={() => setShowAddDateForm(true)}
              onHideAddForm={() => setShowAddDateForm(false)}
              specialDates={formData.specialDates}
              relatedPersons={formData.relatedPersons}
              onAdd={(date) => {
                setFormData(prev => ({ ...prev, specialDates: [...prev.specialDates, date] }))
                setShowAddDateForm(false)
              }}
              onUpdate={(index, date) => {
                setFormData(prev => ({
                  ...prev,
                  specialDates: prev.specialDates.map((d, i) => i === index ? date : d)
                }))
                setShowAddDateForm(false)
              }}
              onRemove={(index) => setFormData(prev => ({
                ...prev,
                specialDates: prev.specialDates.filter((_, i) => i !== index)
              }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Notas Adicionais</h3>
            <div className="space-y-2">
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Informações adicionais..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? 'Salvando...' : client ? 'Atualizar Cliente' : 'Criar Cliente'}
          </Button>
        </div>
      </div>
    </div>
  )
}
