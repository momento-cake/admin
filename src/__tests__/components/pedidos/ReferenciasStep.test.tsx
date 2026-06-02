import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/pedidos/ReferenciaImagesEditor', () => ({
  ReferenciaImagesEditor: ({ value }: any) => (
    <div data-testid="editor">{value.length}</div>
  ),
}))

import { ReferenciasStep } from '@/components/pedidos/creation/ReferenciasStep'

describe('ReferenciasStep', () => {
  it('renders the heading and forwards the value to the editor', () => {
    render(
      <ReferenciasStep
        value={[{ url: 'u', storagePath: 's' }]}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByText('Imagens de Referência')).toBeInTheDocument()
    expect(screen.getByTestId('editor').textContent).toBe('1')
  })
})
