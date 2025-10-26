# Client CRUD - Web Implementation Specification

**Document Type**: Platform-Specific Implementation Plan
**Platform**: Web Admin Dashboard (React/Next.js)
**Master Plan Reference**: `context/specs/0_master/client-crud.md`
**Status**: Planning Phase

---

## 1. Web Technology Stack

### 1.1 Framework & Libraries
- **Framework**: Next.js 15.5.2 (App Router)
- **UI Framework**: React 19
- **Form Management**: react-hook-form 7.62.0
- **Validation**: Zod 4.1.5 (with zodResolver)
- **UI Components**: Shadcn/ui + Radix UI primitives
- **Styling**: TailwindCSS 4
- **Icons**: lucide-react
- **HTTP Client**: Fetch API (built-in)
- **State Management**: React Context (for global state)
- **Testing**: Vitest + React Testing Library + Playwright

### 1.2 Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── clients/
│   │       ├── page.tsx                 # List page
│   │       ├── new/
│   │       │   └── page.tsx             # Create page
│   │       └── [id]/
│   │           ├── page.tsx             # Detail page
│   │           └── edit/
│   │               └── page.tsx         # Edit page
│   └── api/
│       └── clients/
│           ├── route.ts                 # GET list, POST create
│           ├── [id]/
│           │   └── route.ts             # GET, PUT, DELETE
│           └── [id]/
│               └── restore.ts           # POST restore
│
├── components/
│   ├── clients/
│   │   ├── ClientForm.tsx               # Main form (create/edit)
│   │   ├── PersonalClientFields.tsx     # Conditional fields
│   │   ├── BusinessClientFields.tsx     # Conditional fields
│   │   ├── ContactMethodsSection.tsx    # Dynamic contact methods
│   │   ├── RelatedPersonsSection.tsx    # Dynamic related persons
│   │   ├── SpecialDatesSection.tsx      # Dynamic special dates
│   │   ├── AddressFields.tsx            # Reusable address inputs
│   │   ├── PreferencesSection.tsx       # Notes, tags, preferences
│   │   ├── ClientsList.tsx              # List/table view
│   │   ├── ClientCard.tsx or ClientRow.tsx
│   │   ├── ClientDetailModal.tsx        # Read-only detail view
│   │   ├── DeleteConfirmation.tsx       # Delete confirmation
│   │   ├── ContactMethodBadge.tsx       # Visual display
│   │   ├── RelationshipBadge.tsx        # Visual display
│   │   └── SpecialDateCard.tsx          # Special date display
│   ├── layout/
│   │   └── Sidebar.tsx                  # (Update navigation)
│   └── ui/
│       ├── form.tsx                     # Form wrapper components
│       ├── input.tsx
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── alert.tsx
│       └── ... (other Shadcn components)
│
├── lib/
│   ├── clients.ts                       # Firestore CRUD operations
│   ├── validators/
│   │   └── client.ts                    # Zod validation schemas
│   └── firebase.ts                      # (Already exists)
│
├── types/
│   └── client.ts                        # Client interfaces
│
├── hooks/
│   ├── useClients.ts                    # Custom hook for client operations
│   ├── useDebounce.ts                   # (Already exists)
│   └── useFetch.ts                      # Generic fetch hook
│
└── __tests__/
    ├── unit/
    │   ├── lib/
    │   │   └── clients.test.ts          # CRUD operation tests
    │   └── lib/validators/
    │       └── client.test.ts           # Validation schema tests
    ├── component/
    │   └── clients/
    │       ├── ClientForm.test.tsx
    │       ├── ContactMethodsSection.test.tsx
    │       └── RelatedPersonsSection.test.tsx
    └── e2e/
        └── clients.spec.ts              # Playwright E2E tests
