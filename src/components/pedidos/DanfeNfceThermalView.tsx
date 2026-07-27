'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { formatBRL, toDateOrNull } from '@/lib/pedido-resumo'
import { buildDanfeNfceModel, formatChaveAcesso } from '@/lib/danfe-nfce-thermal'
import type { Pedido } from '@/types/pedido'
import type { FiscalEmitResult } from '@/lib/fiscal/types'

// Inline styles keep the print output faithful regardless of app theme / print
// CSS support (same rationale as ReciboThermalPrintView). Sized for an 80mm roll.
const C = { ink: '#000', muted: '#333', rule: '#000' }

const wrap: CSSProperties = {
  width: '68mm',
  margin: '0 auto',
  padding: '2mm 0 4mm',
  color: C.ink,
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  fontSize: 11,
  lineHeight: 1.35,
}
const center: CSSProperties = { textAlign: 'center' }
const muted: CSSProperties = { color: C.muted }
const divider: CSSProperties = { borderTop: `1px dashed ${C.rule}`, margin: '6px 0' }
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8 }
const bold: CSSProperties = { fontWeight: 700 }
const breakAll: CSSProperties = { wordBreak: 'break-all' }

function Row({ left, right, strong }: { left: string; right: string; strong?: boolean }) {
  return (
    <div style={{ ...rowStyle, ...(strong ? bold : undefined) }}>
      <span>{left}</span>
      <span style={{ whiteSpace: 'nowrap' }}>{right}</span>
    </div>
  )
}

/** Reconstruct a minimal emission result from the order's stored NF fields. */
function toEmitResult(pedido: Pedido): FiscalEmitResult {
  return {
    status: 'AUTORIZADA',
    modelo: pedido.nfModelo ?? 65,
    serie: pedido.nfSerie ?? 0,
    numero: pedido.nfNumero ?? 0,
    accessKey: pedido.nfAccessKey ?? undefined,
    protocolo: pedido.nfProtocolo ?? undefined,
    qrCode: pedido.nfQrCode ?? undefined,
    urlChave: pedido.nfUrlChave ?? undefined,
    emittedAt: toDateOrNull(pedido.nfEmittedAt) ?? new Date(),
  }
}

/**
 * 80mm single-column DANFE-NFC-e used as the browser-print fallback when the USB
 * thermal printer isn't reachable. Built from the order's stored NF fields via
 * the same `buildDanfeNfceModel` used by the ESC/POS renderer, so both outputs
 * stay in sync. The QR is rasterized in-browser through `qrcode.toDataURL`.
 */
export function DanfeNfceThermalView({ pedido }: { pedido: Pedido }) {
  const model = useMemo(
    () =>
      buildDanfeNfceModel(pedido, toEmitResult(pedido), {
        ambiente: pedido.nfAmbiente ?? 'producao',
      }),
    [pedido],
  )
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!model.qrCode) {
      setQrDataUrl(null)
      return
    }
    const load = async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(model.qrCode, { margin: 1, width: 240 })
        if (!cancelled) setQrDataUrl(url)
      } catch {
        if (!cancelled) setQrDataUrl(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [model.qrCode])

  const c = model.company
  const t = model.totals

  return (
    <div style={wrap}>
      {/* Force an 80mm page with no margins. */}
      <style>{`@page { size: 72mm auto; margin: 0; } @media print { html, body { margin: 0; } }`}</style>

      {/* Letterhead */}
      <div style={center}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.logoPath} alt={c.tradeName} style={{ width: '40mm', height: 'auto', margin: '0 auto 4px' }} />
        <div style={bold}>{c.tradeName}</div>
        <div style={muted}>{c.legalName}</div>
        <div style={muted}>CNPJ: {c.cnpj}</div>
        <div style={muted}>{c.address} - CEP: {c.cep}</div>
        <div style={muted}>{c.phone}</div>
      </div>

      <div style={divider} />
      <div style={{ ...center, ...bold }}>DANFE NFC-e</div>
      <div style={{ ...center, ...muted }}>Documento Auxiliar da NFC-e</div>
      {model.ambiente === 'homologacao' && (
        <div style={{ ...center, ...bold, marginTop: 4 }}>SEM VALOR FISCAL - HOMOLOGAÇÃO</div>
      )}

      {/* Items */}
      <div style={divider} />
      {model.itens.map((item, i) => (
        <div key={i} style={{ marginBottom: 3 }}>
          <div>{item.nome}</div>
          {item.descricao && <div style={{ ...muted, fontSize: 10 }}>{item.descricao}</div>}
          <Row left={`${item.quantidade} x ${formatBRL(item.precoUnitario)}`} right={formatBRL(item.total)} />
        </div>
      ))}

      {/* Totals */}
      <div style={divider} />
      <Row left="Subtotal" right={formatBRL(t.produtos)} />
      {t.desconto > 0 && <Row left="Descontos" right={`-${formatBRL(t.desconto)}`} />}
      {t.acrescimo > 0 && <Row left="Acréscimo" right={formatBRL(t.acrescimo)} />}
      {t.frete > 0 && <Row left="Frete" right={formatBRL(t.frete)} />}
      <Row left="Valor total" right={formatBRL(t.total)} strong />

      {/* Payments */}
      <div style={divider} />
      <div style={bold}>FORMA DE PAGAMENTO</div>
      {model.pagamentos.length > 0 ? (
        model.pagamentos.map((pay, i) => (
          <Row key={i} left={pay.metodo} right={formatBRL(pay.valor)} />
        ))
      ) : (
        <div style={muted}>Nenhum pagamento registrado.</div>
      )}

      {/* Consumer — the reprint page has no decryptable CPF, so it's anonymous. */}
      <div style={divider} />
      <div>CONSUMIDOR NÃO IDENTIFICADO</div>

      {/* Fiscal block */}
      <div style={divider} />
      <div style={center}>
        <div style={muted}>NFC-e nº {model.numero} Série {model.serie}</div>
        <div style={{ ...muted, marginTop: 2 }}>Consulte pela Chave de Acesso em</div>
        {model.urlChave && <div style={{ ...muted, ...breakAll }}>{model.urlChave}</div>}
        <div style={{ ...bold, marginTop: 2 }}>CHAVE DE ACESSO</div>
        <div style={breakAll}>{formatChaveAcesso(model.chaveAcesso)}</div>
        {model.protocolo && (
          <div style={{ ...muted, marginTop: 2 }}>Protocolo de Autorização: {model.protocolo}</div>
        )}
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR Code NFC-e" style={{ width: '40mm', height: '40mm', margin: '6px auto 0' }} />
        )}
      </div>
    </div>
  )
}
