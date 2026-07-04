/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock UI components
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: any) => <label {...rest}>{children}</label>,
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Calendar: () => <span data-testid="icon-calendar">calendar</span>,
    Lock: () => <span data-testid="icon-lock">lock</span>,
    Globe: () => <span data-testid="icon-globe">globe</span>,
    AlertCircle: () => <span data-testid="icon-alert">alert</span>,
  }
})

import { DetalhesStep } from '@/components/pedidos/creation/DetalhesStep'

function renderStep(overrides: Partial<React.ComponentProps<typeof DetalhesStep>> = {}) {
  const props = {
    entregaTipo: 'ENTREGA' as const,
    dataEntrega: '',
    onDataEntregaChange: vi.fn(),
    observacoes: '',
    onObservacoesChange: vi.fn(),
    observacoesCliente: '',
    onObservacoesClienteChange: vi.fn(),
    ...overrides,
  }
  const utils = render(<DetalhesStep {...props} />)
  return { ...utils, props }
}

describe('DetalhesStep - delivery date', () => {
  it('renders the delivery date input', () => {
    renderStep()
    const input = document.getElementById('dataEntrega') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.getAttribute('type')).toBe('date')
  })

  it('does NOT restrict the date input to today or future (no min lower bound)', () => {
    renderStep()
    const input = document.getElementById('dataEntrega') as HTMLInputElement
    // A `min` set to today would block back-dating past orders in the picker.
    const min = input.getAttribute('min')
    expect(min == null || min === '' || min <= '2000-01-01').toBe(true)
  })

  it('accepts a past delivery date without showing a validation error', () => {
    renderStep({ dataEntrega: '2020-01-15' })
    // No future-only error message should be shown for a past date.
    expect(screen.queryByText(/data deve ser hoje ou uma data futura/i)).toBeNull()
    const input = document.getElementById('dataEntrega') as HTMLInputElement
    expect(input.value).toBe('2020-01-15')
  })

  it('accepts a future delivery date without error', () => {
    renderStep({ dataEntrega: '2099-12-31' })
    expect(screen.queryByText(/data deve ser hoje ou uma data futura/i)).toBeNull()
    const input = document.getElementById('dataEntrega') as HTMLInputElement
    expect(input.value).toBe('2099-12-31')
  })

  it('calls onDataEntregaChange when the date changes to a past value', async () => {
    const user = userEvent.setup()
    const { props } = renderStep()
    const input = document.getElementById('dataEntrega') as HTMLInputElement
    await user.type(input, '2019-06-01')
    expect(props.onDataEntregaChange).toHaveBeenCalled()
  })

  it('renders the RETIRADA (pickup) label variant', () => {
    renderStep({ entregaTipo: 'RETIRADA' })
    expect(screen.getByText('Data de Retirada')).toBeTruthy()
    expect(screen.getByText(/Defina a data de retirada/i)).toBeTruthy()
  })
})

describe('DetalhesStep - observation fields', () => {
  it('calls onObservacoesChange when internal notes change', async () => {
    const user = userEvent.setup()
    const { props } = renderStep()
    const textarea = document.getElementById('observacoes') as HTMLTextAreaElement
    await user.type(textarea, 'nota interna')
    expect(props.onObservacoesChange).toHaveBeenCalled()
  })

  it('calls onObservacoesClienteChange when client notes change', async () => {
    const user = userEvent.setup()
    const { props } = renderStep()
    const textarea = document.getElementById('observacoesCliente') as HTMLTextAreaElement
    await user.type(textarea, 'nota cliente')
    expect(props.onObservacoesClienteChange).toHaveBeenCalled()
  })
})
