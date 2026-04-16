'use client'

import { Truck, Store, Check, MapPin, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Address } from '@/types/client'
import Link from 'next/link'

interface EntregaStepProps {
  entregaTipo: 'ENTREGA' | 'RETIRADA'
  onTipoChange: (tipo: 'ENTREGA' | 'RETIRADA') => void
  // For ENTREGA - existing client addresses
  selectedClientAddress: Address | null
  clientAddresses: Address[]
  loadingClientAddresses: boolean
  onSelectClientAddress: (address: Address) => void
  // For ENTREGA - new address form
  newAddress: Partial<Address> | null
  onNewAddressChange: (address: Partial<Address> | null) => void
  // For RETIRADA
  selectedStoreAddress: { id: string; nome: string } | null
  storeAddresses: {
    id: string
    nome: string
    endereco?: string
    cidade?: string
    bairro?: string
    numero?: string
    estado?: string
    cep?: string
  }[]
  loadingStoreAddresses: boolean
  onSelectStoreAddress: (address: { id: string; nome: string }) => void
}

type AddressTab = 'new' | 'saved'

function formatAddress(addr: {
  endereco?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}): string {
  const parts: string[] = []
  if (addr.endereco) {
    parts.push(addr.numero ? `${addr.endereco}, ${addr.numero}` : addr.endereco)
  }
  if (addr.bairro) parts.push(addr.bairro)
  if (addr.cidade) {
    parts.push(addr.estado ? `${addr.cidade} - ${addr.estado}` : addr.cidade)
  }
  if (addr.cep) parts.push(`CEP: ${addr.cep}`)
  return parts.join(', ')
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'

export function EntregaStep({
  entregaTipo,
  onTipoChange,
  selectedClientAddress,
  clientAddresses,
  loadingClientAddresses,
  onSelectClientAddress,
  newAddress,
  onNewAddressChange,
  selectedStoreAddress,
  storeAddresses,
  loadingStoreAddresses,
  onSelectStoreAddress,
}: EntregaStepProps) {
  const [addressTab, setAddressTab] = useState<AddressTab>('new')

  const hasNewAddressFilled = !!(newAddress?.endereco?.trim())

  const handleNewAddressField = (field: keyof Address, value: string) => {
    const current = newAddress || {}
    onNewAddressChange({ ...current, [field]: value })
  }

  const handleSelectSavedAddress = (addr: Address) => {
    // When selecting a saved address, clear the selection state if re-clicking the same one
    onSelectClientAddress(addr)
    // Clear new address when a saved one is selected
    onNewAddressChange(null)
  }

  const handleSwitchToNewTab = () => {
    setAddressTab('new')
    // Clear saved address selection when switching to new address
    if (selectedClientAddress) {
      onSelectClientAddress(null as unknown as Address)
    }
  }

  const handleSwitchToSavedTab = () => {
    setAddressTab('saved')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Entrega / Retirada</h3>
        <p className="text-sm text-muted-foreground">
          Escolha como o pedido será entregue ao cliente
        </p>
      </div>

      {/* Toggle cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onTipoChange('ENTREGA')}
          className={`
            flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              entregaTipo === 'ENTREGA'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }
          `}
          data-testid="toggle-entrega"
        >
          <div
            className={`
              rounded-full p-3
              ${entregaTipo === 'ENTREGA' ? 'bg-primary/20' : 'bg-muted'}
            `}
          >
            <Truck
              className={`h-5 w-5 ${entregaTipo === 'ENTREGA' ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </div>
          <div>
            <p
              className={`font-semibold ${entregaTipo === 'ENTREGA' ? 'text-primary' : 'text-foreground'}`}
            >
              Entrega no endereço
            </p>
            <p className="text-xs text-muted-foreground">
              Entregar no endereço do cliente
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onTipoChange('RETIRADA')}
          className={`
            flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 text-left
            ${
              entregaTipo === 'RETIRADA'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }
          `}
          data-testid="toggle-retirada"
        >
          <div
            className={`
              rounded-full p-3
              ${entregaTipo === 'RETIRADA' ? 'bg-primary/20' : 'bg-muted'}
            `}
          >
            <Store
              className={`h-5 w-5 ${entregaTipo === 'RETIRADA' ? 'text-primary' : 'text-muted-foreground'}`}
            />
          </div>
          <div>
            <p
              className={`font-semibold ${entregaTipo === 'RETIRADA' ? 'text-primary' : 'text-foreground'}`}
            >
              Retirada na loja
            </p>
            <p className="text-xs text-muted-foreground">
              Cliente retira no local
            </p>
          </div>
        </button>
      </div>

      {/* ENTREGA: Address tabs + content */}
      {entregaTipo === 'ENTREGA' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Endereço de entrega</label>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1" data-testid="address-tabs">
            <button
              type="button"
              onClick={handleSwitchToNewTab}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all
                ${addressTab === 'new'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="tab-new-address"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Endereço
              {hasNewAddressFilled && (
                <Check className="h-3.5 w-3.5 text-green-600" />
              )}
            </button>
            <button
              type="button"
              onClick={handleSwitchToSavedTab}
              className={`
                flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all
                ${addressTab === 'saved'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              data-testid="tab-saved-addresses"
            >
              Endereços Salvos
              {clientAddresses.length > 0 && (
                <span className="text-xs text-muted-foreground">({clientAddresses.length})</span>
              )}
              {selectedClientAddress && (
                <Check className="h-3.5 w-3.5 text-green-600" />
              )}
            </button>
          </div>

          {/* New address form */}
          {addressTab === 'new' && (
            <div className="space-y-3" data-testid="new-address-form">
              <div className="space-y-1.5">
                <Label htmlFor="addr-label">Label (opcional)</Label>
                <Input
                  id="addr-label"
                  value={newAddress?.label || ''}
                  onChange={(e) => handleNewAddressField('label', e.target.value)}
                  placeholder="Ex: Escritório, Casa do cliente..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addr-endereco">Endereço (rua) *</Label>
                <Input
                  id="addr-endereco"
                  value={newAddress?.endereco || ''}
                  onChange={(e) => handleNewAddressField('endereco', e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="addr-numero">Número</Label>
                  <Input
                    id="addr-numero"
                    value={newAddress?.numero || ''}
                    onChange={(e) => handleNewAddressField('numero', e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-complemento">Complemento</Label>
                  <Input
                    id="addr-complemento"
                    value={newAddress?.complemento || ''}
                    onChange={(e) => handleNewAddressField('complemento', e.target.value)}
                    placeholder="Apto, Bloco..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="addr-bairro">Bairro</Label>
                  <Input
                    id="addr-bairro"
                    value={newAddress?.bairro || ''}
                    onChange={(e) => handleNewAddressField('bairro', e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-cidade">Cidade</Label>
                  <Input
                    id="addr-cidade"
                    value={newAddress?.cidade || ''}
                    onChange={(e) => handleNewAddressField('cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-estado">Estado</Label>
                  <Input
                    id="addr-estado"
                    value={newAddress?.estado || ''}
                    onChange={(e) => handleNewAddressField('estado', e.target.value)}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addr-cep">CEP</Label>
                <Input
                  id="addr-cep"
                  value={newAddress?.cep || ''}
                  onChange={(e) => handleNewAddressField('cep', e.target.value)}
                  placeholder="00000-000"
                  className="w-40"
                />
              </div>
            </div>
          )}

          {/* Saved addresses tab */}
          {addressTab === 'saved' && (
            <div data-testid="saved-addresses-panel">
              {loadingClientAddresses ? (
                <SkeletonCards />
              ) : clientAddresses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum endereço cadastrado para este cliente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a aba &quot;Novo Endereço&quot; para informar o endereço de entrega.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clientAddresses.map((addr) => {
                    const isSelected = selectedClientAddress?.id === addr.id
                    return (
                      <Card
                        key={addr.id}
                        className={`
                          cursor-pointer transition-all duration-200 hover:shadow-sm relative
                          ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}
                        `}
                        onClick={() => handleSelectSavedAddress(addr)}
                        data-testid={`address-card-${addr.id}`}
                      >
                        <CardContent className="p-4">
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="rounded-full bg-primary p-1">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                          <p className="font-semibold text-sm">
                            {addr.label || 'Endereço'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatAddress(addr)}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RETIRADA: Store addresses */}
      {entregaTipo === 'RETIRADA' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Endereço de retirada</label>
          </div>

          {loadingStoreAddresses ? (
            <SkeletonCards />
          ) : storeAddresses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Store className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum endereço de loja cadastrado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre em{' '}
                <Link
                  href="/settings/store-addresses"
                  className="text-primary hover:underline"
                >
                  Configurações
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {storeAddresses.map((addr) => {
                const isSelected = selectedStoreAddress?.id === addr.id
                return (
                  <Card
                    key={addr.id}
                    className={`
                      cursor-pointer transition-all duration-200 hover:shadow-sm relative
                      ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}
                    `}
                    onClick={() => onSelectStoreAddress({ id: addr.id, nome: addr.nome })}
                    data-testid={`store-card-${addr.id}`}
                  >
                    <CardContent className="p-4">
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="rounded-full bg-primary p-1">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <p className="font-semibold text-sm">{addr.nome}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatAddress(addr)}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
