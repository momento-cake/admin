# Development Guidelines

## Overview

This document outlines the development standards, architectural patterns, and best practices for the Momento Cake Admin project. These guidelines ensure consistency, maintainability, and scalability across the codebase.

## Architecture Principles

### Single Responsibility Principle
Each component, function, and module should have one clear responsibility:

```typescript
// ✅ Good - Single responsibility
const useIngredientValidation = () => {
  return {
    validateName: (name: string) => name.length >= 2,
    validatePrice: (price: number) => price >= 0,
    validateStock: (stock: number) => stock >= 0
  }
}

// ❌ Bad - Multiple responsibilities
const useIngredientManager = () => {
  // Handles validation, API calls, state management, UI logic
}
```

### Composition Over Inheritance
Prefer composition and hooks over class-based inheritance:

```typescript
// ✅ Good - Composition with hooks
const IngredientForm = () => {
  const validation = useFormValidation()
  const apiClient = useApiClient()
  const toast = useToast()
  
  // Component logic
}

// ❌ Avoid - Class inheritance
class IngredientForm extends BaseForm {
  // Complex inheritance hierarchy
}
```

### Separation of Concerns
Organize code into clear layers:

- **Presentation Layer**: React components and UI logic
- **Business Layer**: Custom hooks and business logic
- **Data Layer**: API services and data management
- **Utility Layer**: Pure functions and helpers

## Project Structure

### Directory Organization
```
src/
├── components/           # Shared/reusable components
│   ├── ui/              # Basic UI components (buttons, inputs)
│   ├── forms/           # Form-related components
│   └── layout/          # Layout components (header, sidebar)
├── features/            # Feature-based modules
│   ├── ingredients/     # Ingredient management feature
│   ├── recipes/         # Recipe management feature
│   ├── vendors/         # Vendor management feature
│   └── clients/         # Client management feature
├── hooks/               # Shared custom hooks
├── services/            # API and external services
├── utils/               # Pure utility functions
├── types/               # TypeScript type definitions
├── constants/           # Application constants
└── lib/                 # Configuration and setup
```

### Feature Module Structure
Each feature should follow this structure:

```
src/features/[feature]/
├── components/          # Feature-specific components
├── hooks/               # Feature-specific hooks
├── services/            # Feature-specific API services
├── types/               # Feature-specific types
├── utils/               # Feature-specific utilities
└── index.ts             # Feature exports
```

## Coding Standards

### TypeScript Usage
Full TypeScript implementation with strict type checking:

```typescript
// ✅ Good - Explicit types
interface CreateIngredientRequest {
  name: string
  price: number
  unit: IngredientUnit
  vendorId?: string
}

const createIngredient = async (data: CreateIngredientRequest): Promise<Ingredient> => {
  // Implementation
}

// ❌ Bad - Any types
const createIngredient = (data: any): any => {
  // Implementation
}
```

### Naming Conventions
- **PascalCase**: Components, interfaces, types, enums
- **camelCase**: Variables, functions, properties
- **SCREAMING_SNAKE_CASE**: Constants
- **kebab-case**: File names, CSS classes

```typescript
// Components
const IngredientForm = () => { }

// Interfaces
interface IngredientData { }

// Enums
enum IngredientUnit { }

// Functions and variables
const calculateTotalCost = (ingredients: Ingredient[]) => { }

// Constants
const API_BASE_URL = 'https://api.example.com'

// Files
ingredient-form.tsx
recipe-calculator.ts
```

### Function Guidelines

#### Pure Functions
Prefer pure functions for utilities:

```typescript
// ✅ Good - Pure function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

// ❌ Bad - Impure function
let currentLocale = 'pt-BR'
const formatCurrency = (amount: number): string => {
  // Depends on external state
  return new Intl.NumberFormat(currentLocale).format(amount)
}
```

#### Function Documentation
Document complex functions with JSDoc:

```typescript
/**
 * Calculates the total cost of a recipe including ingredients and labor
 * @param ingredients - List of recipe ingredients with quantities
 * @param laborHours - Number of labor hours required
 * @param laborRate - Hourly labor rate in BRL
 * @returns The total recipe cost in BRL
 */
const calculateRecipeCost = (
  ingredients: RecipeIngredient[],
  laborHours: number,
  laborRate: number
): number => {
  // Implementation
}
```

## React Best Practices

### Component Structure
Follow a consistent component structure:

