/**
 * Thermal (ESC/POS) renderer for the DANFE-NFC-e — the printed consumer coupon
 * that accompanies an authorized NFC-e (fiscal model 65).
 *
 * Two concerns, deliberately separated (mirroring `pedido-recibo-thermal.ts`):
 *   - `buildDanfeNfceModel(pedido, result, options)` — pure view-model builder.
 *   - `buildDanfeNfce(model, qrImageData, logo)` — PURE ESC/POS byte assembly.
 *     Never touches the DOM: the QR arrives pre-rendered as an `ImageData`.
 *   - `makeQrImageData(qrText, size)` — turns the `infNFeSupl` QR string into a
 *     bitmap. It builds the bitmap from the QR module matrix (via `qrcode`'s
 *     pure `create()`), so it needs no canvas and works in Node and the browser.
 *
 * Keeping the byte assembly free of `makeQrImageData` lets the layout be unit
 * tested by passing a fake `ImageData` ({ width, height, data }).
 */
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { create as createQr } from 'qrcode'
import { formatBRL, getActiveItens, getActiveOrcamento, toDateOrNull } from '@/lib/pedido-resumo'
import { EscPos, LINE_WIDTH, padLR, wrapText } from '@/lib/escpos'
import { COMPANY_INFO, type CompanyInfo } from '@/lib/company-info'
import { PAGAMENTO_METODO_LABELS } from '@/types/pedido'
import type { Pedido } from '@/types/pedido'
import type { FiscalAmbiente, FiscalEmitResult } from '@/lib/fiscal/types'

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface DanfeNfceItem {
  quantidade: number
  nome: string
  descricao?: string
  precoUnitario: number
  total: number
}

export interface DanfeNfceTotals {
  /** Sum of item subtotals, before discount/surcharge. */
  produtos: number
  /** Discount as an absolute value. */
  desconto: number
  /** Surcharge. */
  acrescimo: number
  /** Shipping (frete). */
  frete: number
  /** Final note value (vNF). */
  total: number
}

export interface DanfeNfcePayment {
  /** pt-BR method label (e.g. "PIX", "Cartão de Crédito"). */
  metodo: string
  valor: number
}

export interface DanfeNfceConsumidor {
  nome?: string
  /** Formatted CPF/CNPJ; absent ⇒ anonymous consumer. */
  cpf?: string
}

export interface DanfeNfceModel {
  company: CompanyInfo
  numeroPedido: string
  itens: DanfeNfceItem[]
  totals: DanfeNfceTotals
  pagamentos: DanfeNfcePayment[]
  /** Chave de acesso (44 digits). */
  chaveAcesso: string
  protocolo: string
  /** Consulta URL for the QR / chave lookup. */
  urlChave: string
  /** infNFeSupl QR string (fed to `makeQrImageData`). */
  qrCode: string
  ambiente: FiscalAmbiente
  serie: number
  numero: number
  emitidaEm: Date | null
  consumidor: DanfeNfceConsumidor
}

export interface DanfeNfceModelOptions {
  /** SEFAZ environment; drives the "SEM VALOR FISCAL" banner. Default 'producao'. */
  ambiente?: FiscalAmbiente
  /** Resolved consumer identity (from the client record / recipient). */
  consumidor?: DanfeNfceConsumidor
}

// ---------------------------------------------------------------------------
// Model builder (pure)
// ---------------------------------------------------------------------------

/**
 * Assemble the DANFE-NFC-e view-model from an order and its emission result.
 * Totals are recomputed from the active orçamento (never trusting a stored
 * total), matching `buildReciboModel`. The consumer is anonymous unless a CPF
 * is supplied via `options.consumidor`.
 */
