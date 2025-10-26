'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { Client, RelatedPerson, SpecialDate } from '@/types/client'
import { RelatedPersonsSection } from '@/components/clients/RelatedPersonsSection'
import { SpecialDatesSection } from '@/components/clients/SpecialDatesSection'
import { TagsSection } from '@/components/clients/TagsSection'

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(null)

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Erro')
      setClient(data.data)
      setFormData({
        type: data.data.type,
        name: data.data.name || '',
        email: data.data.email || '',
        cpfCnpj: data.data.cpfCnpj || '',
        phone: data.data.phone || '',
        contactMethods: data.data.contactMethods || [],
        address: data.data.address || {},
        notes: data.data.notes || '',
        tags: data.data.tags || [],
        relatedPersons: data.data.relatedPersons || [],
        specialDates: data.data.specialDates || [],
        ...(data.data.type === 'business' && {
          companyInfo: data.data.companyInfo || {},
          representative: data.data.representative || {}
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleAddressChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      address: { ...prev.address, [name]: value }
    }))
  }

  const handleContactMethodChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      contactMethods: prev.contactMethods.map((cm: any, i: number) =>
        i === index ? { ...cm, [field]: value } : cm
      )
    }))
  }

  const handleRemoveContactMethod = (index: number) => {
    if (formData.contactMethods.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        contactMethods: prev.contactMethods.filter((_: any, i: number) => i !== index)
      }))
    }
  }

  const handleAddContactMethod = () => {
    setFormData((prev: any) => ({
      ...prev,
      contactMethods: [
        ...prev.contactMethods,
        { id: Date.now().toString(), type: 'phone', value: '', isPrimary: false, notes: '' }
      ]
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro')
      router.push(`/clients/${clientId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>
  if (error && !client) return (
    <div className="space-y-6">
      <Link href="/clients">
        <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
      </Link>
      <div className="p-4 text-destructive">{error}</div>
    </div>
  )
  if (!client || !formData) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Cliente</h1>
          <p className="text-muted-foreground">{client.name}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Informações Básicas</h2>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
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
              <label className="text-sm font-medium">CPF/CNPJ</label>
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

        <div className="space-y-4 p-6 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Métodos de Contato</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddContactMethod}>
              + Adicionar
            </Button>
          </div>
          <div className="space-y-3">
            {formData.contactMethods?.map((cm: any, index: number) => (
              <div key={cm.id} className="p-3 border border-input rounded-md bg-muted/30">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      value={cm.type}
                      onChange={(e) => handleContactMethodChange(index, 'type', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
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
                      className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
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

        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Endereço</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">CEP</label>
              <input
                type="text"
                name="cep"
                value={formData.address?.cep || ''}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <input
                type="text"
                name="estado"
                value={formData.address?.estado || ''}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Endereço</label>
            <input
              type="text"
              name="endereco"
              value={formData.address?.endereco || ''}
              onChange={handleAddressChange}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Número</label>
              <input
                type="text"
                name="numero"
                value={formData.address?.numero || ''}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Complemento</label>
              <input
                type="text"
                name="complemento"
                value={formData.address?.complemento || ''}
                onChange={handleAddressChange}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <TagsSection
            tags={formData.tags || []}
            onTagsChange={(tags) => setFormData((prev: any) => ({ ...prev, tags }))}
          />
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <RelatedPersonsSection
            relatedPersons={formData.relatedPersons || []}
            onAdd={(person) => setFormData((prev: any) => ({
              ...prev,
              relatedPersons: [...(prev.relatedPersons || []), person]
            }))}
            onUpdate={(index, person) => setFormData((prev: any) => ({
              ...prev,
              relatedPersons: (prev.relatedPersons || []).map((p: RelatedPerson, i: number) => i === index ? person : p)
            }))}
            onRemove={(index) => setFormData((prev: any) => ({
              ...prev,
              relatedPersons: (prev.relatedPersons || []).filter((_: RelatedPerson, i: number) => i !== index)
            }))}
          />
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <SpecialDatesSection
            specialDates={formData.specialDates || []}
            relatedPersons={formData.relatedPersons || []}
            onAdd={(date) => setFormData((prev: any) => ({
              ...prev,
              specialDates: [...(prev.specialDates || []), date]
            }))}
            onUpdate={(index, date) => setFormData((prev: any) => ({
              ...prev,
              specialDates: (prev.specialDates || []).map((d: SpecialDate, i: number) => i === index ? date : d)
            }))}
            onRemove={(index) => setFormData((prev: any) => ({
              ...prev,
              specialDates: (prev.specialDates || []).filter((_: SpecialDate, i: number) => i !== index)
            }))}
          />
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="text-lg font-semibold">Notas</h2>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-3 pt-6">
          <Link href={`/clients/${clientId}`} className="flex-1">
            <Button variant="outline" className="w-full">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="flex-1 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Atualizar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
