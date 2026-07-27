/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Mock the emit hook -----------------------------------------------------

const emitMock = vi.fn()
const printNfceMock = vi.fn()
const cancelMock = vi.fn()
let hookState: any

vi.mock('@/hooks/useEmitirNf', () => ({
  useEmitirNf: () => hookState,
}))

import { NfSection } from '@/components/pedidos/NfSection'
import type { Pedido } from '@/types/pedido'

function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1',
    numeroPedido: 'PED-0777',
    clienteNome: 'Cliente Loja',
    origem: 'LOJA',
    statusPagamento: 'PENDENTE',
    ...overrides,
  } as Pedido
}

function baseHook(overrides: Record<string, any> = {}) {
  return {
    emit: emitMock,
    emitting: false,
    error: null,
    rejection: null,
    result: null,
    printNfce: printNfceMock,
    printing: false,
    printError: null,
    cancel: cancelMock,
    cancelling: false,
    cancelError: null,
    cancelRejection: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  hookState = baseHook()
  emitMock.mockResolvedValue({ nf: {}, pedido: pedido() })
  cancelMock.mockResolvedValue({ cancel: { protocolo: '1', cancelledAt: 'x' }, pedido: pedido() })
})

// --- Model default ----------------------------------------------------------

describe('NfSection model default', () => {
  it('defaults to NFC-e (65) for a loja order', () => {
    render(<NfSection pedido={pedido({ origem: 'LOJA' })} />)
    // The 65 button is the active (default) variant — both labels are present.
    expect(screen.getByRole('button', { name: /NFC-e \(65\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /NF-e \(55\)/ })).toBeInTheDocument()
  })

  it('defaults to NF-e (55) for an online order and shows the paid-only helper when unpaid', () => {
    render(<NfSection pedido={pedido({ origem: 'ONLINE', statusPagamento: 'PENDENTE' })} />)
    expect(screen.getByText(/Disponível apenas para pedidos online pagos/i)).toBeInTheDocument()
  })
})

// --- Enablement matrix ------------------------------------------------------

describe('NfSection enablement', () => {
  it('disables Emitir for NF-e (55) when the online order is unpaid', () => {
    render(<NfSection pedido={pedido({ origem: 'ONLINE', statusPagamento: 'PENDENTE', billing: undefined })} />)
    expect(screen.getByRole('button', { name: /Emitir NF/i })).toBeDisabled()
  })

  it('enables Emitir for NF-e (55) when the order is online, paid and has billing', () => {
    render(
      <NfSection
        pedido={pedido({ origem: 'ONLINE', statusPagamento: 'PAGO', billing: { nome: 'F', cpfCnpj: '1', email: 'e', confirmedAt: {} } as any })}
      />,
    )
    expect(screen.getByRole('button', { name: /Emitir NF/i })).toBeEnabled()
  })

  it('enables Emitir for NFC-e (65) regardless of payment', () => {
    render(<NfSection pedido={pedido({ origem: 'LOJA', statusPagamento: 'PENDENTE' })} />)
    expect(screen.getByRole('button', { name: /Emitir NF/i })).toBeEnabled()
  })
})

// --- Emit interaction -------------------------------------------------------

describe('NfSection emit', () => {
  it('calls emit with the selected model and fires onEmitted on success', async () => {
    const user = userEvent.setup()
    const onEmitted = vi.fn()
    render(<NfSection pedido={pedido({ origem: 'LOJA' })} onEmitted={onEmitted} />)

    await user.click(screen.getByRole('button', { name: /Emitir NF/i }))
    expect(emitMock).toHaveBeenCalledWith(65)
    await waitFor(() => expect(onEmitted).toHaveBeenCalled())
  })

  it('lets the user switch to NF-e (55) before emitting', async () => {
    const user = userEvent.setup()
    render(
      <NfSection
        pedido={pedido({ origem: 'LOJA', statusPagamento: 'PAGO', billing: { nome: 'F', cpfCnpj: '1', email: 'e', confirmedAt: {} } as any })}
      />,
    )
    await user.click(screen.getByRole('button', { name: /NF-e \(55\)/ }))
    await user.click(screen.getByRole('button', { name: /Emitir NF/i }))
    expect(emitMock).toHaveBeenCalledWith(55)
  })

  it('shows the SEFAZ spinner label while emitting', () => {
    hookState = baseHook({ emitting: true })
    render(<NfSection pedido={pedido()} />)
    expect(screen.getByText(/Comunicando com a SEFAZ/i)).toBeInTheDocument()
  })

  it('renders a rejection alert with the cStat message', () => {
    hookState = baseHook({ rejection: { code: '539', message: 'Duplicidade de NF-e' } })
    render(<NfSection pedido={pedido()} />)
    expect(screen.getByText(/Duplicidade de NF-e/)).toBeInTheDocument()
    expect(screen.getByText(/539/)).toBeInTheDocument()
  })

  it('renders a rejection alert without a code suffix when code is empty', () => {
    hookState = baseHook({ rejection: { code: '', message: 'Erro genérico da SEFAZ' } })
    render(<NfSection pedido={pedido()} />)
    expect(screen.getByText(/Erro genérico da SEFAZ/)).toBeInTheDocument()
  })

  it('renders a generic error alert', () => {
    hookState = baseHook({ error: 'Falha inesperada' })
    render(<NfSection pedido={pedido()} />)
    expect(screen.getByText('Falha inesperada')).toBeInTheDocument()
  })

})

// --- Already-emitted view ---------------------------------------------------

describe('NfSection emitted view', () => {
  const emittedNfce = pedido({
    nfStatus: 'EMITIDA',
    nfModelo: 65,
    nfSerie: 1,
    nfNumero: 123,
    nfAccessKey: '35260730640317000153650010000001231234567890',
    nfQrCode: 'QRTEXT',
    nfUrlChave: 'https://consulta',
  })

  it('shows the model badge, formatted chave and download links', () => {
    render(<NfSection pedido={emittedNfce} />)
    expect(screen.getByText('NFC-e')).toBeInTheDocument()
    expect(screen.getByText(/3526 0730 6403/)).toBeInTheDocument()

    const danfe = screen.getByRole('link', { name: /Baixar DANFE/i })
    expect(danfe).toHaveAttribute('href', '/api/pedidos/p1/nf/danfe')
    const xml = screen.getByRole('link', { name: /Baixar XML/i })
    expect(xml).toHaveAttribute('href', '/api/pedidos/p1/nf/xml')
  })

  it('offers an Imprimir DANFE-NFC-e button for model 65 that calls printNfce', async () => {
    const user = userEvent.setup()
    render(<NfSection pedido={emittedNfce} />)
    await user.click(screen.getByRole('button', { name: /Imprimir DANFE-NFC-e/i }))
    expect(printNfceMock).toHaveBeenCalledWith(
      // No stored ambiente ⇒ defaults to homologação.
      expect.objectContaining({ modelo: 65, serie: 1, numero: 123, qrCode: 'QRTEXT', ambiente: 'homologacao' }),
    )
  })

  it('passes the persisted ambiente and protocolo into the reprint payload', async () => {
    const user = userEvent.setup()
    render(
      <NfSection pedido={pedido({ ...emittedNfce, nfAmbiente: 'producao', nfProtocolo: '135260000123456' })} />,
    )
    await user.click(screen.getByRole('button', { name: /Imprimir DANFE-NFC-e/i }))
    expect(printNfceMock).toHaveBeenCalledWith(
      expect.objectContaining({ ambiente: 'producao', protocolo: '135260000123456' }),
    )
  })

  it('reprints with safe defaults when stored NF fields are missing', async () => {
    const user = userEvent.setup()
    render(
      <NfSection
        pedido={pedido({
          nfStatus: 'EMITIDA', nfModelo: 65,
          nfSerie: null, nfNumero: null, nfAccessKey: null, nfQrCode: null, nfUrlChave: null,
        })}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Imprimir DANFE-NFC-e/i }))
    expect(printNfceMock).toHaveBeenCalledWith(
      expect.objectContaining({ modelo: 65, serie: 0, numero: 0, accessKey: '', qrCode: undefined, urlChave: undefined }),
    )
  })

  it('hides the print button for an NF-e (55) and shows the NF-e badge', () => {
    render(<NfSection pedido={pedido({ nfStatus: 'EMITIDA', nfModelo: 55, nfNumero: 5, nfSerie: 1 })} />)
    expect(screen.getByText('NF-e')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Imprimir DANFE-NFC-e/i })).not.toBeInTheDocument()
  })

  it('surfaces a print error message', () => {
    hookState = baseHook({ printError: 'boom' })
    render(<NfSection pedido={emittedNfce} />)
    expect(screen.getByText(/Não foi possível imprimir/i)).toBeInTheDocument()
  })

  it('disables the print button while printing is in progress', () => {
    hookState = baseHook({ printing: true })
    render(<NfSection pedido={emittedNfce} />)
    expect(screen.getByRole('button', { name: /Imprimir DANFE-NFC-e/i })).toBeDisabled()
  })

  it('does not render the emit controls once emitted', () => {
    render(<NfSection pedido={emittedNfce} />)
    expect(screen.queryByRole('button', { name: /Emitir NF/i })).not.toBeInTheDocument()
  })

  it('enables the Cancelar NF button when emitted', () => {
    render(<NfSection pedido={emittedNfce} />)
    expect(screen.getByRole('button', { name: /Cancelar NF/i })).toBeEnabled()
  })
})