export function buildDanfeNfceModel(
  pedido: Pedido,
  result: FiscalEmitResult,
  options: DanfeNfceModelOptions = {},
): DanfeNfceModel {
  const orcamento = getActiveOrcamento(pedido)
  const itens: DanfeNfceItem[] = getActiveItens(pedido).map((it) => ({
    quantidade: it.quantidade,
    nome: it.nome,
    descricao: nonEmpty(it.descricao) ? it.descricao : undefined,
    precoUnitario: it.precoUnitario,
    total: it.total,
  }))

  const produtos = itens.reduce((sum, it) => sum + it.total, 0)
  const descontoRaw = orcamento?.desconto ?? 0
  const desconto =
    orcamento?.descontoTipo === 'percentual' ? produtos * (descontoRaw / 100) : descontoRaw
  const acrescimo = orcamento?.acrescimo ?? 0
  const frete = pedido.entrega?.freteTotal ?? 0
  const total = Math.max(0, produtos - desconto + acrescimo) + frete

  const pagamentos: DanfeNfcePayment[] = (pedido.pagamentos ?? []).map((p) => ({
    metodo: PAGAMENTO_METODO_LABELS[p.metodo] ?? p.metodo,
    valor: p.valor,
  }))

  const consumidor: DanfeNfceConsumidor = options.consumidor ?? {}

  return {
    company: COMPANY_INFO,
    numeroPedido: pedido.numeroPedido,
    itens,
    totals: { produtos, desconto, acrescimo, frete, total },
    pagamentos,
    chaveAcesso: result.accessKey ?? '',
    protocolo: result.protocolo ?? '',
    urlChave: result.urlChave ?? '',
    qrCode: result.qrCode ?? '',
    ambiente: options.ambiente ?? 'producao',
    serie: result.serie,
    numero: result.numero,
    emitidaEm: toDateOrNull(result.emittedAt),
    consumidor,
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function formatDateTime(d: Date | null): string {
  return d ? format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
}

/** BRL without the non-breaking spaces some ICU builds insert (they'd print as '?'). */
function money(v: number): string {
  return formatBRL(v).replace(/[  ]/g, ' ')
}

/** Break the 44-digit chave de acesso into space-separated groups of four. */
export function formatChaveAcesso(chave: string): string {
  const digits = chave.replace(/\D/g, '')
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

// ---------------------------------------------------------------------------
// Byte assembly (pure — no DOM)
// ---------------------------------------------------------------------------

/**
 * Build the full 80mm DANFE-NFC-e as ESC/POS bytes. `qrImageData` (the rendered
 * infNFeSupl QR) and `logo` are optional — when null each is simply omitted.
 * This function is pure: pass a fake `ImageData` to unit-test the layout.
 */
export function buildDanfeNfce(
  model: DanfeNfceModel,
  qrImageData?: ImageData | null,
  logo?: ImageData | null,
): Uint8Array {
  const p = new EscPos()
  p.init().codepage()

  // --- Letterhead (centered) ---
  p.align('center')
  if (logo) p.image(logo).newline()
  p.bold(true).line(model.company.tradeName).bold(false)
  p.line(model.company.legalName)
  p.line(`CNPJ: ${model.company.cnpj}`)
  for (const l of wrapText(`${model.company.address} - CEP: ${model.company.cep}`)) p.line(l)
  p.line(model.company.phone)

  // --- Document title ---
  p.rule()
  p.bold(true).line('DANFE NFC-e').bold(false)
  p.line('Documento Auxiliar da NFC-e')

  // Homologação has no fiscal value — say so loudly.
  if (model.ambiente === 'homologacao') {
    p.rule()
    p.bold(true).line('SEM VALOR FISCAL - HOMOLOGACAO').bold(false)
  }

  // --- Items ---
  p.align('left').rule()
  p.bold(true).line(padLR('ITEM', 'SUBTOTAL')).bold(false)
  for (const item of model.itens) {
    for (const l of wrapText(item.nome)) p.line(l)
    if (item.descricao) for (const l of wrapText(item.descricao, LINE_WIDTH - 2)) p.line(`  ${l}`)
    p.line(padLR(`  ${item.quantidade} x ${money(item.precoUnitario)}`, money(item.total)))
  }

  // --- Totals ---
  p.rule()
  const t = model.totals
  p.line(padLR('Subtotal', money(t.produtos)))
  if (t.desconto > 0) p.line(padLR('Descontos', `-${money(t.desconto)}`))
  if (t.acrescimo > 0) p.line(padLR('Acrescimo', money(t.acrescimo)))
  if (t.frete > 0) p.line(padLR('Frete', money(t.frete)))
  p.bold(true).line(padLR('VALOR TOTAL', money(t.total))).bold(false)

  // --- Payments ---
  p.rule()
  p.bold(true).line('FORMA DE PAGAMENTO').bold(false)
  if (model.pagamentos.length > 0) {
    for (const pay of model.pagamentos) p.line(padLR(pay.metodo, money(pay.valor)))
  } else {
    p.line('Nenhum pagamento registrado.')
  }

  // --- Consumer ---
  p.rule()
  if (model.consumidor.cpf) {
    p.line(`CONSUMIDOR CPF: ${model.consumidor.cpf}`)
    if (model.consumidor.nome) for (const l of wrapText(model.consumidor.nome)) p.line(l)
  } else {
    p.line('CONSUMIDOR NAO IDENTIFICADO')
  }

  // --- Fiscal block ---
  p.align('center').rule()
  p.line(`NFC-e no. ${model.numero} Serie ${model.serie}`)
  p.line(`Emitida em ${formatDateTime(model.emitidaEm)}`)
  p.line('Consulte pela Chave de Acesso em')
  if (model.urlChave) for (const l of wrapText(model.urlChave)) p.line(l)
  p.line('CHAVE DE ACESSO')
  for (const l of wrapText(formatChaveAcesso(model.chaveAcesso))) p.line(l)
  if (model.protocolo) {
    p.line('Protocolo de Autorizacao')
    p.line(model.protocolo)
  }

  // --- QR code ---
  if (qrImageData) {
    p.newline()
    p.image(qrImageData)
  }

  p.feed(4).cut()

  return p.encode()
}

// ---------------------------------------------------------------------------
// QR bitmap generation (DOM-free)
// ---------------------------------------------------------------------------

/** Build an `ImageData` regardless of environment (browser or Node/tests). */
function toImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    // Cast the constructor: the lib's ImageData signature pins the buffer to a
    // non-shared ArrayBuffer, which our default-allocated array doesn't satisfy.
    const Ctor = ImageData as unknown as new (d: Uint8ClampedArray, w: number, h: number) => ImageData
    return new Ctor(data, width, height)
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

/**
 * Render the NFC-e `qrCode` string to a square QR bitmap as `ImageData`, sized
 * to roughly `size` printer dots (default ~384 for 80mm) rounded to a multiple
 * of 8. Dark modules print black; a 4-module quiet zone frames the code.
 *
 * Built from the pure QR module matrix (`qrcode`'s `create`), so it never
 * touches a canvas and is safe to call in Node — the byte assembly stays the
 * only thing tests must exercise, but this is testable too.
 */
export async function makeQrImageData(qrText: string, size = 384): Promise<ImageData> {
  const qr = createQr(qrText, { errorCorrectionLevel: 'M' })
  const count = qr.modules.size
  const bits = qr.modules.data
  const quiet = 4 // quiet-zone modules on every side
  const modulesTotal = count + quiet * 2

  // Largest integer module scale that keeps the bitmap within `size` dots.
  const scale = Math.max(1, Math.floor(size / modulesTotal))
  const raw = modulesTotal * scale
  // Pad up to a multiple of 8 with white so the raster width is byte-aligned.
  const dim = Math.ceil(raw / 8) * 8

  // Start fully white/opaque (fill(255) sets R,G,B,A to 255).
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255)

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!bits[r * count + c]) continue // light module — leave white
      const x0 = (c + quiet) * scale
      const y0 = (r + quiet) * scale
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const idx = ((y0 + dy) * dim + (x0 + dx)) * 4
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
          // alpha stays 255
        }
      }
    }
  }

  return toImageData(data, dim, dim)
}

export { LINE_WIDTH }
