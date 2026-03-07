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
  readOnly?: boolean
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

const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }

export function PublicEntregaToggle({
  entrega,
  token,
  storeAddresses,
  storeHours,
  onEntregaUpdate,
  readOnly = false,
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

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm border border-[#d4c4a8]/40 rounded-xl bg-white text-[#2d2319] placeholder:text-[#a89b8a] focus:outline-none focus:ring-2 focus:ring-[#b8956a]/30 focus:border-[#b8956a]/50 transition-all'

  if (readOnly) {
    return (
      <div className="premium-card overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            {entrega.tipo === 'ENTREGA' ? (
              <Truck className="w-4 h-4 text-[#b8956a]" />
            ) : (
              <Store className="w-4 h-4 text-[#b8956a]" />
            )}
            <h3
              className="text-base text-[#2d2319] tracking-wide"
              style={{ ...fontHeading, fontWeight: 600 }}
            >
              {entrega.tipo === 'ENTREGA' ? 'Entrega' : 'Retirada'}
            </h3>
          </div>
        </div>
        <div className="px-6 pb-6">
          {entrega.tipo === 'ENTREGA' && (
            <div className="bg-[#faf7f2] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b8956a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-[#b8956a]" />
                </div>
                <div>
                  <p className="text-sm text-[#2d2319] font-medium" style={fontBody}>
                    Entrega no endereço
                  </p>
                  {entrega.enderecoEntrega && (
                    <p className="text-[13px] text-[#8b7e6e] mt-1 leading-relaxed" style={fontBody}>
                      {formatAddressDisplay(entrega.enderecoEntrega)}
                    </p>
                  )}
                  {entrega.freteTotal != null && entrega.freteTotal > 0 && (
                    <p className="text-[13px] text-[#b8956a] mt-1.5 font-medium" style={fontBody}>
                      Frete: R$ {entrega.freteTotal.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {entrega.tipo === 'RETIRADA' && (
            <div className="bg-[#faf7f2] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b8956a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Store className="h-4 w-4 text-[#b8956a]" />
                </div>
                <div>
                  <p className="text-sm text-[#2d2319] font-medium" style={fontBody}>
                    Retirada na loja
                  </p>
                  {selectedStoreAddress && (
                    <>
                      <p className="text-[13px] text-[#5c4a2e] font-medium mt-1" style={fontBody}>
                        {selectedStoreAddress.nome}
                      </p>
                      <p className="text-[13px] text-[#8b7e6e] mt-0.5 leading-relaxed" style={fontBody}>
                        {formatAddressDisplay(selectedStoreAddress)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="premium-card overflow-hidden">
      {/* Section header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-[#b8956a]" />
          <h3
            className="text-base text-[#2d2319] tracking-wide"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            Como deseja receber?
          </h3>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="px-6 pb-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => handleToggle('ENTREGA')}
          disabled={isUpdating}
          className={`group flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-300 ${
            entrega.tipo === 'ENTREGA'
              ? 'border-[#b8956a] bg-gradient-to-b from-[#faf7f2] to-white shadow-sm'
              : 'border-[#d4c4a8]/30 bg-white hover:border-[#d4c4a8]/60 hover:bg-[#faf7f2]/50'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              entrega.tipo === 'ENTREGA'
                ? 'bg-[#b8956a]/15 text-[#b8956a]'
                : 'bg-[#f5f0eb] text-[#8b7e6e] group-hover:bg-[#b8956a]/10 group-hover:text-[#b8956a]'
            }`}
          >
            <Truck className="h-5 w-5" />
          </div>
          <span
            className={`text-sm font-medium transition-colors ${
              entrega.tipo === 'ENTREGA' ? 'text-[#2d2319]' : 'text-[#8b7e6e]'
            }`}
            style={fontBody}
          >
            Entrega
          </span>
          {entrega.tipo === 'ENTREGA' && (
            <span className="text-[10px] text-[#b8956a] font-medium tracking-wider uppercase" style={fontBody}>
              Selecionado
            </span>
          )}
        </button>

        <button
          onClick={() => handleToggle('RETIRADA')}
          disabled={isUpdating}
          className={`group flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-300 ${
            entrega.tipo === 'RETIRADA'
              ? 'border-[#b8956a] bg-gradient-to-b from-[#faf7f2] to-white shadow-sm'
              : 'border-[#d4c4a8]/30 bg-white hover:border-[#d4c4a8]/60 hover:bg-[#faf7f2]/50'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              entrega.tipo === 'RETIRADA'
                ? 'bg-[#b8956a]/15 text-[#b8956a]'
                : 'bg-[#f5f0eb] text-[#8b7e6e] group-hover:bg-[#b8956a]/10 group-hover:text-[#b8956a]'
            }`}
          >
            <Store className="h-5 w-5" />
          </div>
          <span
            className={`text-sm font-medium transition-colors ${
              entrega.tipo === 'RETIRADA' ? 'text-[#2d2319]' : 'text-[#8b7e6e]'
            }`}
            style={fontBody}
          >
            Retirada
          </span>
          {entrega.tipo === 'RETIRADA' && (
            <span className="text-[10px] text-[#b8956a] font-medium tracking-wider uppercase" style={fontBody}>
              Selecionado
            </span>
          )}
        </button>
      </div>

      {/* ENTREGA content */}
      {entrega.tipo === 'ENTREGA' && (
        <div className="px-6 pb-6 space-y-4">
          {entrega.enderecoEntrega && !showAddressForm && (
            <div className="bg-[#faf7f2] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b8956a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-[#b8956a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2d2319] leading-relaxed" style={fontBody}>
                    {formatAddressDisplay(entrega.enderecoEntrega)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddressForm(true)}
                className="mt-3 ml-11 text-sm font-medium text-[#b8956a] hover:text-[#8b7355] transition-colors underline decoration-[#b8956a]/30 underline-offset-2 hover:decoration-[#8b7355]/50"
                style={fontBody}
              >
                Alterar endereço
              </button>
            </div>
          )}

          {(!entrega.enderecoEntrega || showAddressForm) && (
            <div className="space-y-4">
              {/* CEP */}
              <div>
                <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressForm.cep || ''}
                    onChange={(e) => {
                      setCepError('')
                      setAddressForm((prev) => ({ ...prev, cep: formatCEP(e.target.value) }))
                    }}
                    className={inputClass + ' flex-1'}
                    placeholder="00000-000"
                    maxLength={9}
                    style={fontBody}
                  />
                  <button
                    type="button"
                    onClick={handleCepSearch}
                    disabled={!canSearchCep || cepLoading}
                    className="px-3.5 py-2.5 border border-[#d4c4a8]/40 rounded-xl text-[#8b7e6e] hover:bg-[#faf7f2] hover:text-[#b8956a] hover:border-[#b8956a]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {cepLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {cepError && (
                  <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
                    {cepError}
                  </p>
                )}
              </div>

              {/* Estado / Cidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                    Estado
                  </label>
                  <input
                    type="text"
                    value={addressForm.estado || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, estado: e.target.value }))}
                    className={inputClass}
                    placeholder="SP"
                    style={fontBody}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={addressForm.cidade || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, cidade: e.target.value }))}
                    className={inputClass}
                    style={fontBody}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                  Bairro
                </label>
                <input
                  type="text"
                  value={addressForm.bairro || ''}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, bairro: e.target.value }))}
                  className={inputClass}
                  style={fontBody}
                />
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                  Endereço
                </label>
                <input
                  type="text"
                  value={addressForm.endereco || ''}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, endereco: e.target.value }))}
                  className={inputClass}
                  placeholder="Rua, Avenida, etc"
                  style={fontBody}
                />
              </div>

              {/* Número / Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                    Número
                  </label>
                  <input
                    type="text"
                    value={addressForm.numero || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, numero: e.target.value }))}
                    className={inputClass}
                    style={fontBody}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={addressForm.complemento || ''}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, complemento: e.target.value }))}
                    className={inputClass}
                    placeholder="Apto, sala, etc"
                    style={fontBody}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                {showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-5 py-2.5 text-sm text-[#8b7e6e] border border-[#d4c4a8]/40 rounded-xl hover:bg-[#faf7f2] hover:text-[#5c4a2e] transition-all"
                    style={fontBody}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isUpdating}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#b8956a] to-[#c9a96e] rounded-xl hover:from-[#a68559] hover:to-[#b8956a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  style={fontBody}
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
        <div className="px-6 pb-6 space-y-4">
          {storeAddresses.length > 0 ? (
            <div className="space-y-2.5">
              {storeAddresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handleSelectStoreAddress(addr)}
                  disabled={isUpdating}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                    entrega.enderecoRetiradaId === addr.id
                      ? 'border-[#b8956a] bg-gradient-to-b from-[#faf7f2] to-white shadow-sm'
                      : 'border-[#d4c4a8]/25 hover:border-[#d4c4a8]/50 hover:bg-[#faf7f2]/50'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        entrega.enderecoRetiradaId === addr.id
                          ? 'bg-[#b8956a]/15 text-[#b8956a]'
                          : 'bg-[#f5f0eb] text-[#8b7e6e]'
                      }`}
                    >
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#2d2319]" style={fontBody}>
                        {addr.nome}
                      </p>
                      <p className="text-[13px] text-[#8b7e6e] mt-0.5 leading-relaxed" style={fontBody}>
                        {formatAddressDisplay(addr)}
                      </p>
                    </div>
                  </div>
                  {entrega.enderecoRetiradaId === addr.id && (
                    <div className="mt-2 ml-11">
                      <span className="text-[10px] text-[#b8956a] font-medium tracking-wider uppercase" style={fontBody}>
                        Selecionado
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-[#f5f0eb] flex items-center justify-center mx-auto mb-3">
                <Store className="w-5 h-5 text-[#8b7e6e]" />
              </div>
              <p className="text-sm text-[#8b7e6e]" style={fontBody}>
                Nenhum endereço de retirada disponível.
              </p>
            </div>
          )}

          {/* Store Hours */}
          {storeHours.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowHours(!showHours)}
                className="flex items-center gap-2 text-sm text-[#8b7e6e] hover:text-[#5c4a2e] transition-colors group"
                style={fontBody}
              >
                <div className="w-6 h-6 rounded-full bg-[#f5f0eb] flex items-center justify-center group-hover:bg-[#b8956a]/10 transition-colors">
                  <Clock className="h-3 w-3" />
                </div>
                <span>Horários de funcionamento</span>
                {showHours ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-auto" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                )}
              </button>

              {showHours && (
                <div className="mt-3 bg-[#faf7f2] rounded-xl p-4 space-y-2 animate-slide-down">
                  {formattedHours.map((h, idx) => (
                    <div key={idx} className="flex justify-between text-[13px]" style={fontBody}>
                      <span className="text-[#5c4a2e]">{h.label}</span>
                      <span
                        className={
                          h.time === 'Fechado'
                            ? 'text-red-400 font-medium'
                            : 'text-[#8b7e6e] tabular-nums'
                        }
                      >
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
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-xs text-[#a89b8a]" style={fontBody}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Atualizando...</span>
          </div>
        </div>
      )}
    </div>
  )
}