// --- Cancellation flow ------------------------------------------------------

describe('NfSection cancellation', () => {
  const emitted = pedido({ nfStatus: 'EMITIDA', nfModelo: 65, nfSerie: 1, nfNumero: 123 })

  it('opens the confirm dialog and gates confirm on a 15-char justificativa', async () => {
    const user = userEvent.setup()
    render(<NfSection pedido={emitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))

    const confirm = screen.getByRole('button', { name: /Confirmar cancelamento/i })
    expect(confirm).toBeDisabled()

    const textarea = screen.getByLabelText('Justificativa')
    await user.type(textarea, 'curto') // < 15 chars
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/deve ter entre 15 e 255 caracteres/i)).toBeInTheDocument()

    await user.clear(textarea)
    await user.type(textarea, 'Cancelamento por erro de digitação no pedido')
    expect(confirm).toBeEnabled()
  })

  it('calls cancel with the trimmed justificativa and fires onEmitted on success', async () => {
    const user = userEvent.setup()
    const onEmitted = vi.fn()
    render(<NfSection pedido={emitted} onEmitted={onEmitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))
    await user.type(screen.getByLabelText('Justificativa'), '  Justificativa suficientemente longa  ')
    await user.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }))

    expect(cancelMock).toHaveBeenCalledWith('Justificativa suficientemente longa')
    await waitFor(() => expect(onEmitted).toHaveBeenCalled())
  })

  it('shows the SEFAZ rejection message inside the dialog', async () => {
    const user = userEvent.setup()
    hookState = baseHook({ cancelRejection: { code: '501', message: 'Prazo de cancelamento expirado' } })
    render(<NfSection pedido={emitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))
    expect(screen.getByText(/Prazo de cancelamento expirado/)).toBeInTheDocument()
    expect(screen.getByText(/501/)).toBeInTheDocument()
  })

  it('shows the SEFAZ spinner label while cancelling', async () => {
    const user = userEvent.setup()
    hookState = baseHook({ cancelling: true })
    render(<NfSection pedido={emitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))
    expect(screen.getByText(/Cancelando na SEFAZ/i)).toBeInTheDocument()
  })

  it('renders a generic cancel error inside the dialog', async () => {
    const user = userEvent.setup()
    hookState = baseHook({ cancelError: 'Falha ao cancelar' })
    render(<NfSection pedido={emitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))
    expect(screen.getByText('Falha ao cancelar')).toBeInTheDocument()
  })

  it('closes the dialog via Voltar without cancelling', async () => {
    const user = userEvent.setup()
    render(<NfSection pedido={emitted} />)
    await user.click(screen.getByRole('button', { name: /Cancelar NF/i }))
    expect(screen.getByLabelText('Justificativa')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Voltar/i }))
    await waitFor(() => expect(screen.queryByLabelText('Justificativa')).not.toBeInTheDocument())
    expect(cancelMock).not.toHaveBeenCalled()
  })
})

// --- Cancelled view ---------------------------------------------------------

describe('NfSection cancelled view', () => {
  const cancelled = pedido({
    nfStatus: 'CANCELADA',
    nfModelo: 65,
    nfSerie: 1,
    nfNumero: 123,
    nfCancelJustificativa: 'Cancelado por erro de digitação',
    nfCancelProtocolo: '135260000999999',
    nfCancelledAt: { toDate: () => new Date(2026, 6, 27, 10, 0), _seconds: 1 } as any,
  })

  it('shows the Cancelada badge, justificativa and cancel protocolo', () => {
    render(<NfSection pedido={cancelled} />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.getByText('Cancelado por erro de digitação')).toBeInTheDocument()
    expect(screen.getByText('135260000999999')).toBeInTheDocument()
    expect(screen.getByText(/Nota fiscal cancelada/i)).toBeInTheDocument()
  })

  it('keeps the downloads but hides the emit controls and the print button', () => {
    render(<NfSection pedido={cancelled} />)
    expect(screen.getByRole('link', { name: /Baixar DANFE/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Baixar XML/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Emitir NF/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Imprimir DANFE-NFC-e/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cancelar NF$/i })).not.toBeInTheDocument()
  })
})
