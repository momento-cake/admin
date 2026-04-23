import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  PedidoDateRangeFilter,
  type PedidoDateFilterValue,
} from '@/components/pedidos/PedidoDateRangeFilter'

const EMPTY: PedidoDateFilterValue = { preset: null }

describe('PedidoDateRangeFilter', () => {
  beforeEach(() => {
    // Freeze time so preset ranges are deterministic
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 15, 12, 0, 0))
  })

  it('renders idle trigger when no filter is active', () => {
    render(<PedidoDateRangeFilter value={EMPTY} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /período/i })).toBeInTheDocument()
  })

  it('opens the popover with all preset options', () => {
    render(<PedidoDateRangeFilter value={EMPTY} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /período/i }))

    expect(screen.getByRole('button', { name: 'Esta semana' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Este mês' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximas 2 semanas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Personalizado' })).toBeInTheDocument()
  })

  it('emits preset + computed dateFrom/dateTo when a preset is chosen', () => {
    const onChange = vi.fn()
    render(<PedidoDateRangeFilter value={EMPTY} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /período/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Este mês' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const payload = onChange.mock.calls[0][0] as PedidoDateFilterValue
    expect(payload.preset).toBe('THIS_MONTH')
    // April 2026
    expect(payload.dateFrom).toBe('2026-04-01')
    expect(payload.dateTo).toBe('2026-04-30')
  })

  it('emits NEXT_2_WEEKS with today through today+13', () => {
    const onChange = vi.fn()
    render(<PedidoDateRangeFilter value={EMPTY} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /período/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximas 2 semanas' }))

    const payload = onChange.mock.calls[0][0] as PedidoDateFilterValue
    expect(payload.preset).toBe('NEXT_2_WEEKS')
    expect(payload.dateFrom).toBe('2026-04-15')
    expect(payload.dateTo).toBe('2026-04-28')
  })

  it('shows custom date inputs when Personalizado is selected', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PedidoDateRangeFilter value={EMPTY} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /período/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }))

    // Component echoes CUSTOM back without dateFrom/dateTo; parent updates value.
    expect(onChange).toHaveBeenCalledWith({ preset: 'CUSTOM' })

    rerender(
      <PedidoDateRangeFilter value={{ preset: 'CUSTOM' }} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /período/i }))

    const from = screen.getByLabelText(/início/i) as HTMLInputElement
    const to = screen.getByLabelText(/fim/i) as HTMLInputElement
    expect(from).toBeInTheDocument()
    expect(to).toBeInTheDocument()

    fireEvent.change(from, { target: { value: '2026-05-01' } })
    fireEvent.change(to, { target: { value: '2026-05-15' } })

    const lastCall = onChange.mock.calls.at(-1)![0] as PedidoDateFilterValue
    expect(lastCall.preset).toBe('CUSTOM')
    expect(lastCall.dateTo).toBe('2026-05-15')
  })

  it('falls back to Personalizado label when CUSTOM is active without dates', () => {
    render(
      <PedidoDateRangeFilter value={{ preset: 'CUSTOM' }} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /personalizado/i })).toBeInTheDocument()
  })

  it('displays the active chip with a clear button when a preset is set', () => {
    const onChange = vi.fn()
    render(
      <PedidoDateRangeFilter
        value={{ preset: 'THIS_MONTH', dateFrom: '2026-04-01', dateTo: '2026-04-30' }}
        onChange={onChange}
      />,
    )

    // Trigger now shows the preset label instead of idle "Período"
    const trigger = screen.getByRole('button', { name: /este mês/i })
    expect(trigger).toBeInTheDocument()

    const clear = screen.getByRole('button', { name: /limpar/i })
    fireEvent.click(clear)
    expect(onChange).toHaveBeenCalledWith({ preset: null })
  })
})
