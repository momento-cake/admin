'use client'

import { useState } from 'react'
import { Truck, Store, MapPin, Search, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { formatCEP } from '@/lib/masks'
import type { PublicEntrega, PublicStoreAddress, PublicStoreHours, PublicAddress } from './PublicPedidoView'
import type { EntregaTipo } from '@/types/pedido'

interface PublicEntregaToggleProps {
  entrega: PublicEntrega
  token: string
  storeAddresses: PublicStoreAddress[]
  storeHours: PublicStoreHours[]
  onEntregaUpdate: (entrega: PublicEntrega) => void
}

function formatAddressDisplay(addr: PublicAddress | PublicStoreAddress): string {
  const parts: string[] = []
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

function formatStoreHours(hours: PublicStoreHours[]): { label: string; time: string }[] {
  if (!hours.length) return []

  const sorted = [...hours].sort((a, b) => a.diaSemana - b.diaSemana)
  const result: { label: string; time: string }[] = []

  let i = 0
  while (i < sorted.length) {
    const current = sorted[i]

    if (current.fechado) {
      // Find consecutive closed days
      let j = i + 1
      while (j < sorted.length && sorted[j].fechado) j++

      if (j - i > 1) {
        result.push({
          label: `${current.diaSemanaLabel} a ${sorted[j - 1].diaSemanaLabel}`,
          time: 'Fechado',
        })
      } else {
        result.push({
          label: current.diaSemanaLabel,
          time: 'Fechado',
        })
      }
      i = j
    } else {
      // Find consecutive days with same hours
      let j = i + 1
      while (
        j < sorted.length &&
        !sorted[j].fechado &&
        sorted[j].abreAs === current.abreAs &&
        sorted[j].fechaAs === current.fechaAs
      ) {
        j++
      }

      const timeStr = `${current.abreAs} - ${current.fechaAs}`
      if (j - i > 1) {
        result.push({
          label: `${current.diaSemanaLabel} a ${sorted[j - 1].diaSemanaLabel}`,
          time: timeStr,
        })
      } else {
        result.push({
          label: current.diaSemanaLabel,
          time: timeStr,
        })
      }
      i = j
    }
  }

  return result
}

export function PublicEntregaToggle({
  entrega,
  token,
  storeAddresses,
  storeHours,
  onEntregaUpdate,
}: PublicEntregaToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')
  const [addressForm, setAddressForm] = useState<PublicAddress>({
    id: entrega.enderecoEntrega?.id || Date.now().toString(),
    cep: entrega.enderecoEntrega?.cep || '',
    estado: entrega.enderecoEntrega?.estado || '',
    cidade: entrega.enderecoEntrega?.cidade || '',
    bairro: entrega.enderecoEntrega?.bairro || '',
    endereco: entrega.enderecoEntrega?.endereco || '',
    numero: entrega.enderecoEntrega?.numero || '',
    complemento: entrega.enderecoEntrega?.complemento || '',
  })
  const [showHours, setShowHours] = useState(false)

  const handleToggle = async (tipo: EntregaTipo) => {
    if (tipo === entrega.tipo || isUpdating) return

    setIsUpdating(true)
    try {
      const newEntrega: PublicEntrega = {
        ...entrega,
        tipo,
        freteTotal: tipo === 'RETIRADA' ? 0 : entrega.freteTotal,
      }

      // If switching to RETIRADA and there are store addresses, set the default
      if (tipo === 'RETIRADA' && storeAddresses.length > 0) {
        const defaultAddr = storeAddresses.find((a) => a.isDefault) || storeAddresses[0]
        newEntrega.enderecoRetiradaId = defaultAddr.id
        newEntrega.enderecoRetiradaNome = defaultAddr.nome
      }

      const response = await fetch(`/api/public/pedidos/${token}/entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntrega),
      })

      const json = await response.json()
      if (json.success) {
        onEntregaUpdate(newEntrega)
      }
    } catch (err) {
      console.error('Error updating entrega:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCepSearch = async () => {
    const cepNumbers = (addressForm.cep || '').replace(/\D/g, '')
    if (cepNumbers.length !== 8) return

    setCepLoading(true)
    setCepError('')

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`)
      const data = await response.json()

      if (data.erro) {
        setCepError('CEP não encontrado')
        return
      }

      setAddressForm((prev) => ({
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

  const handleSaveAddress = async () => {
    setIsUpdating(true)
    try {
      const newEntrega: PublicEntrega = {
        ...entrega,
        tipo: 'ENTREGA',
        enderecoEntrega: {
          ...addressForm,
          id: addressForm.id || Date.now().toString(),
        },
      }

      const response = await fetch(`/api/public/pedidos/${token}/entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntrega),
      })

      const json = await response.json()
      if (json.success) {
        onEntregaUpdate(newEntrega)
        setShowAddressForm(false)
      }
    } catch (err) {
      console.error('Error saving address:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSelectStoreAddress = async (addr: PublicStoreAddress) => {
    if (isUpdating) return
    setIsUpdating(true)

    try {
      const newEntrega: PublicEntrega = {
        ...entrega,
        tipo: 'RETIRADA',
        enderecoRetiradaId: addr.id,
        enderecoRetiradaNome: addr.nome,
        freteTotal: 0,
      }

      const response = await fetch(`/api/public/pedidos/${token}/entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntrega),
      })

      const json = await response.json()
      if (json.success) {
        onEntregaUpdate(newEntrega)
      }
    } catch (err) {
      console.error('Error selecting store address:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const cepNumbers = (addressForm.cep || '').replace(/\D/g, '')
  const canSearchCep = cepNumbers.length === 8

  const formattedHours = formatStoreHours(storeHours)
  const selectedStoreAddress = storeAddresses.find((a) => a.id === entrega.enderecoRetiradaId)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Entrega ou Retirada</h3>
      </div>

      {/* Toggle Buttons */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => handleToggle('ENTREGA')}
          disabled={isUpdating}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            entrega.tipo === 'ENTREGA'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Truck className="h-6 w-6" />
          <span className="text-sm font-medium">Entrega</span>
        </button>

        <button
          onClick={() => handleToggle('RETIRADA')}
          disabled={isUpdating}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            entrega.tipo === 'RETIRADA'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Store className="h-6 w-6" />
          <span className="text-sm font-medium">Retirada</span>
        </button>
      </div>

      {/* ENTREGA content */}
      {entrega.tipo === 'ENTREGA' && (
        <div className="px-5 pb-5 space-y-3">
          {entrega.enderecoEntrega && !showAddressForm && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    {formatAddressDisplay(entrega.enderecoEntrega)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddressForm(true)}
                className="mt-3 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Alterar Endereço
              </button>
            </div>
          )}

          {(!entrega.enderecoEntrega || showAddressForm) && (
            <div className="space-y-3">
              {/* CEP */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressForm.cep || ''}
                    onChange={(e) => {
                      setCepError('')
                      setAddressForm((prev) => ({ ...prev, cep: formatCEP(e.target.value) }))
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <button
                    type="button"
                    onClick={handleCepSearch}
                    disabled={!canSearchCep || cepLoading}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cepLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
              </div>

              {/* Estado / Cidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <input
                    type="text"
                    value={addressForm.estado || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, estado: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                    placeholder="SP"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={addressForm.cidade || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, cidade: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                <input
                  type="text"
                  value={addressForm.bairro || ''}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, bairro: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                />
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                <input
                  type="text"
                  value={addressForm.endereco || ''}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, endereco: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  placeholder="Rua, Avenida, etc"
                />
              </div>

              {/* Numero / Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Numero</label>
                  <input
                    type="text"
                    value={addressForm.numero || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, numero: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={addressForm.complemento || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, complemento: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                    placeholder="Apto, sala, etc"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                {showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Salvar Endereço'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RETIRADA content */}
      {entrega.tipo === 'RETIRADA' && (
        <div className="px-5 pb-5 space-y-3">
          {storeAddresses.length > 0 ? (
            <div className="space-y-2">
              {storeAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handleSelectStoreAddress(addr)}
                  disabled={isUpdating}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    entrega.enderecoRetiradaId === addr.id
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <Store className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{addr.nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatAddressDisplay(addr)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Nenhum endereço de retirada disponível.</p>
            </div>
          )}

          {/* Store Hours */}
          {storeHours.length > 0 && (
            <div>
              <button
                onClick={() => setShowHours(!showHours)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Clock className="h-4 w-4" />
                <span>Horários de funcionamento</span>
                {showHours ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {showHours && (
                <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1.5">
                  {formattedHours.map((h, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600">{h.label}</span>
                      <span className={h.time === 'Fechado' ? 'text-red-500 font-medium' : 'text-gray-700'}>
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isUpdating && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Atualizando...</span>
          </div>
        </div>
      )}
    </div>
  )
}
