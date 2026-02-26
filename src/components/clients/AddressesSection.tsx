'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2, Search, Loader2 } from 'lucide-react'
import { Address } from '@/types/client'
import { formatCEP } from '@/lib/masks'

interface AddressesSectionProps {
  addresses: Address[]
  onAdd: (address: Address) => void
  onUpdate: (index: number, address: Address) => void
  onRemove: (index: number) => void
}

const LABEL_PRESETS = ['Casa', 'Trabalho', 'Entrega', 'Cobrança']

export function AddressesSection({
  addresses,
  onAdd,
  onUpdate,
  onRemove
}: AddressesSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [formData, setFormData] = useState<Address>({
    id: '',
    label: '',
    cep: '',
    estado: '',
    cidade: '',
    bairro: '',
    endereco: '',
    numero: '',
    complemento: ''
  })

  const resetForm = () => {
    setFormData({
      id: '',
      label: '',
      cep: '',
      estado: '',
      cidade: '',
      bairro: '',
      endereco: '',
      numero: '',
      complemento: ''
    })
    setIsAdding(false)
    setEditingIndex(null)
    setCepError('')
  }

  const handleEdit = (index: number) => {
    setFormData(addresses[index])
    setEditingIndex(index)
    setIsAdding(true)
    setCepError('')
  }

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

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        bairro: data.bairro || prev.bairro
      }))
    } catch {
      setCepError('Erro ao buscar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const addressToSave: Address = {
      ...formData,
      id: formData.id || Date.now().toString()
    }

    if (editingIndex !== null) {
      onUpdate(editingIndex, addressToSave)
    } else {
      onAdd(addressToSave)
    }

    resetForm()
  }

  const formatAddressDisplay = (addr: Address) => {
    const parts = []
    if (addr.endereco) {
      let street = addr.endereco
      if (addr.numero) street += ', ' + addr.numero
      parts.push(street)
    }
    if (addr.complemento) parts.push(addr.complemento)
    if (addr.bairro) parts.push(addr.bairro)
    const cityState = [addr.cidade, addr.estado].filter(Boolean).join(' - ')
    if (cityState) parts.push(cityState)
    if (addr.cep) parts.push('CEP: ' + addr.cep)
    return parts.join(', ')
  }

  const cepNumbers = (formData.cep || '').replace(/\D/g, '')
  const canSearchCep = cepNumbers.length === 8

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between relative z-0">
        <h3 className="text-lg font-semibold text-foreground">Endereços</h3>
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
            Adicionar Endereço
          </Button>
        )}
      </div>

      {/* List of Addresses */}
      {addresses.length > 0 && !isAdding && (
        <div className="space-y-2">
          {addresses.map((addr, index) => (
            <Card key={addr.id} className="p-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {addr.label && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {addr.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-1">
                  {formatAddressDisplay(addr) || 'Endereço incompleto'}
                </p>
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
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de Endereço
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {LABEL_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, label: preset }))}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      formData.label === preset
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/60'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.label || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ou digite um tipo personalizado..."
              />
            </div>

            {/* CEP with search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                CEP
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cep || ''}
                  onChange={(e) => {
                    setCepError('')
                    setFormData(prev => ({ ...prev, cep: formatCEP(e.target.value) }))
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
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
              {cepError && (
                <p className="text-sm text-destructive mt-1">{cepError}</p>
              )}
            </div>

            {/* Estado / Cidade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.estado || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="SP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={formData.bairro || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Endereço
              </label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Rua, Avenida, etc"
              />
            </div>

            {/* Número / Complemento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Apto, sala, etc"
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
                {editingIndex !== null ? 'Atualizar Endereço' : 'Adicionar Endereço'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {addresses.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground italic">
          Nenhum endereço adicionado
        </p>
      )}
    </div>
  )
}
