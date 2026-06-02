import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Controllable permissions
const canPerformAction = vi.fn()
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction }),
}))

// No surrounding PedidoContext → onUpdate path
vi.mock('@/contexts/PedidoContext', () => ({ usePedidoOptional: () => null }))

// Stub the editor so we can trigger onChange/onCommit deterministically.
vi.mock('@/components/pedidos/ReferenciaImagesEditor', () => ({
  ReferenciaImagesEditor: ({ value, onChange, onCommit, disabled }: any) => (
    <div>
      <span data-testid="count">{value.length}</span>
      <span data-testid="disabled">{String(disabled)}</span>
      <button onClick={() => onChange([...value, { url: 'u', storagePath: 's' }])}>change</button>
      <button onClick={() => onCommit?.([...value, { url: 'u', storagePath: 's' }])}>commit</button>
    </div>
  ),
}))

import { ReferenciasSection } from '@/components/pedidos/ReferenciasSection'
import { toast } from 'sonner'

const pedido: any = {
  id: 'p1',
  imagensReferencia: [
    { id: 'img-1', url: 'https://x/a.jpg', storagePath: 'images/gallery/pedido-referencias/a.jpg', legenda: 'A' },
  ],
}

describe('ReferenciasSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canPerformAction.mockReturnValue(true)
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    })) as unknown as typeof fetch
  })

  it('seeds the editor from pedido.imagensReferencia', () => {
    render(<ReferenciasSection pedido={pedido} onUpdate={vi.fn()} />)
    expect(screen.getByTestId('count').textContent).toBe('1')
    expect(screen.getByTestId('disabled').textContent).toBe('false')
  })

  it('PUTs the array and calls onUpdate when the editor commits', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<ReferenciasSection pedido={pedido} onUpdate={onUpdate} />)

    await user.click(screen.getByRole('button', { name: 'commit' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const [url, init] = (global.fetch as any).mock.calls[0]
    expect(url).toBe('/api/pedidos/p1')
    expect(init.method).toBe('PUT')
    const body = JSON.parse(init.body)
    expect(body.imagensReferencia).toHaveLength(2)

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalled()
  })

  it('is read-only (no commit) without orders:update permission', () => {
    canPerformAction.mockReturnValue(false)
    render(<ReferenciasSection pedido={pedido} onUpdate={vi.fn()} />)
    expect(screen.getByTestId('disabled').textContent).toBe('true')
  })

  it('shows an error toast when the PUT fails', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'boom' }),
    })) as unknown as typeof fetch
    render(<ReferenciasSection pedido={pedido} onUpdate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'commit' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})
