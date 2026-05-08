'use client'

import { Truck, Store, MapPin, Clock } from 'lucide-react'
import type { PublicEntrega, PublicStoreAddress, PublicStoreHours, PublicAddress } from './PublicPedidoView'

interface PublicEntregaToggleProps {
  entrega: PublicEntrega
  storeAddresses: PublicStoreAddress[]
  storeHours: PublicStoreHours[]
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

const fontBody = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

/**
 * Read-only display of the entrega (delivery / pickup) decision.
 *
 * The entrega is set internally by the admin; the customer sees it as part of
 * the order summary but cannot change it. Earlier iterations let the customer
 * toggle and edit the address — that surface (and its public PATCH route)
 * was removed deliberately.
 */
export function PublicEntregaToggle({
  entrega,
  storeAddresses,
  storeHours,
}: PublicEntregaToggleProps) {
  const selectedStoreAddress = storeAddresses.find((a) => a.id === entrega.enderecoRetiradaId)
  const formattedHours = formatStoreHours(storeHours)

  return (
    <div className="premium-card overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          {entrega.tipo === 'ENTREGA' ? (
            <Truck className="w-4 h-4 text-[#C9A96E]" />
          ) : (
            <Store className="w-4 h-4 text-[#C9A96E]" />
          )}
          <h3
            className="text-base text-[#2d2319] tracking-wide"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {entrega.tipo === 'ENTREGA' ? 'Entrega' : 'Retirada'}
          </h3>
        </div>
      </div>
      <div className="px-6 pb-6 space-y-3">
        {entrega.tipo === 'ENTREGA' && (
          <div className="bg-[#FBF8F4] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-[#C9A96E]" />
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
                  <p className="text-[13px] text-[#C9A96E] mt-1.5 font-medium" style={fontBody}>
                    Frete: R$ {entrega.freteTotal.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {entrega.tipo === 'RETIRADA' && (
          <>
            <div className="bg-[#FBF8F4] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Store className="h-4 w-4 text-[#C9A96E]" />
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
            {formattedHours.length > 0 && (
              <div className="bg-[#FBF8F4] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-[#C9A96E]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#2d2319] font-medium mb-1.5" style={fontBody}>
                      Horários de funcionamento
                    </p>
                    <ul className="space-y-0.5" style={fontBody}>
                      {formattedHours.map((h) => (
                        <li key={h.label} className="flex justify-between text-[13px] text-[#8b7e6e]">
                          <span>{h.label}</span>
                          <span className={h.time === 'Fechado' ? 'text-[#a89b8a]' : 'text-[#5c4a2e]'}>
                            {h.time}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