```

---

## 2. Component Specifications

### 2.1 Page Components

#### `/clients` - List Page

```typescript
// app/(dashboard)/clients/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { ClientsList } from '@/components/clients/ClientsList';
import { useDebounce } from '@/hooks/useDebounce';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientType, setClientType] = useState<'all' | 'person' | 'business'>('all');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load clients when search or filter changes
  useEffect(() => {
    loadClients();
  }, [debouncedSearchQuery, clientType]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('searchQuery', debouncedSearchQuery);
      if (clientType !== 'all') params.append('type', clientType);

      const response = await fetch(`/api/clients?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load clients');
        setClients([]);
        return;
      }

      setClients(data.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading clients');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerenciamento de clientes e contatos</p>
        </div>
        <Button onClick={() => router.push('/clients/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-col sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone, CPF/CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        <select
          value={clientType}
          onChange={(e) => setClientType(e.target.value as any)}
          className="px-4 py-2 border rounded-md bg-white"
        >
          <option value="all">Todos os tipos</option>
          <option value="person">Pessoa Física</option>
          <option value="business">Pessoa Jurídica</option>
        </select>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum cliente encontrado</p>
          <Button onClick={() => router.push('/clients/new')}>
            Criar primeiro cliente
          </Button>
        </div>
      ) : (
        <ClientsList
          clients={clients}
          onRefresh={loadClients}
          onDeleted={(id) => setClients(clients.filter(c => c.id !== id))}
        />
      )}
    </div>
  );
}
```

#### `/clients/new` - Create Page

```typescript
// app/(dashboard)/clients/new/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientForm } from '@/components/clients/ClientForm';
import { Client, CreateClientData } from '@/types/client';

export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateClientData) => {
    try {
      setError(null);
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to create client');
        return;
      }

      // Success - redirect to client detail
      router.push(`/clients/${result.client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating client');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Novo Cliente</h1>
        <p className="text-muted-foreground">Criar um novo registro de cliente</p>
      </div>

      {error && (
        <Alert variant="destructive">{error}</Alert>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <ClientForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
```

#### `/clients/[id]` - Detail Page

```typescript
// app/(dashboard)/clients/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Client } from '@/types/client';
import { ClientDetailModal } from '@/components/clients/ClientDetailModal';
import { DeleteConfirmation } from '@/components/clients/DeleteConfirmation';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const clientId = params.id as string;

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (!data.success) {
        setError('Cliente não encontrado');
        return;
      }

      setClient(data.client);
    } catch (err) {
      setError('Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      router.push('/clients');
    } catch (err) {
      setError('Erro ao deletar cliente');
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error || !client) return <div>{error || 'Cliente não encontrado'}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              {client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/clients/${clientId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Deletar
          </Button>
        </div>
      </div>

      {/* Detail View */}
      <div className="bg-white rounded-lg shadow">
        <ClientDetailModal client={client} readOnly />
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmation
          clientName={client.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
```

#### `/clients/[id]/edit` - Edit Page

```typescript
// app/(dashboard)/clients/[id]/edit/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ClientForm } from '@/components/clients/ClientForm';
import { Client, UpdateClientData } from '@/types/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clientId = params.id as string;

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (!data.success) {
        setError('Cliente não encontrado');
        return;
      }

      setClient(data.client);
    } catch (err) {
      setError('Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateClientData) => {
    try {
      setSubmitError(null);
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!result.success) {
        setSubmitError(result.error || 'Failed to update client');
        return;
      }

      // Success - redirect to detail
      router.push(`/clients/${clientId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error updating client');
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error || !client) return <div>{error || 'Cliente não encontrado'}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Cliente</h1>
        <p className="text-muted-foreground">{client.name}</p>
      </div>

      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <ClientForm initialData={client} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
```

### 2.2 Form Components

#### ClientForm.tsx - Main Form

**This is the core component handling both create and edit modes**

```typescript
// components/clients/ClientForm.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientSchema } from '@/lib/validators/client';
import { Client, CreateClientData } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { PersonalClientFields } from './PersonalClientFields';
import { BusinessClientFields } from './BusinessClientFields';
import { ContactMethodsSection } from './ContactMethodsSection';
import { RelatedPersonsSection } from './RelatedPersonsSection';
import { SpecialDatesSection } from './SpecialDatesSection';
import { PreferencesSection } from './PreferencesSection';

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: CreateClientData) => Promise<void>;
  submitLabel?: string;
}

export function ClientForm({
  initialData,
  onSubmit,
  submitLabel = 'Salvar'
}: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateClientData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      type: initialData?.type || 'person',
      name: initialData?.name || '',
      email: initialData?.email || '',
      cpfCnpj: initialData?.cpfCnpj || '',
      phone: initialData?.phone || '',
      address: initialData?.address,
      contactMethods: initialData?.contactMethods || [],
      relatedPersons: initialData?.relatedPersons || [],
      specialDates: initialData?.specialDates || [],
      notes: initialData?.notes || '',
      tags: initialData?.tags || [],
      preferences: initialData?.preferences
    }
  });

  const clientType = form.watch('type');

  const handleFormSubmit = async (data: CreateClientData) => {
    try {
      setSubmitError(null);
      setLoading(true);
      await onSubmit(data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error submitting form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: Client Type & Basic Info */}
      <div className="space-y-4 pb-6 border-b">
        <h2 className="text-xl font-semibold">Informações Básicas</h2>

        {/* Type Toggle */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="person"
              {...form.register('type')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Pessoa Física</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="business"
              {...form.register('type')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Pessoa Jurídica</span>
          </label>
        </div>

        {/* Conditional Fields */}
        {clientType === 'person' && (
          <PersonalClientFields form={form} />
        )}
        {clientType === 'business' && (
          <BusinessClientFields form={form} />
        )}
      </div>

      {/* Section 2: Contact Methods */}
      <ContactMethodsSection form={form} />

      {/* Section 3: Related Persons */}
      <RelatedPersonsSection form={form} />

      {/* Section 4: Special Dates */}
      <SpecialDatesSection form={form} />

      {/* Section 5: Notes & Preferences */}
      <PreferencesSection form={form} />

      {/* Submit Button */}
      <div className="flex gap-4 pt-6 border-t">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Salvando...' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

#### PersonalClientFields.tsx

```typescript
// components/clients/PersonalClientFields.tsx

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddressFields } from './AddressFields';
import { UseFormReturn } from 'react-hook-form';
import { CreateClientData } from '@/types/client';

interface PersonalClientFieldsProps {
  form: UseFormReturn<CreateClientData>;
}

export function PersonalClientFields({ form }: PersonalClientFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome Completo</FormLabel>
            <FormControl>
              <Input {...field} placeholder="João Silva" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Email */}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email (Opcional)</FormLabel>
            <FormControl>
              <Input {...field} type="email" placeholder="joao@example.com" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Phone */}
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone (Opcional)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="(11) 99999-9999" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* CPF */}
      <FormField
        control={form.control}
        name="cpfCnpj"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CPF (Opcional)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="123.456.789-00" />
            </FormControl>
            <FormDescription>
              Útil para identificação e deduplicação
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Address */}
      <AddressFields form={form} />
    </div>
  );
}
```

#### BusinessClientFields.tsx

```typescript
// components/clients/BusinessClientFields.tsx

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddressFields } from './AddressFields';
import { UseFormReturn } from 'react-hook-form';
import { CreateClientData } from '@/types/client';

interface BusinessClientFieldsProps {
  form: UseFormReturn<CreateClientData>;
}

export function BusinessClientFields({ form }: BusinessClientFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-semibold text-sm">Informações da Empresa</h3>

        {/* Company Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razão Social</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Sua Empresa LTDA" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CNPJ */}
        <FormField
          control={form.control}
          name="cpfCnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input {...field} placeholder="12.345.678/0001-90" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Type */}
        <FormField
          control={form.control}
          name="businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Negócio (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Varejo, Distribuidor, Restaurante..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone da Empresa</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(11) 3333-3333" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email da Empresa (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="contato@empresa.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Representative Information */}
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-sm">Representante de Vendas</h3>

        {/* Rep Name */}
        <FormField
          control={form.control}
          name="representative.name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Maria Silva" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rep Email */}
        <FormField
          control={form.control}
          name="representative.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="maria@empresa.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rep Phone */}
        <FormField
          control={form.control}
          name="representative.phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(11) 99999-9999" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rep Role */}
        <FormField
          control={form.control}
          name="representative.role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Gerente, Diretora..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Company Address */}
      <div>
        <h3 className="font-semibold text-sm mb-4">Endereço da Empresa</h3>
        <AddressFields form={form} />
      </div>
    </div>
  );
}
```

#### ContactMethodsSection.tsx - Dynamic List

```typescript
// components/clients/ContactMethodsSection.tsx