```typescript
import React from 'react'
import { useIngredients } from '../hooks/useIngredients'
import { IngredientCard } from './IngredientCard'
import type { Ingredient } from '../types/ingredient.types'

// Props interface
interface IngredientsListProps {
  searchQuery?: string
  onIngredientSelect?: (ingredient: Ingredient) => void
}

// Component
export const IngredientsList: React.FC<IngredientsListProps> = ({
  searchQuery,
  onIngredientSelect
}) => {
  // Hooks
  const { ingredients, loading, error } = useIngredients({ search: searchQuery })
  
  // Early returns
  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error.message}</div>
  
  // Event handlers
  const handleIngredientClick = (ingredient: Ingredient) => {
    onIngredientSelect?.(ingredient)
  }
  
  // Render
  return (
    <div className="ingredients-list">
      {ingredients.map(ingredient => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          onClick={() => handleIngredientClick(ingredient)}
        />
      ))}
    </div>
  )
}
```

### Custom Hooks
Create custom hooks for reusable logic:

```typescript
// useIngredients hook
export const useIngredients = (filters?: IngredientFilters) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchIngredients = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await ingredientsApi.getAll(filters)
      setIngredients(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])
  
  useEffect(() => {
    fetchIngredients()
  }, [fetchIngredients])
  
  return {
    ingredients,
    loading,
    error,
    refetch: fetchIngredients
  }
}
```

### Error Handling
Implement comprehensive error handling:

```typescript
// Error boundary component
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Log to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}

// API error handling
const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    toast.error(error.message)
  } else if (error instanceof NetworkError) {
    toast.error('Erro de conexão. Tente novamente.')
  } else {
    toast.error('Erro inesperado. Tente novamente.')
    console.error('Unexpected error:', error)
  }
  
  throw error
}
```

## State Management

### Zustand Store Structure
Use Zustand for global state management:

```typescript
interface IngredientStore {
  // State
  ingredients: Ingredient[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchIngredients: () => Promise<void>
  createIngredient: (data: CreateIngredientData) => Promise<void>
  updateIngredient: (id: string, data: UpdateIngredientData) => Promise<void>
  deleteIngredient: (id: string) => Promise<void>
  
  // Utilities
  clearError: () => void
  reset: () => void
}

export const useIngredientStore = create<IngredientStore>((set, get) => ({
  // Initial state
  ingredients: [],
  loading: false,
  error: null,
  
  // Actions
  fetchIngredients: async () => {
    set({ loading: true, error: null })
    
    try {
      const ingredients = await ingredientsApi.getAll()
      set({ ingredients, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
  
  createIngredient: async (data) => {
    try {
      const newIngredient = await ingredientsApi.create(data)
      set(state => ({
        ingredients: [...state.ingredients, newIngredient]
      }))
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
  
  // Other actions...
  
  clearError: () => set({ error: null }),
  reset: () => set({ ingredients: [], loading: false, error: null })
}))
```

### Local Component State
Use local state for component-specific data:

```typescript
const IngredientForm = () => {
  // Form state
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    price: 0,
    unit: IngredientUnit.KILOGRAM
  })
  
  // Validation state
  const [errors, setErrors] = useState<IngredientFormErrors>({})
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form handlers
  const handleInputChange = (field: keyof IngredientFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }
  
  // Rest of component logic
}
```

## API Integration

### API Client Structure
Create a consistent API client:

```typescript
// Base API client
class ApiClient {
  private baseURL: string
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    if (options.body) {
      config.body = JSON.stringify(options.body)
    }
    
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText)
    }
    
    return response.json()
  }
  
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: data })
  }
  
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: data })
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Feature-specific API service
export const ingredientsApi = {
  async getAll(filters?: IngredientFilters): Promise<Ingredient[]> {
    const queryParams = new URLSearchParams()
    
    if (filters?.search) queryParams.set('search', filters.search)
    if (filters?.category) queryParams.set('category', filters.category)
    
    const query = queryParams.toString()
    const endpoint = `/ingredients${query ? `?${query}` : ''}`
    
    return apiClient.get<Ingredient[]>(endpoint)
  },
  
  async getById(id: string): Promise<Ingredient> {
    return apiClient.get<Ingredient>(`/ingredients/${id}`)
  },
  
  async create(data: CreateIngredientData): Promise<Ingredient> {
    return apiClient.post<Ingredient>('/ingredients', data)
  },
  
  async update(id: string, data: UpdateIngredientData): Promise<Ingredient> {
    return apiClient.put<Ingredient>(`/ingredients/${id}`, data)
  },
  
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/ingredients/${id}`)
  }
}
```

## Form Management

### React Hook Form Integration
Use React Hook Form for form management:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// Validation schema
const ingredientSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  price: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999, 'Preço muito alto'),
  unit: z.nativeEnum(IngredientUnit),
  category: z.nativeEnum(IngredientCategory)
})

type IngredientFormData = z.infer<typeof ingredientSchema>

// Form component
export const IngredientForm = ({ initialData, onSubmit }: Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: initialData
  })
  
  const onFormSubmit = async (data: IngredientFormData) => {
    try {
      await onSubmit(data)
      toast.success('Ingrediente salvo com sucesso!')
      reset()
    } catch (error) {
      toast.error('Erro ao salvar ingrediente')
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="form-input"
        />
        {errors.name && (
          <p className="form-error">{errors.name.message}</p>
        )}
      </div>
      
      {/* Other fields... */}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

## Testing Standards

### Unit Testing
Write unit tests for business logic:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateRecipeCost } from '../utils/recipe-calculations'

describe('calculateRecipeCost', () => {
  it('should calculate correct total cost with ingredients and labor', () => {
    const ingredients = [
      { id: '1', quantity: 1, unitPrice: 10 },
      { id: '2', quantity: 2, unitPrice: 5 }
    ]
    const laborHours = 2
    const laborRate = 25
    
    const result = calculateRecipeCost(ingredients, laborHours, laborRate)
    
    expect(result).toBe(70) // (1*10 + 2*5) + (2*25) = 20 + 50 = 70
  })
  
  it('should handle empty ingredients list', () => {
    const result = calculateRecipeCost([], 1, 25)
    expect(result).toBe(25) // Only labor cost
  })
  
  it('should handle zero labor cost', () => {
    const ingredients = [{ id: '1', quantity: 1, unitPrice: 10 }]
    const result = calculateRecipeCost(ingredients, 0, 25)
    expect(result).toBe(10) // Only ingredients cost
  })
})
```

