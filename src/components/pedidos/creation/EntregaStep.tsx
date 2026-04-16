'use client'

import { Truck, Store, Check, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Address } from '@/types/client'
import Link from 'next/link'

interface EntregaStepProps {
  entregaTipo: 'ENTREGA' | 'RETIRADA'
  onTipoChange: (tipo: 'ENTREGA' | 'RETIRADA') => void
  // For ENTREGA
  selectedClientAddress: Address | null
  clientAddresses: Address[]
  loadingClientAddresses: boolean
  onSelectClientAddress: (address: Address) => void
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

export function EntregaStep({
  entregaTipo,
  onTipoChange,
  selectedClientAddress,
  clientAddresses,
  loadingClientAddresses,
  onSelectClientAddress,
  selectedStoreAddress,
  storeAddresses,
  loadingStoreAddresses,
  onSelectStoreAddress,
}: EntregaStepProps) {
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

      {/* ENTREGA: Client addresses */}
      {entregaTipo === 'ENTREGA' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Endereço de entrega</label>
          </div>

          {loadingClientAddresses ? (
            <SkeletonCards />
          ) : clientAddresses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum endereço cadastrado para este cliente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O endereço poderá ser adicionado posteriormente na página do pedido.
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
                    onClick={() => onSelectClientAddress(addr)}
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
