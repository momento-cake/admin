/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className, ...rest }: any) => (
    <div onClick={onClick} className={className} {...rest}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Truck: () => <span data-testid="icon-truck">truck</span>,
    Store: () => <span data-testid="icon-store">store</span>,
    Check: () => <span data-testid="icon-check">check</span>,
    MapPin: () => <span data-testid="icon-mappin">mappin</span>,
  }
})

import { EntregaStep } from '@/components/pedidos/creation/EntregaStep'
import { Address } from '@/types/client'

const mockClientAddresses: Address[] = [
  {
    id: 'addr-1',
    label: 'Casa',
    endereco: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01001-000',
  },
  {
    id: 'addr-2',
    label: 'Trabalho',
    endereco: 'Av. Paulista',
    numero: '1000',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01310-100',
  },
]

const mockStoreAddresses = [
  {
    id: 'store-1',
    nome: 'Loja Centro',
    endereco: 'Rua Augusta',
    numero: '500',
    bairro: 'Consolação',
    cidade: 'São Paulo',
    estado: 'SP',
  },
  {
    id: 'store-2',
    nome: 'Loja Shopping',
    endereco: 'Av. Brasil',
    numero: '200',
    bairro: 'Jardins',
    cidade: 'São Paulo',
  },
]

function renderEntregaStep(overrides: Partial<Parameters<typeof EntregaStep>[0]> = {}) {
  const defaultProps = {
    entregaTipo: 'RETIRADA' as const,
    onTipoChange: vi.fn(),
    selectedClientAddress: null,
    clientAddresses: [],
    loadingClientAddresses: false,
    onSelectClientAddress: vi.fn(),
    selectedStoreAddress: null,
    storeAddresses: [],
    loadingStoreAddresses: false,
    onSelectStoreAddress: vi.fn(),
    ...overrides,
  }
  return { ...render(<EntregaStep {...defaultProps} />), props: defaultProps }
}

describe('EntregaStep', () => {
  it('renders ENTREGA and RETIRADA toggle buttons', () => {
    renderEntregaStep()
    expect(screen.getByTestId('toggle-entrega')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-retirada')).toBeInTheDocument()
  })

  it('calls onTipoChange when toggling to ENTREGA', async () => {
    const user = userEvent.setup()
    const { props } = renderEntregaStep({ entregaTipo: 'RETIRADA' })
    await user.click(screen.getByTestId('toggle-entrega'))
    expect(props.onTipoChange).toHaveBeenCalledWith('ENTREGA')
  })

  it('calls onTipoChange when toggling to RETIRADA', async () => {
    const user = userEvent.setup()
    const { props } = renderEntregaStep({ entregaTipo: 'ENTREGA' })
    await user.click(screen.getByTestId('toggle-retirada'))
    expect(props.onTipoChange).toHaveBeenCalledWith('RETIRADA')
  })

  it('shows client addresses when ENTREGA is selected', () => {
    renderEntregaStep({
      entregaTipo: 'ENTREGA',
      clientAddresses: mockClientAddresses,
    })
    expect(screen.getByText('Endereço de entrega')).toBeInTheDocument()
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getByText('Trabalho')).toBeInTheDocument()
  })

  it('shows empty state when ENTREGA is selected and no addresses', () => {
    renderEntregaStep({
      entregaTipo: 'ENTREGA',
      clientAddresses: [],
    })
    expect(
      screen.getByText('Nenhum endereço cadastrado para este cliente')
    ).toBeInTheDocument()
  })

  it('shows loading skeletons for client addresses', () => {
    renderEntregaStep({
      entregaTipo: 'ENTREGA',
      loadingClientAddresses: true,
    })
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('fires onSelectClientAddress when an address is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderEntregaStep({
      entregaTipo: 'ENTREGA',
      clientAddresses: mockClientAddresses,
    })
    await user.click(screen.getByTestId('address-card-addr-1'))
    expect(props.onSelectClientAddress).toHaveBeenCalledWith(mockClientAddresses[0])
  })

  it('shows store addresses when RETIRADA is selected', () => {
    renderEntregaStep({
      entregaTipo: 'RETIRADA',
      storeAddresses: mockStoreAddresses,
    })
    expect(screen.getByText('Endereço de retirada')).toBeInTheDocument()
    expect(screen.getByText('Loja Centro')).toBeInTheDocument()
    expect(screen.getByText('Loja Shopping')).toBeInTheDocument()
  })

  it('shows empty state when RETIRADA is selected and no store addresses', () => {
    renderEntregaStep({
      entregaTipo: 'RETIRADA',
      storeAddresses: [],
    })
    expect(
      screen.getByText('Nenhum endereço de loja cadastrado')
    ).toBeInTheDocument()
  })

  it('fires onSelectStoreAddress when a store address is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderEntregaStep({
      entregaTipo: 'RETIRADA',
      storeAddresses: mockStoreAddresses,
    })
    await user.click(screen.getByTestId('store-card-store-1'))
    expect(props.onSelectStoreAddress).toHaveBeenCalledWith({
      id: 'store-1',
      nome: 'Loja Centro',
    })
  })

  it('shows check icon on selected client address', () => {
    renderEntregaStep({
      entregaTipo: 'ENTREGA',
      clientAddresses: mockClientAddresses,
      selectedClientAddress: mockClientAddresses[0],
    })
    // The selected card should have a check icon
    const checkIcons = screen.getAllByTestId('icon-check')
    expect(checkIcons.length).toBeGreaterThan(0)
  })

  it('shows check icon on selected store address', () => {
    renderEntregaStep({
      entregaTipo: 'RETIRADA',
      storeAddresses: mockStoreAddresses,
      selectedStoreAddress: { id: 'store-1', nome: 'Loja Centro' },
    })
    const checkIcons = screen.getAllByTestId('icon-check')
    expect(checkIcons.length).toBeGreaterThan(0)
  })

  it('shows loading skeletons for store addresses', () => {
    renderEntregaStep({
      entregaTipo: 'RETIRADA',
      loadingStoreAddresses: true,
    })
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('does NOT show client addresses when RETIRADA is selected', () => {
    renderEntregaStep({
      entregaTipo: 'RETIRADA',
      clientAddresses: mockClientAddresses,
    })
    expect(screen.queryByText('Endereço de entrega')).not.toBeInTheDocument()
    expect(screen.queryByText('Casa')).not.toBeInTheDocument()
  })

  it('does NOT show store addresses when ENTREGA is selected', () => {
    renderEntregaStep({
      entregaTipo: 'ENTREGA',
      storeAddresses: mockStoreAddresses,
    })
    expect(screen.queryByText('Endereço de retirada')).not.toBeInTheDocument()
    expect(screen.queryByText('Loja Centro')).not.toBeInTheDocument()
  })
})