### Component Testing
Test component behavior with React Testing Library:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IngredientForm } from './IngredientForm'

describe('IngredientForm', () => {
  it('should render all form fields', () => {
    render(<IngredientForm onSubmit={vi.fn()} />)
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/preço/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/unidade/i)).toBeInTheDocument()
  })
  
  it('should show validation errors for invalid input', async () => {
    const onSubmit = vi.fn()
    render(<IngredientForm onSubmit={onSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /salvar/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
    })
    
    expect(onSubmit).not.toHaveBeenCalled()
  })
  
  it('should call onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    render(<IngredientForm onSubmit={onSubmit} />)
    
    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: 'Açúcar' }
    })
    fireEvent.change(screen.getByLabelText(/preço/i), {
      target: { value: '10.50' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Açúcar',
        price: 10.5,
        unit: expect.any(String)
      })
    })
  })
})
```

## Performance Guidelines

### React Optimization
- Use `React.memo` for expensive components
- Optimize re-renders with `useMemo` and `useCallback`
- Implement virtual scrolling for large lists
- Lazy load components and routes

```typescript
// Memoized component
export const IngredientCard = React.memo<IngredientCardProps>(({
  ingredient,
  onClick
}) => {
  return (
    <div className="ingredient-card" onClick={() => onClick(ingredient)}>
      <h3>{ingredient.name}</h3>
      <p>{formatCurrency(ingredient.price)}</p>
    </div>
  )
})

// Optimized list component
export const IngredientsList = ({ ingredients, onIngredientClick }: Props) => {
  const handleClick = useCallback((ingredient: Ingredient) => {
    onIngredientClick(ingredient)
  }, [onIngredientClick])
  
  const expensiveCalculation = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.price, 0)
  }, [ingredients])
  
  return (
    <div>
      <p>Total: {formatCurrency(expensiveCalculation)}</p>
      {ingredients.map(ingredient => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          onClick={handleClick}
        />
      ))}
    </div>
  )
}
```

### Bundle Optimization
- Use dynamic imports for code splitting
- Optimize images and assets
- Tree shake unused dependencies
- Use production builds for deployment

```typescript
// Route-based code splitting
const IngredientsPage = lazy(() => import('./features/ingredients/IngredientsPage'))
const RecipesPage = lazy(() => import('./features/recipes/RecipesPage'))

// Component lazy loading
const ExpensiveChart = lazy(() => import('./components/ExpensiveChart'))

const Dashboard = () => {
  const [showChart, setShowChart] = useState(false)
  
  return (
    <div>
      <h1>Dashboard</h1>
      {showChart && (
        <Suspense fallback={<div>Carregando gráfico...</div>}>
          <ExpensiveChart />
        </Suspense>
      )}
    </div>
  )
}
```

## Brazilian Localization

### Date and Number Formatting
Use Brazilian formats consistently:

```typescript
// Date formatting
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

// Number formatting
export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('pt-BR').format(number)
}
```

### Document Validation
Implement Brazilian document validation:

```typescript
export const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  // CPF validation algorithm
  const weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  
  const digit1 = calculateDigit(cleaned.slice(0, 9), weights1)
  const digit2 = calculateDigit(cleaned.slice(0, 10), weights2)
  
  return cleaned[9] === digit1.toString() && cleaned[10] === digit2.toString()
}
```

## Code Quality Tools

### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off"
  }
}
```

### Prettier Configuration
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

These development guidelines ensure consistent, maintainable, and scalable code across the Momento Cake Admin project while supporting Brazilian business requirements and modern web development practices.