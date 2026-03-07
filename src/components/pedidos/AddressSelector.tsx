'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, Loader2, MapPin, Plus } from 'lucide-react'
import { Address } from '@/types/client'
import { formatCEP } from '@/lib/masks'

interface AddressSelectorProps {
  clientAddresses?: Address[]
  selectedAddress?: Address | null
  onSelect: (address: Address) => void
  label?: string
}

export function AddressSelector({
  clientAddresses = [],
  selectedAddress,
  onSelect,
  label = 'Endereço de Entrega',
}: AddressSelectorProps) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [formData, setFormData] = useState<Address>({
    id: '',
    label: 'Entrega',
    cep: '',
    estado: '',
    cidade: '',
    bairro: '',
    endereco: '',
    numero: '',
    complemento: '',
  })

  const handleCepSearch = async () => {
    const cepNumbers = (formData.cep || '').replace(/\D/g, '')
    if (cepNumbers.length !== 8) return

    setCepLoading(true)
    setCepError('')

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`)
      const data = await response.json()

      if (data.erro) {
        setCepError('CEP não encontrado')
        setCepLoading(false)
        return
      }

      setFormData((prev) => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        bairro: data.bairro || prev.bairro,
      }))
    } catch {
      setCepError('Erro ao buscar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleSubmitNew = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.cep?.replace(/\D/g, '')) newErrors.cep = 'CEP obrigatório'
    if (!formData.endereco?.trim()) newErrors.endereco = 'Endereço obrigatório'
    if (!formData.numero?.trim()) newErrors.numero = 'Número obrigatório'
    if (!formData.cidade?.trim()) newErrors.cidade = 'Cidade obrigatória'
    if (!formData.estado?.trim()) newErrors.estado = 'Estado obrigatório'

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    setFormErrors({})
    const newAddress: Address = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
    }
    onSelect(newAddress)
    setShowNewForm(false)
  }

  const formatAddressDisplay = (addr: Address) => {
    const parts = []
    if (addr.endereco) {
      let street = addr.endereco
      if (addr.numero) street += ', ' + addr.numero
      parts.push(street)
    }
    if (addr.bairro) parts.push(addr.bairro)
    const cityState = [addr.cidade, addr.estado].filter(Boolean).join(' - ')
    if (cityState) parts.push(cityState)
    if (addr.cep) parts.push('CEP: ' + addr.cep)
    return parts.join(', ')
  }

  const cepNumbers = (formData.cep || '').replace(/\D/g, '')
  const canSearchCep = cepNumbers.length === 8

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">{label}</label>

      {/* Client saved addresses */}
      {clientAddresses.length > 0 && !showNewForm && (
        <div className="space-y-2">
          {clientAddresses.map((addr) => (
            <Card
              key={addr.id}
              className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                selectedAddress?.id === addr.id ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => onSelect(addr)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  {addr.label && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {addr.label}
                    </span>
                  )}
                  <p className="text-sm text-foreground mt-1">
                    {formatAddressDisplay(addr) || 'Endereço incompleto'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Button to enter new address */}
      {!showNewForm && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Endereço
        </Button>
      )}

      {/* New address form */}
      {showNewForm && (
        <Card className="p-4 bg-muted">
          <div className="space-y-3">
            {/* CEP with search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">CEP *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cep || ''}
                  onChange={(e) => {
                    setCepError('')
                    setFormErrors((prev) => ({ ...prev, cep: '' }))
                    setFormData((prev) => ({ ...prev, cep: formatCEP(e.target.value) }))
                  }}
                  className={`flex-1 px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.cep ? 'border-red-500' : 'border-border'}`}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCepSearch}
                  disabled={!canSearchCep || cepLoading}
                  className="flex items-center gap-2"
                >
                  {cepLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </Button>
              </div>
              {cepError && <p className="text-sm text-destructive mt-1">{cepError}</p>}
              {formErrors.cep && <p className="text-xs text-red-500 mt-1">{formErrors.cep}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Estado *</label>
                <input
                  type="text"
                  value={formData.estado || ''}
                  onChange={(e) => { setFormErrors((prev) => ({ ...prev, estado: '' })); setFormData((prev) => ({ ...prev, estado: e.target.value })) }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.estado ? 'border-red-500' : 'border-border'}`}
                  placeholder="SP"
                />
                {formErrors.estado && <p className="text-xs text-red-500 mt-1">{formErrors.estado}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cidade *</label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => { setFormErrors((prev) => ({ ...prev, cidade: '' })); setFormData((prev) => ({ ...prev, cidade: e.target.value })) }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.cidade ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.cidade && <p className="text-xs text-red-500 mt-1">{formErrors.cidade}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bairro</label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, bairro: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Endereço *</label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => { setFormErrors((prev) => ({ ...prev, endereco: '' })); setFormData((prev) => ({ ...prev, endereco: e.target.value })) }}
                className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.endereco ? 'border-red-500' : 'border-border'}`}
                placeholder="Rua, Avenida, etc"
              />
              {formErrors.endereco && <p className="text-xs text-red-500 mt-1">{formErrors.endereco}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Número *</label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => { setFormErrors((prev) => ({ ...prev, numero: '' })); setFormData((prev) => ({ ...prev, numero: e.target.value })) }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring ${formErrors.numero ? 'border-red-500' : 'border-border'}`}
                />
                {formErrors.numero && <p className="text-xs text-red-500 mt-1">{formErrors.numero}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Complemento</label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, complemento: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Apto, sala, etc"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSubmitNew}
              >
                Usar Este Endereço
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