'use client';

import { useState } from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { ContactMethodBadge } from './ContactMethodBadge';
import { CreateClientData, ContactMethodType } from '@/types/client';

interface ContactMethodsSectionProps {
  form: UseFormReturn<CreateClientData>;
}

const CONTACT_TYPES: { value: ContactMethodType; label: string }[] = [
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Outro' }
];

export function ContactMethodsSection({ form }: ContactMethodsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contactMethods'
  });

  const [newMethod, setNewMethod] = useState<{ type: ContactMethodType; value: string; isPrimary: boolean }>({
    type: 'phone',
    value: '',
    isPrimary: fields.length === 0
  });

  const handleAddMethod = () => {
    if (!newMethod.value.trim()) return;

    append({
      type: newMethod.type,
      value: newMethod.value,
      isPrimary: newMethod.isPrimary || fields.length === 0,
      notes: ''
    });

    setNewMethod({ type: 'phone', value: '', isPrimary: false });
  };

  const handlePrimaryChange = (index: number) => {
    // Remove primary flag from others of same type
    const currentType = fields[index].type;
    fields.forEach((field, i) => {
      if (field.type === currentType && i !== index) {
        form.setValue(`contactMethods.${i}.isPrimary`, false);
      }
    });
    form.setValue(`contactMethods.${index}.isPrimary`, true);
  };

  return (
    <div className="space-y-4 pb-6 border-b">
      <h2 className="text-xl font-semibold">Meios de Contato</h2>
      <p className="text-sm text-muted-foreground">Mínimo de 1 meio de contato obrigatório</p>

      {/* Existing Contact Methods */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <ContactMethodBadge type={field.type} />
                <span className="font-medium">{field.value}</span>
                {field.isPrimary && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Principal
                  </span>
                )}
              </div>

              {field.notes && (
                <p className="text-sm text-muted-foreground">{field.notes}</p>
              )}
            </div>

            <div className="flex gap-2">
              <label className="text-xs flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.isPrimary}
                  onChange={() => handlePrimaryChange(index)}
                  className="w-3 h-3"
                />
                Principal
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Contact Method */}
      <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold">Adicionar Meio de Contato</h3>

        <select
          value={newMethod.type}
          onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value as ContactMethodType })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        >
          {CONTACT_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <Input
          type="text"
          placeholder={
            newMethod.type === 'email' ? 'email@example.com' :
            newMethod.type === 'phone' || newMethod.type === 'whatsapp' ? '(11) 99999-9999' :
            newMethod.type === 'instagram' ? '@username' :
            newMethod.type === 'facebook' ? 'facebook.com/...' :
            'Valor do contato'
          }
          value={newMethod.value}
          onChange={(e) => setNewMethod({ ...newMethod, value: e.target.value })}
        />

        <Button
          type="button"
          onClick={handleAddMethod}
          disabled={!newMethod.value.trim()}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Validation Error */}
      {fields.length === 0 && (
        <p className="text-sm text-red-600">Pelo menos 1 meio de contato é obrigatório</p>
      )}
    </div>
  );
}
```

#### RelatedPersonsSection.tsx - Similar Pattern

```typescript
// components/clients/RelatedPersonsSection.tsx

