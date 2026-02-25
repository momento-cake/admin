'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, X, AlertCircle } from 'lucide-react'
import { ClientType, Address, RelatedPerson, SpecialDate } from '@/types/client'
import { getContactFieldConfig } from '@/lib/masks'
import { AddressesSection } from '@/components/clients/AddressesSection'
import { RelatedPersonsSection } from '@/components/clients/RelatedPersonsSection'
import { SpecialDatesSection } from '@/components/clients/SpecialDatesSection'
import { TagsSection } from '@/components/clients/TagsSection'

export default function NewClientPage() {
  const router = useRouter()
  const [clientType, setClientType] = useState<ClientType>('person')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    type: 'person' as ClientType,
    name: '',
    email: '',
    cpfCnpj: '',
    phone: '',
    contactMethods: [
      {
        id: '1',
        type: 'phone' as const,
        value: '',
        isPrimary: true,
        notes: ''
      }
    ],
    addresses: [] as Address[],
    notes: '',
    tags: [] as string[],
    relatedPersons: [] as RelatedPerson[],
    specialDates: [] as SpecialDate[],
    companyInfo: {
      cnpj: '',
      companyName: '',
      businessType: '',
      inscricaoEstadual: '',
      companyPhone: '',
      companyEmail: ''
    },
    representative: {
      name: '',
      email: '',
      phone: '',
      role: '',
      cpf: ''
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleContactMethodChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.map((cm, i) => {
        if (i !== index) return cm
        if (field === 'value') {
          const config = getContactFieldConfig(cm.type)
          return { ...cm, value: config.mask ? config.mask(value) : value }
        }
        if (field === 'type') {
          const newConfig = getContactFieldConfig(value)
          return { ...cm, type: value, value: newConfig.mask ? newConfig.mask(cm.value) : cm.value }
        }
        return { ...cm, [field]: value }
      })
    }))
  }

  const handleAddContactMethod = () => {
    setFormData(prev => ({
      ...prev,
      contactMethods: [
        ...prev.contactMethods,
        {
          id: Date.now().toString(),
          type: 'phone' as const,
          value: '',
          isPrimary: false,
          notes: ''
        }
      ]
    }))
  }

  const handleRemoveContactMethod = (index: number) => {
    if (formData.contactMethods.length > 1) {
      setFormData(prev => ({
        ...prev,
        contactMethods: prev.contactMethods.filter((_, i) => i !== index)
      }))
    }
  }

  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        [name]: value
      }
    }))
  }

  const handleRepresentativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      representative: {
        ...prev.representative,
        [name]: value
      }
    }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório'
    }

    if (formData.contactMethods.length === 0) {
      errors.contactMethods = 'Pelo menos um método de contato é obrigatório'
    } else {
      formData.contactMethods.forEach((cm, index) => {
        const cmType = cm.type as string
        if (!cm.value.trim()) {
          errors[`contactMethod_${index}`] = 'Preencha o valor do contato'
        } else if ((cmType === 'phone' || cmType === 'whatsapp') && cm.value.replace(/\D/g, '').length < 10) {
          errors[`contactMethod_${index}`] = 'Telefone deve ter pelo menos 10 dígitos'
        } else if (cmType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cm.value)) {
          errors[`contactMethod_${index}`] = 'Email inválido'
        }
      })
    }

    if (clientType === 'business') {
      if (!formData.companyInfo.cnpj.trim()) {
        errors['companyInfo.cnpj'] = 'CNPJ é obrigatório'
      }
      if (!formData.companyInfo.companyName.trim()) {
        errors['companyInfo.companyName'] = 'Nome da empresa é obrigatório'
      }
      if (!formData.representative.name.trim()) {
        errors['representative.name'] = 'Nome do representante é obrigatório'
      }
      if (!formData.representative.email.trim()) {
        errors['representative.email'] = 'Email do representante é obrigatório'
      }
      if (!formData.representative.phone.trim()) {
        errors['representative.phone'] = 'Telefone do representante é obrigatório'
      }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      const submitData = clientType === 'person'
        ? {
            type: 'person',
            name: formData.name,
            email: formData.email || undefined,
            cpfCnpj: formData.cpfCnpj || undefined,
            phone: formData.phone || undefined,
            addresses: formData.addresses.length > 0 ? formData.addresses : undefined,
            contactMethods: formData.contactMethods,
            relatedPersons: formData.relatedPersons.length > 0 ? formData.relatedPersons : undefined,
            specialDates: formData.specialDates.length > 0 ? formData.specialDates : undefined,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            notes: formData.notes || undefined
          }
        : {
            type: 'business',
            name: formData.name,
            email: formData.email || undefined,
            cpfCnpj: formData.cpfCnpj || undefined,
            phone: formData.phone || undefined,
            addresses: formData.addresses.length > 0 ? formData.addresses : undefined,
            contactMethods: formData.contactMethods,
            relatedPersons: formData.relatedPersons.length > 0 ? formData.relatedPersons : undefined,
            specialDates: formData.specialDates.length > 0 ? formData.specialDates : undefined,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            companyInfo: {
              cnpj: formData.companyInfo.cnpj,
              companyName: formData.companyInfo.companyName,
              businessType: formData.companyInfo.businessType || undefined,
              inscricaoEstadual: formData.companyInfo.inscricaoEstadual || undefined,
              companyPhone: formData.companyInfo.companyPhone || undefined,
              companyEmail: formData.companyInfo.companyEmail || undefined
            },
            representative: {
              name: formData.representative.name,
              email: formData.representative.email,
              phone: formData.representative.phone,
              role: formData.representative.role || undefined,
              cpf: formData.representative.cpf || undefined
            },
            notes: formData.notes || undefined
          }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (!result.success) {
        setValidationErrors({ submit: result.error || 'Erro ao criar cliente' })
        return
      }

      toast.success('Cliente criado com sucesso!')
      router.push('/clients')
      router.refresh()
    } catch (error) {
      setValidationErrors({ submit: error instanceof Error ? error.message : 'Erro ao criar cliente' })
    } finally {
      setLoading(false)
    }
  }

  const FieldError = ({ message }: { message?: string }) =>
    message ? <p className="text-sm text-destructive mt-1">{message}</p> : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Novo Cliente</h1>
          <p className="text-muted-foreground">Adicione um novo cliente ao sistema</p>
        </div>
      </div>

      {validationErrors.submit && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{validationErrors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* Client Type Selection */}
        <div className="space-y-3 p-6 border rounded-lg">
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
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Informações Básicas</h2>

          <div data-error={!!validationErrors.name || undefined}>
            <label className="text-sm font-medium">
              {clientType === 'person' ? 'Nome Completo' : 'Razão Social'} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors.name ? 'border-destructive' : 'border-input'}`}
              placeholder={clientType === 'person' ? 'João da Silva' : 'Empresa LTDA'}
              aria-required
            />
            <FieldError message={validationErrors.name} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {clientType === 'person' ? 'CPF' : 'CNPJ'}
              </label>
              <input
                type="text"
                name="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Telefone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Contact Methods */}
        <div className="space-y-4 p-6 border rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Métodos de Contato <span className="text-destructive">*</span></h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddContactMethod}
            >
              + Adicionar
            </Button>
          </div>

          {validationErrors.contactMethods && (
            <FieldError message={validationErrors.contactMethods} />
          )}

          <div className="space-y-3">
            {formData.contactMethods.map((cm, index) => (
              <div key={cm.id} className={`p-4 border rounded-md space-y-3 bg-muted/30 ${validationErrors[`contactMethod_${index}`] ? 'border-destructive' : 'border-input'}`} data-error={!!validationErrors[`contactMethod_${index}`] || undefined}>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      value={cm.type}
                      onChange={(e) => {
                        handleContactMethodChange(index, 'type', e.target.value)
                        if (validationErrors[`contactMethod_${index}`]) {
                          setValidationErrors(prev => ({ ...prev, [`contactMethod_${index}`]: '' }))
                        }
                      }}
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="phone">Telefone</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                  <div>
                    {(() => {
                      const config = getContactFieldConfig(cm.type)
                      return (
                        <>
                          <label className="text-sm font-medium">{config.label}</label>
                          <input
                            type={config.inputType}
                            value={cm.value}
                            onChange={(e) => {
                              handleContactMethodChange(index, 'value', e.target.value)
                              if (validationErrors[`contactMethod_${index}`]) {
                                setValidationErrors(prev => ({ ...prev, [`contactMethod_${index}`]: '' }))
                              }
                            }}
                            className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors[`contactMethod_${index}`] ? 'border-destructive' : 'border-input'}`}
                            placeholder={config.placeholder}
                          />
                        </>
                      )
                    })()}
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={cm.isPrimary}
                        onChange={(e) => handleContactMethodChange(index, 'isPrimary', e.target.checked)}
                      />
                      <span className="text-sm">Principal</span>
                    </label>
                    {formData.contactMethods.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveContactMethod(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {validationErrors[`contactMethod_${index}`] && (
                  <p className="text-sm text-destructive">{validationErrors[`contactMethod_${index}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Addresses */}
        <div className="space-y-4 p-6 border rounded-lg">
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

        {/* Business Information */}
        {clientType === 'business' && (
          <>
            <div className="space-y-4 p-6 border rounded-lg">
              <h2 className="text-lg font-semibold">Informações Empresariais</h2>

              <div data-error={!!validationErrors['companyInfo.cnpj'] || undefined}>
                <label className="text-sm font-medium">CNPJ <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.companyInfo.cnpj}
                  onChange={handleCompanyInfoChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors['companyInfo.cnpj'] ? 'border-destructive' : 'border-input'}`}
                  placeholder="00.000.000/0000-00"
                  aria-required
                />
                <FieldError message={validationErrors['companyInfo.cnpj']} />
              </div>

              <div data-error={!!validationErrors['companyInfo.companyName'] || undefined}>
                <label className="text-sm font-medium">Nome da Empresa <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyInfo.companyName}
                  onChange={handleCompanyInfoChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors['companyInfo.companyName'] ? 'border-destructive' : 'border-input'}`}
                  aria-required
                />
                <FieldError message={validationErrors['companyInfo.companyName']} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Negócio</label>
                  <input
                    type="text"
                    name="businessType"
                    value={formData.companyInfo.businessType}
                    onChange={handleCompanyInfoChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Inscrição Estadual</label>
                  <input
                    type="text"
                    name="inscricaoEstadual"
                    value={formData.companyInfo.inscricaoEstadual}
                    onChange={handleCompanyInfoChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6 border rounded-lg">
              <h2 className="text-lg font-semibold">Representante *</h2>

              <div data-error={!!validationErrors['representative.name'] || undefined}>
                <label className="text-sm font-medium">Nome Completo <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.representative.name}
                  onChange={handleRepresentativeChange}
                  className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors['representative.name'] ? 'border-destructive' : 'border-input'}`}
                  aria-required
                />
                <FieldError message={validationErrors['representative.name']} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div data-error={!!validationErrors['representative.email'] || undefined}>
                  <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.representative.email}
                    onChange={handleRepresentativeChange}
                    className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors['representative.email'] ? 'border-destructive' : 'border-input'}`}
                    aria-required
                  />
                  <FieldError message={validationErrors['representative.email']} />
                </div>
                <div data-error={!!validationErrors['representative.phone'] || undefined}>
                  <label className="text-sm font-medium">Telefone <span className="text-destructive">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.representative.phone}
                    onChange={handleRepresentativeChange}
                    className={`w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${validationErrors['representative.phone'] ? 'border-destructive' : 'border-input'}`}
                    aria-required
                  />
                  <FieldError message={validationErrors['representative.phone']} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cargo</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.representative.role}
                    onChange={handleRepresentativeChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.representative.cpf}
                    onChange={handleRepresentativeChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tags */}
        <div className="space-y-4 p-6 border rounded-lg">
          <TagsSection
            tags={formData.tags}
            onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
          />
        </div>

        {/* Related Persons */}
        <div className="space-y-4 p-6 border rounded-lg">
          <RelatedPersonsSection
            relatedPersons={formData.relatedPersons}
            onAdd={(person) => setFormData(prev => {
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
            })}
            onUpdate={(index, person) => setFormData(prev => {
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
            })}
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
        <div className="space-y-4 p-6 border rounded-lg">
          <SpecialDatesSection
            specialDates={formData.specialDates}
            relatedPersons={formData.relatedPersons}
            onAdd={(date) => setFormData(prev => ({
              ...prev,
              specialDates: [...prev.specialDates, date]
            }))}
            onUpdate={(index, date) => setFormData(prev => ({
              ...prev,
              specialDates: prev.specialDates.map((d, i) => i === index ? date : d)
            }))}
            onRemove={(index) => setFormData(prev => ({
              ...prev,
              specialDates: prev.specialDates.filter((_, i) => i !== index)
            }))}
          />
        </div>

        {/* Notes */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Notas Adicionais</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Informações adicionais sobre o cliente..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6">
          <Link href="/clients" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Criando Cliente...' : 'Criar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
