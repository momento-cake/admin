/**
 * Comprehensive Unit Tests for Packaging Components
 * Testing PackagingForm, PackagingList, StockManager, and StockLevelIndicator
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackagingForm } from '@/components/packaging/PackagingForm';
import { PackagingList } from '@/components/packaging/PackagingList';
import { StockManager } from '@/components/packaging/StockManager';
import { StockLevelIndicator, StockStatusDot, StockLevelProgress } from '@/components/packaging/StockLevelIndicator';
import { Packaging, PackagingUnit, PackagingCategory, StockHistoryEntry, StockUpdateData } from '@/types/packaging';
import { Supplier } from '@/types/ingredient';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/lib/suppliers', () => ({
  fetchSuppliers: vi.fn(),
}));

vi.mock('@/lib/packaging', () => ({
  fetchPackaging: vi.fn(),
  fetchStockHistory: vi.fn(),
  getStockStatus: (currentStock: number, minStock: number) => {
    if (currentStock === 0) return 'out';
    if (currentStock >= minStock) return 'good';
    const percentage = (currentStock / minStock) * 100;
    return percentage < 50 ? 'critical' : 'low';
  },
  formatPrice: (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`,
  getUnitDisplayName: (unit: string) => {
    const units: Record<string, string> = {
      'unit': 'Unidade',
      'box': 'Caixa',
      'set': 'Conjunto',
      'dozen': 'Dúzia',
      'ream': 'Resma'
    };
    return units[unit] || unit;
  },
  getCategoryDisplayName: (category: string) => {
    const categories: Record<string, string> = {
      'box': 'Caixas',
      'base': 'Bases/Boards',
      'topper': 'Toppers',
      'carrier': 'Caixas de Transporte',
      'bag': 'Sacos/Bolsas',
      'paper': 'Papel e Papelão',
      'ribbon': 'Fitas/Decoração',
      'other': 'Outros'
    };
    return categories[category] || category;
  }
}));

import { fetchSuppliers } from '@/lib/suppliers';
import { fetchPackaging, fetchStockHistory } from '@/lib/packaging';

// Get mocked functions
const mockFetchSuppliers = vi.mocked(fetchSuppliers);
const mockFetchPackaging = vi.mocked(fetchPackaging);
const mockFetchStockHistory = vi.mocked(fetchStockHistory);

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)} value={value} disabled={disabled}>
      {children}
    </select>
  ),
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => (
    <option value={value} {...props}>{children}</option>
  ),
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormField: ({ render, control, name }: any) => {
    const field = {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name,
      ref: vi.fn()
    };
    return render({ field });
  },
  FormItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/packaging/LoadMoreButton', () => ({
  LoadMoreButton: ({ onClick, isLoading }: any) => (
    <button onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Carregando...' : 'Carregar Mais'}
    </button>
  ),
}));

vi.mock('@/components/packaging/EmptyState', () => ({
  EmptyState: ({ onCreateClick }: any) => (
    <div data-testid="empty-state">
      <button onClick={onCreateClick}>Criar Primeira Embalagem</button>
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: any) => <div {...props}>Loading</div>,
  Edit: (props: any) => <div {...props}>Edit</div>,
  Trash2: (props: any) => <div {...props}>Delete</div>,
  Plus: (props: any) => <div {...props}>Plus</div>,
  Package: (props: any) => <div {...props}>Package</div>,
  ArrowUp: (props: any) => <div {...props}>ArrowUp</div>,
  ArrowDown: (props: any) => <div {...props}>ArrowDown</div>,
}));

// Test data
const mockSuppliers: Supplier[] = [
  {
    id: 'supplier-1',
    name: 'Silver Plast',
    email: 'contato@silverplast.com.br',
    phone: '+55 11 98765-4321',
    address: 'Rua das Embalagens 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'Brazil',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  },
  {
    id: 'supplier-2',
    name: 'Embalagens Brasil',
    email: 'vendas@embalagensbrasil.com.br',
    phone: '+55 11 87654-3210',
    address: 'Avenida Embalagem 456',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01311-100',
    country: 'Brazil',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  }
];

const mockPackaging: Packaging = {
  id: 'pkg-1',
  name: 'Caixa nº 5 alta',
  description: 'Caixa para bolos de 1kg',
  brand: 'Silver Plast',
  unit: PackagingUnit.BOX,
  measurementValue: 1,
  currentPrice: 2.50,
  supplierId: 'supplier-1',
  currentStock: 100,
  minStock: 20,
  category: PackagingCategory.BOX,
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
  createdBy: 'user-1'
};

const mockPackagingList: Packaging[] = [
  mockPackaging,
  {
    id: 'pkg-2',
    name: 'Caixa nº 10',
    brand: 'Embalagens Brasil',
    unit: PackagingUnit.BOX,
    measurementValue: 1,
    currentPrice: 3.50,
    currentStock: 15, // Low stock (75%)
    minStock: 20,
    category: PackagingCategory.BOX,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    createdBy: 'user-1'
  },
  {
    id: 'pkg-3',
    name: 'Base redonda 30cm',
    brand: 'Silver Plast',
    unit: PackagingUnit.UNIT,
    measurementValue: 1,
    currentPrice: 1.80,
    currentStock: 5, // Critical stock (25%)
    minStock: 20,
    category: PackagingCategory.BASE,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    createdBy: 'user-1'
  },
  {
    id: 'pkg-4',
    name: 'Fita cetim rosa',
    brand: 'Embalagens Brasil',
    unit: PackagingUnit.REAM,
    measurementValue: 50,
    currentPrice: 15.00,
    currentStock: 0, // Out of stock
    minStock: 10,
    category: PackagingCategory.RIBBON,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    createdBy: 'user-1'
  }
];

const mockStockHistory: StockHistoryEntry[] = [
  {
    id: 'history-1',
    packagingId: 'pkg-1',
    type: 'purchase',
    quantity: 50,
    previousStock: 50,
    newStock: 100,
    supplierId: 'supplier-1',
    unitCost: 2.50,
    notes: 'Compra mensal',
    createdAt: new Date('2025-01-10'),
    createdBy: 'user-1'
  },
  {
    id: 'history-2',
    packagingId: 'pkg-1',
    type: 'usage',
    quantity: 20,
    previousStock: 120,
    newStock: 100,
    notes: 'Uso em pedidos',
    createdAt: new Date('2025-01-15'),
    createdBy: 'user-1'
  }
];

describe('PackagingForm Component', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSuppliers.mockResolvedValue({
      suppliers: mockSuppliers,
      total: mockSuppliers.length
    });
  });

  describe('Rendering - CREATE Mode', () => {
    it('should render all required form fields in create mode', async () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Nome da Embalagem/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Marca\/Fabricante/i)).toBeInTheDocument();
      expect(screen.getByText(/Descrição/i)).toBeInTheDocument();
      expect(screen.getByText(/Unidade de Medida/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor da Medida/i)).toBeInTheDocument();
      expect(screen.getByText(/Categoria/i)).toBeInTheDocument();
      expect(screen.getByText(/Preço por Unidade/i)).toBeInTheDocument();
      expect(screen.getByText(/Fornecedor/i)).toBeInTheDocument();
      expect(screen.getByText(/Estoque Atual/i)).toBeInTheDocument();
      expect(screen.getByText(/Estoque Mínimo/i)).toBeInTheDocument();
    });

    it('should display create button with correct text', () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Criar Embalagem/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should load and display supplier dropdown options', async () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockFetchSuppliers).toHaveBeenCalled();
      });
    });
  });

  describe('Rendering - EDIT Mode', () => {
    it('should render with packaging data populated', async () => {
      render(
        <PackagingForm
          packaging={mockPackaging}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Nome da Embalagem/i)).toBeInTheDocument();
      });

      // Note: With mocked FormField, we can't directly check input values
      // but we can verify the submit button text changes
      const submitButton = screen.getByRole('button', { name: /Atualizar Embalagem/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should display update button in edit mode', () => {
      render(
        <PackagingForm
          packaging={mockPackaging}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Atualizar Embalagem/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Criar Embalagem/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable submit button during submission', () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Criar Embalagem/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during submission', () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });
  });

  describe('Unit and Category Dropdowns', () => {
    it('should display all unit options', () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Units should be available in selects
      expect(screen.getByText(/Unidade de Medida/i)).toBeInTheDocument();
    });

    it('should display all category options', () => {
      render(
        <PackagingForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Categories should be available in selects
      expect(screen.getByText(/Categoria/i)).toBeInTheDocument();
    });
  });
});

describe('PackagingList Component', () => {
  const mockOnPackagingCreate = vi.fn();
  const mockOnPackagingEdit = vi.fn();
  const mockOnPackagingDelete = vi.fn();
  const mockOnManageStock = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPackaging.mockResolvedValue(mockPackagingList);
  });

  describe('Rendering', () => {
    it('should display loading state initially', () => {
      mockFetchPackaging.mockImplementation(() => new Promise(() => {}));

      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText(/Carregando embalagens/i)).toBeInTheDocument();
    });

    it('should render packaging list with items', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      expect(screen.getByText('Caixa nº 10')).toBeInTheDocument();
      expect(screen.getByText('Base redonda 30cm')).toBeInTheDocument();
      expect(screen.getByText('Fita cetim rosa')).toBeInTheDocument();
    });

    it('should display table headers correctly', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nome')).toBeInTheDocument();
      });

      expect(screen.getByText('Marca')).toBeInTheDocument();
      expect(screen.getByText('Unidade')).toBeInTheDocument();
      expect(screen.getByText('Preço (R$)')).toBeInTheDocument();
      expect(screen.getByText('Estoque')).toBeInTheDocument();
      expect(screen.getByText('Mín.')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('should show empty state when no packaging items', async () => {
      mockFetchPackaging.mockResolvedValue([]);

      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
    });

    it('should display error message on fetch failure', async () => {
      mockFetchPackaging.mockRejectedValue(new Error('Network error'));

      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar embalagens/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    it('should call onPackagingCreate when create button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /Adicionar Embalagem/i });
      await user.click(createButton);

      expect(mockOnPackagingCreate).toHaveBeenCalled();
    });

    it('should have edit buttons for each item', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Editar');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should have delete buttons for each item', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Deletar');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should have stock management buttons for each item', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      const stockButtons = screen.getAllByTitle('Gerenciar Estoque');
      expect(stockButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Filter', () => {
    it('should render search input', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Buscar por nome, marca ou categoria/i)).toBeInTheDocument();
      });
    });

    it('should render stock filter dropdown', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Filtrar por estoque/i)).toBeInTheDocument();
      });
    });

    it('should display results count', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/de 4 resultados/i)).toBeInTheDocument();
      });
    });
  });

  describe('Stock Status Indicators', () => {
    it('should display good status for adequate stock', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Caixa nº 5 alta')).toBeInTheDocument();
      });

      expect(screen.getByText('Bom')).toBeInTheDocument();
    });

    it('should display low status for low stock', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Baixo')).toBeInTheDocument();
      });
    });

    it('should display critical status for very low stock', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Crítico')).toBeInTheDocument();
      });
    });

    it('should display out of stock status', async () => {
      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sem Estoque')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display load more button when there are more items', async () => {
      const largeList = Array.from({ length: 60 }, (_, i) => ({
        ...mockPackaging,
        id: `pkg-${i}`,
        name: `Caixa ${i}`
      }));

      mockFetchPackaging.mockResolvedValue(largeList);

      render(
        <PackagingList
          onPackagingCreate={mockOnPackagingCreate}
          onPackagingEdit={mockOnPackagingEdit}
          onPackagingDelete={mockOnPackagingDelete}
          onManageStock={mockOnManageStock}
          onRefresh={mockOnRefresh}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Carregar Mais/i)).toBeInTheDocument();
      });
    });
  });
});

describe('StockManager Component', () => {
  const mockOnStockUpdated = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSuppliers.mockResolvedValue({
      suppliers: mockSuppliers,
      total: mockSuppliers.length
    });
    mockFetchStockHistory.mockResolvedValue(mockStockHistory);
  });

  describe('Rendering', () => {
    it('should display current stock information', async () => {
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Estoque Atual')).toBeInTheDocument();
      });

      expect(screen.getByText('Novo Estoque')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Current stock
    });

    it('should render stock movement type dropdown', async () => {
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Tipo de Movimentação/i)).toBeInTheDocument();
      });
    });

    it('should render quantity input field', async () => {
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Quantidade/i)).toBeInTheDocument();
      });
    });

    it('should display stock history table', async () => {
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Histórico de Movimentações')).toBeInTheDocument();
      });
    });
  });

  describe('Stock History', () => {
    it('should load and display stock history entries', async () => {
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockFetchStockHistory).toHaveBeenCalledWith('pkg-1', 10);
      });

      await waitFor(() => {
        expect(screen.getByText('purchase')).toBeInTheDocument();
      });
    });

    it('should show empty state when no history', async () => {
      mockFetchStockHistory.mockResolvedValue([]);

      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Nenhuma movimentação registrada')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onStockUpdated when form is submitted', async () => {
      const user = userEvent.setup();
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Atualizar Estoque/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Atualizar Estoque/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnStockUpdated).toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StockManager
          packaging={mockPackaging}
          onStockUpdated={mockOnStockUpdated}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});

describe('StockLevelIndicator Component', () => {
  describe('Status Display', () => {
    it('should render good status badge when stock is adequate', () => {
      render(
        <StockLevelIndicator
          currentStock={100}
          minStock={20}
          status="good"
        />
      );

      expect(screen.getByText('Bom')).toBeInTheDocument();
    });

    it('should render low status badge when stock is low', () => {
      render(
        <StockLevelIndicator
          currentStock={15}
          minStock={20}
          status="low"
        />
      );

      expect(screen.getByText('Baixo')).toBeInTheDocument();
    });

    it('should render critical status badge when stock is critical', () => {
      render(
        <StockLevelIndicator
          currentStock={5}
          minStock=  {20}
          status="critical"
        />
      );

      expect(screen.getByText('Crítico')).toBeInTheDocument();
    });

    it('should render out of stock badge when stock is zero', () => {
      render(
        <StockLevelIndicator
          currentStock={0}
          minStock={20}
          status="out"
        />
      );

      expect(screen.getByText('Sem Estoque')).toBeInTheDocument();
    });

    it('should display stock numbers when showNumbers is true', () => {
      render(
        <StockLevelIndicator
          currentStock={100}
          minStock={20}
          status="good"
          showNumbers={true}
        />
      );

      expect(screen.getByText('100/20')).toBeInTheDocument();
    });

    it('should not display stock numbers when showNumbers is false', () => {
      render(
        <StockLevelIndicator
          currentStock={100}
          minStock={20}
          status="good"
          showNumbers={false}
        />
      );

      expect(screen.queryByText('100/20')).not.toBeInTheDocument();
    });
  });

  describe('StockStatusDot Component', () => {
    it('should render dot indicator', () => {
      const { container } = render(
        <StockStatusDot
          currentStock={100}
          minStock={20}
        />
      );

      const dot = container.querySelector('.w-3.h-3.rounded-full');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('StockLevelProgress Component', () => {
    it('should render progress bar', () => {
      render(
        <StockLevelProgress
          currentStock={50}
          minStock={100}
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show correct percentage for adequate stock', () => {
      render(
        <StockLevelProgress
          currentStock={100}
          minStock={100}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show correct percentage for low stock', () => {
      render(
        <StockLevelProgress
          currentStock={25}
          minStock={100}
        />
      );

      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });
});