'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { CreateClientData } from '@/types/client';
import { RelationshipBadge } from './RelationshipBadge';

interface RelatedPersonsSectionProps {
  form: UseFormReturn<CreateClientData>;
}

const RELATIONSHIPS = [
  { value: 'child', label: 'Filho(a)' },
  { value: 'parent', label: 'Pai/Mãe' },
  { value: 'sibling', label: 'Irmão(ã)' },
  { value: 'friend', label: 'Amigo(a)' },
  { value: 'spouse', label: 'Cônjuge' },
  { value: 'other', label: 'Outro' }
];

export function RelatedPersonsSection({ form }: RelatedPersonsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'relatedPersons'
  });

  // Similar implementation to ContactMethodsSection
  // Shows list of related persons with relationship badge
  // Ability to add/remove related persons

  return (
    <div className="space-y-4 pb-6 border-b">
      <h2 className="text-xl font-semibold">Pessoas Relacionadas</h2>
      <p className="text-sm text-muted-foreground">Familiares, amigos, e outros contatos importantes (Opcional)</p>

      {/* Display existing related persons */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <RelationshipBadge type={field.relationship} />
                <span className="font-medium">{field.name}</span>
              </div>
              {field.birthDate && (
                <p className="text-sm text-muted-foreground">
                  Aniversário: {new Date(field.birthDate).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new related person form */}
      {/* Similar to ContactMethodsSection with more fields */}
    </div>
  );
}
```

#### SpecialDatesSection.tsx

```typescript
// components/clients/SpecialDatesSection.tsx

'use client';

import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { CreateClientData } from '@/types/client';
import { SpecialDateCard } from './SpecialDateCard';

interface SpecialDatesSectionProps {
  form: UseFormReturn<CreateClientData>;
}

const DATE_TYPES = [
  { value: 'birthday', label: 'Aniversário' },
  { value: 'anniversary', label: 'Aniversário (Casal)' },
  { value: 'custom', label: 'Data Customizada' }
];

export function SpecialDatesSection({ form }: SpecialDatesSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'specialDates'
  });

  // Display special dates with card view
  // Ability to add/remove dates
  // Use for upselling opportunities

  return (
    <div className="space-y-4 pb-6 border-b">
      <h2 className="text-xl font-semibold">Datas Especiais</h2>
      <p className="text-sm text-muted-foreground">Aniversários, datas comemorativas para campanhas de upselling (Opcional)</p>

      {/* Display existing special dates */}
      <div className="grid gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="relative">
            <SpecialDateCard date={field} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="absolute top-2 right-2 text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new special date form */}
      {/* Form with date picker, type select, description */}
    </div>
  );
}
```

---

## 3. List & Detail Components

### 3.1 ClientsList.tsx

```typescript
// components/clients/ClientsList.tsx

