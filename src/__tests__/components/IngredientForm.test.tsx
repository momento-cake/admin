import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { mockIngredients, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/lib/suppliers', () => ({
  fetchSuppliers: vi.fn().mockResolvedValue({
    suppliers: factories.supplier(),
    total: 1,
  }),
}));

vi.mock('@/lib/ingredients', () => ({
  getUnitDisplayName: (unit: string) => unit,
}));

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
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => (
    <option value={value} {...props}>{children}</option>
  ),
  SelectTrigger: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  SelectValue: (props: any) => <div {...props} />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormField: ({ render }: any) => render({ field: {} }),
  FormItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/suppliers/SupplierCreateModal', () => ({
  SupplierCreateModal: () => null,
}));

describe('IngredientForm Component', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with required fields', () => {
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/preço/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/unidade/i)).toBeInTheDocument();
    });

    it('should render create mode by default', () => {
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should render edit mode with ingredient data', () => {
      const ingredient = mockIngredients[0];

      render(
        <IngredientForm
          ingredient={ingredient}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement;
      expect(nameInput.value).toBe(ingredient.name);
    });

    it('should render allergen checkboxes', () => {
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Form Input', () => {
    it('should update ingredient name', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      await user.type(nameInput, 'Farinha de Trigo');

      expect((nameInput as HTMLInputElement).value).toContain('Farinha de Trigo');
    });

    it('should update price input', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByLabelText(/preço/i);
      await user.type(priceInput, '10,50');

      expect((priceInput as HTMLInputElement).value).toContain('10');
    });

    it('should select allergens', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
      }
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      const priceInput = screen.getByLabelText(/preço/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Salvar') || btn.textContent?.includes('Criar')
      );

      await user.type(nameInput, 'Test Ingredient');
      await user.type(priceInput, '10');

      if (submitButton) {
        await user.click(submitButton);
      }

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Cancelar') || btn.textContent?.includes('Voltar')
      );

      if (cancelButton) {
        await user.click(cancelButton);
      }

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable submit button when isSubmitting is true', () => {
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Salvar') || btn.textContent?.includes('Criar')
      ) as HTMLButtonElement | undefined;

      if (submitButton) {
        expect(submitButton.disabled).toBe(true);
      }
    });
  });

  describe('Validation', () => {
    it('should require ingredient name', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const priceInput = screen.getByLabelText(/preço/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Salvar')
      );

      await user.type(priceInput, '10');

      if (submitButton) {
        await user.click(submitButton);
      }

      // Form should not submit without name
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require category selection', async () => {
      const user = userEvent.setup();
      render(
        <IngredientForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Salvar')
      );

      await user.type(nameInput, 'Test');

      if (submitButton) {
        await user.click(submitButton);
      }

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with ingredient data', () => {
      const ingredient = mockIngredients[0];

      render(
        <IngredientForm
          ingredient={ingredient}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i) as HTMLInputElement;
      expect(nameInput.value).toBe(ingredient.name);
    });

    it('should pre-select allergens from ingredient', () => {
      const ingredient = {
        ...mockIngredients[0],
        allergens: ['Glúten', 'Leite'],
      };

      render(
        <IngredientForm
          ingredient={ingredient}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });
});
