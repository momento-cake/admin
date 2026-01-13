'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { ClientType, RelatedPerson, SpecialDate } from '@/types/client'
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
    address: {
      cep: '',
      estado: '',
      cidade: '',
      bairro: '',
      endereco: '',
      numero: '',
      complemento: ''
    },
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

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }))
  }

  const handleContactMethodChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.map((cm, i) =>
        i === index ? { ...cm, [field]: value } : cm
      )
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
            address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
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
            address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
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
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {validationErrors.submit}
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

          <div>
            <label className="text-sm font-medium">
              {clientType === 'person' ? 'Nome Completo' : 'Razão Social'} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={clientType === 'person' ? 'João da Silva' : 'Empresa LTDA'}
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
            <h2 className="text-lg font-semibold">Métodos de Contato *</h2>
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
              <div key={cm.id} className="p-4 border border-input rounded-md space-y-3 bg-muted/30">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      value={cm.type}
                      onChange={(e) => handleContactMethodChange(index, 'type', e.target.value)}
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
                    <label className="text-sm font-medium">Valor</label>
                    <input
                      type="text"
                      value={cm.value}
                      onChange={(e) => handleContactMethodChange(index, 'value', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ex: (11) 98765-4321"
                      required
                    />
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
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Endereço</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">CEP</label>
              <input
                type="text"
                name="cep"
                value={formData.address.cep}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="00000-000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <input
                type="text"
                name="estado"
                value={formData.address.estado}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="SP"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <input
                type="text"
                name="cidade"
                value={formData.address.cidade}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bairro</label>
              <input
                type="text"
                name="bairro"
                value={formData.address.bairro}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={formData.address.endereco}
              onChange={handleAddressChange}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Rua, Avenida, etc"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Número</label>
              <input
                type="text"
                name="numero"
                value={formData.address.numero}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Complemento</label>
              <input
                type="text"
                name="complemento"
                value={formData.address.complemento}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Apto, sala, etc"
              />
            </div>
          </div>
        </div>

        {/* Business Information */}
        {clientType === 'business' && (
          <>
            <div className="space-y-4 p-6 border rounded-lg">
              <h2 className="text-lg font-semibold">Informações Empresariais</h2>

              <div>
                <label className="text-sm font-medium">CNPJ *</label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.companyInfo.cnpj}
                  onChange={handleCompanyInfoChange}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="00.000.000/0000-00"
                />
                <FieldError message={validationErrors['companyInfo.cnpj']} />
              </div>

              <div>
                <label className="text-sm font-medium">Nome da Empresa *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyInfo.companyName}
                  onChange={handleCompanyInfoChange}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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

              <div>
                <label className="text-sm font-medium">Nome Completo *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.representative.name}
                  onChange={handleRepresentativeChange}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <FieldError message={validationErrors['representative.name']} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.representative.email}
                    onChange={handleRepresentativeChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <FieldError message={validationErrors['representative.email']} />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.representative.phone}
                    onChange={handleRepresentativeChange}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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
            onAdd={(person) => setFormData(prev => ({
              ...prev,
              relatedPersons: [...prev.relatedPersons, person]
            }))}
            onUpdate={(index, person) => setFormData(prev => ({
              ...prev,
              relatedPersons: prev.relatedPersons.map((p, i) => i === index ? person : p)
            }))}
            onRemove={(index) => setFormData(prev => ({
              ...prev,
              relatedPersons: prev.relatedPersons.filter((_, i) => i !== index)
            }))}
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