import { Client } from '@/types/client';
import { ClientCard } from './ClientCard';

interface ClientsListProps {
  clients: Client[];
  onRefresh: () => Promise<void>;
  onDeleted: (id: string) => void;
}

export function ClientsList({ clients, onRefresh, onDeleted }: ClientsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map(client => (
        <ClientCard
          key={client.id}
          client={client}
          onDeleted={onDeleted}
          onUpdated={onRefresh}
        />
      ))}
    </div>
  );
}
```

### 3.2 ClientCard.tsx

```typescript
// components/clients/ClientCard.tsx

import { Client } from '@/types/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClientCardProps {
  client: Client;
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

export function ClientCard({ client, onDeleted, onUpdated }: ClientCardProps) {
  const router = useRouter();
  const primaryContact = client.contactMethods?.find(c => c.isPrimary);

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{client.name}</h3>
        <p className="text-sm text-muted-foreground">
          {client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
        </p>
      </div>

      {primaryContact && (
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">{primaryContact.type.toUpperCase()}</p>
          <p className="font-medium">{primaryContact.value}</p>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/clients/${client.id}`)}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-1" />
          Ver
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/clients/${client.id}/edit`)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            if (confirm('Deletar cliente?')) {
              await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
              onDeleted(client.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
```

---

## 4. Validation & Error Handling

### 4.1 Zod Schemas

**File: `src/lib/validators/client.ts`**

Follow the pattern from the Master Plan document. Include:

- Base schema with common fields
- Personal client schema (extends base)
- Business client schema (extends base with additional fields)
- Contact method schema (nested validation)
- Related person schema (nested validation)
- Special date schema (nested validation)
- Export TypeScript types from schemas using `z.infer<typeof schema>`

### 4.2 API Error Responses

**Pattern for error responses:**

```typescript
{
  success: false;
  error: "Human-readable error message";
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 4.3 Form Error Display

- Field-level errors below each form input
- Use FormMessage component from shadcn/ui
- Page-level alert for submission errors
- Clear error messages in Portuguese

---

## 5. Navigation Integration

### 5.1 Update Sidebar.tsx

Add menu item for Clients:

```typescript
// In Sidebar component configuration

const menuItems = [
  // ... existing items
  {
    label: 'Clientes',
    href: '/clients',
    icon: Users,
    submenu: [
      { label: 'Listar', href: '/clients' },
      { label: 'Novo', href: '/clients/new' }
    ]
  }
];
```

### 5.2 Breadcrumbs

Implement breadcrumb navigation:
- /clients → "Dashboard / Clientes"
- /clients/new → "Dashboard / Clientes / Novo"
- /clients/[id] → "Dashboard / Clientes / [Nome do Cliente]"
- /clients/[id]/edit → "Dashboard / Clientes / [Nome do Cliente] / Editar"

---

## 6. API Routes Implementation

### 6.1 `/api/clients/route.ts` - List & Create

- GET: Fetch clients with filters and search
- POST: Create new client with validation

### 6.2 `/api/clients/[id]/route.ts` - Detail, Update, Delete

- GET: Fetch single client
- PUT: Update client
- DELETE: Soft delete client

### 6.3 `/api/clients/[id]/restore.ts` - Restore

- POST: Restore soft-deleted client

---

## 7. Testing Strategy

### 7.1 Component Tests

Test files in `src/__tests__/component/clients/`:

- `ClientForm.test.tsx` - Form rendering and submission
- `ContactMethodsSection.test.tsx` - Dynamic add/remove
- `RelatedPersonsSection.test.tsx` - Dynamic list management
- `ClientsList.test.tsx` - List rendering

### 7.2 API Route Tests

Test files in `src/__tests__/integration/`:

- Test GET /api/clients (list and search)
- Test POST /api/clients (create)
- Test GET /api/clients/:id (detail)
- Test PUT /api/clients/:id (update)
- Test DELETE /api/clients/:id (soft delete)
- Test POST /api/clients/:id/restore (restore)

### 7.3 E2E Tests

File: `tests/clients.spec.ts`

- Create personal client
- Create business client
- Search and filter clients
- Edit client information
- Delete and restore client

---

## 8. Performance Optimization

### 8.1 Lazy Loading

- Lazy load related persons and special dates on expand
- Pagination for large client lists (20 items per page)
- Debounce search input (300ms)

### 8.2 Caching

- Cache client list in React Query or SWR (future enhancement)
- Invalidate cache on create/update/delete

### 8.3 Bundle Size

- Code-split client pages
- Lazy load form components
- Tree-shake unused UI components

---

## 9. Browser Support & Accessibility

### 9.1 Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Mobile: iOS Safari, Chrome Mobile

### 9.2 Accessibility

- Form labels properly associated with inputs
- Error messages linked to form fields
- ARIA labels for buttons without text
- Keyboard navigation support
- Color contrast >4.5:1 for text
- Touch targets minimum 48px

---

## 10. Implementation Timeline

**Estimated: 9-12 days**

- Days 1-2: Types, validation schemas, CRUD operations
- Days 3-4: API routes
- Days 5-7: Form components and list view
- Days 8-9: Navigation, detail pages
- Days 10-12: Testing, refinement, documentation

---

**Web Implementation Plan Complete**

This specification provides detailed guidance for implementing the Client CRUD feature on the web platform following all existing patterns and best practices in the Momento Cake Admin codebase.
