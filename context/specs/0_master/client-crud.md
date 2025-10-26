# Client CRUD Feature - Master Implementation Plan

**Feature Title**: Comprehensive Client Management System (CRUD)
**Created**: 2025-10-25
**Priority**: High
**Platforms Affected**: Web Admin Dashboard, Sales Platform Integration
**Status**: Planning Phase

---

## 1. Executive Summary

Implement a comprehensive Client Management System (CRUD) for the Momento Cake Admin dashboard that enables staff to manage customer relationships with full support for:
- **Personal clients** (regular individuals) - majority use case
- **Business clients** (companies) - minority use case with additional fields
- **Multiple contact methods** per client (phone, email, WhatsApp, Instagram, etc.)
- **Related persons** tracking (children, parents, siblings, friends, spouses)
- **Special dates** registration (birthdays, anniversaries, custom dates) for upselling opportunities

## 2. Requirements Analysis

### 2.1 Clarified Requirements
- **Scope**: Web admin dashboard + Sales platform integration (standalone, no order integration yet)
- **Users**: Admin staff managing client database
- **Priority**: High - needed soon
- **Special Dates**: Store for reference only (no automation at this stage)

### 2.2 Business Goals
1. **Customer Relationship Management (CRM)**: Track comprehensive customer information
2. **Sales & Upselling**: Identify special dates for targeted marketing campaigns
3. **Customer Segmentation**: Distinguish between personal and business clients with appropriate data capture
4. **Data Organization**: Centralized client information for better service delivery

### 2.3 Client Types & Data Model

#### Personal Clients (Most Common)
- Basic information: Name, email, phone(s), CPF
- Contact methods: Multiple (phone, email, WhatsApp, Instagram, Facebook, etc.)
- Related persons: Family members, friends, significant relationships
- Special dates: Birthdays, anniversaries
- Preferences: Notes, preferences for communication

#### Business Clients (Less Common)
- Company information: Company name, CNPJ, company address
- Business contact: Designated representative person (name, email, phone)
- Business type: Industry/category
- Related persons: Multiple business contacts, decision makers
- Special dates: Company founding dates, corporate events
- Trade preferences: Business-specific notes

### 2.4 Key Features

#### Feature 1: Client List & Search
- Display all active clients in table/card view
- Search by name, email, phone, CPF/CNPJ
- Filter by client type (personal/business)
- Sort by creation date, name, last contact
- Pagination support
- Quick actions: View, Edit, Delete

#### Feature 2: Client Creation
- Form-based creation for personal clients
- Form-based creation for business clients
- Field-level validation (real-time + submission)
- Support for multiple contact methods upfront
- Ability to add related persons during creation
- Ability to add special dates during creation

#### Feature 3: Client Detail View
- Read-only display of all client information
- Organized sections: Basic Info, Contact Methods, Related Persons, Special Dates
- Action buttons: Edit, Delete, Print (future)

#### Feature 4: Client Editing
- Full edit capability for all client fields
- Preserve client ID and timestamps
- Add/remove contact methods dynamically
- Add/remove related persons dynamically
- Add/remove special dates dynamically
- Validation on save

#### Feature 5: Contact Methods Management
- Add multiple contact methods (phone, email, WhatsApp, Instagram, Facebook, LinkedIn, other)
- Each contact method has: Type, Value, Is Primary flag, Notes
- Minimum 1 contact method required
- Validation per contact method type

#### Feature 6: Related Persons Management
- Add multiple related persons (child, parent, sibling, friend, spouse, other)
- Fields: Name, Relationship Type, Contact Info, Birth Date (optional), Notes
- Useful for marketing campaigns (birthday reminders for related persons)
- Optional - no requirement for related persons on creation

#### Feature 7: Special Dates Management
- Add multiple special dates (birthday, anniversary, custom)
- Fields: Date, Type, Description, Related Person (optional), Notes
- Enable date-based filtering and notifications (future phase)
- Useful for: Birthday cakes, anniversary gifts, custom occasion marketing

#### Feature 8: Soft Delete
- Clients marked as inactive (isActive = false) instead of permanent deletion
- Soft deleted clients not shown in lists by default
- Ability to view/restore soft-deleted clients (admin feature)

---

## 3. Data Model & Database Design

### 3.1 Firestore Collections

#### Collection: `clients`

**Document Structure:**

```typescript
interface Client {
  // Core Identity
  id: string;                           // Firestore document ID
  type: 'person' | 'business';          // Client type discriminator

  // Personal Information (Both types)
  name: string;                         // Full name (person) or Company name (business)
  email?: string;                       // Primary email
  cpfCnpj?: string;                     // CPF for persons, CNPJ for business
  phone?: string;                       // Primary phone (deprecated - use contactMethods)

  // Contact Methods (New - Replaces individual phone/email fields)
  contactMethods: ContactMethod[];      // Array of contact methods

  // Address Information (Both types)
  address?: {
    cep?: string;
    estado?: string;
    cidade?: string;
    bairro?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
  };

  // Business-Specific Fields
  ...(type === 'business' && {
    companyInfo?: {
      cnpj: string;
      companyName: string;
      businessType?: string;            // Industry/category
      inscricaoEstadual?: string;       // Tax registration
      companyPhone?: string;
      companyEmail?: string;
    };
    representative?: {
      name: string;
      email: string;
      phone: string;
      role?: string;                    // Job title/role
      cpf?: string;
    };
  })

  // Related Persons
  relatedPersons: RelatedPerson[];      // Array of related persons

  // Special Dates
  specialDates: SpecialDate[];          // Array of important dates

  // Additional Information
  notes?: string;                       // Internal notes
  tags?: string[];                      // Categorization tags
  preferences?: {
    preferredContact?: 'phone' | 'email' | 'whatsapp' | 'other';
    marketingConsent?: boolean;
    communicationPreference?: string;
  };

  // System Fields
  isActive: boolean;                    // Soft delete flag
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;                   // User email or UID
  lastModifiedBy?: string;
}
```

#### Sub-Collection: `clients/{clientId}/contactMethods`

```typescript
interface ContactMethod {
  id: string;
  type: 'phone' | 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'linkedin' | 'other';
  value: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: Timestamp;
}

// Alternative: Embed in main document as array
interface ContactMethodEmbedded {
  id: string;
  type: 'phone' | 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'linkedin' | 'other';
  value: string;
  isPrimary: boolean;
  notes?: string;
}
```

#### Sub-Collection: `clients/{clientId}/relatedPersons`

```typescript
interface RelatedPerson {
  id: string;
  name: string;
  relationship: 'child' | 'parent' | 'sibling' | 'friend' | 'spouse' | 'other';
  email?: string;
  phone?: string;
  birthDate?: Date;                    // Useful for birthday campaigns
  notes?: string;
  createdAt: Timestamp;
}

// Alternative: Embed in main document as array
interface RelatedPersonEmbedded {
  id: string;
  name: string;
  relationship: 'child' | 'parent' | 'sibling' | 'friend' | 'spouse' | 'other';
  email?: string;
  phone?: string;
  birthDate?: string;                  // ISO format date
  notes?: string;
}
```

#### Sub-Collection: `clients/{clientId}/specialDates`

```typescript
interface SpecialDate {
  id: string;
  date: Date;                          // The date (day and month important for recurring)
  type: 'birthday' | 'anniversary' | 'custom';
  description: string;                 // e.g., "Maria's 10th Birthday"
  relatedPersonId?: string;            // Reference to related person if applicable
  notes?: string;
  createdAt: Timestamp;
}

// Alternative: Embed in main document as array
interface SpecialDateEmbedded {
  id: string;
  month: number;                       // 1-12
  day: number;                         // 1-31
  type: 'birthday' | 'anniversary' | 'custom';
  description: string;
  relatedPersonId?: string;
  notes?: string;
}
```

### 3.2 Data Model Decision: Embedded vs Sub-Collections

**Recommendation: Embed arrays in main document**

**Rationale:**
- Contact methods, related persons, and special dates are closely tied to each client
- Maximum expected items per array is relatively small (< 100)
- Queries typically need all data together (form editing)
- Easier transaction handling for updates
- Reduces database read count
- Follows pattern used in existing features (ingredients with stock history references)

**Implementation:**
- Store contact methods, related persons, and special dates as arrays embedded in the `clients` document
- Each array item gets a local `id` for update/delete operations
- When updating, fetch entire client, modify array, write back

### 3.3 Firestore Indexes

**Recommended Indexes for Querying:**

```
Collection: clients
- Composite: type (Asc), isActive (Desc), createdAt (Desc)
- Simple: isActive (Asc)
- Simple: type (Asc)
- Simple: createdAt (Desc)
```

---

## 4. API Design

### 4.1 REST Endpoints

#### List & Search Clients
```
GET /api/clients
Query Parameters:
  - searchQuery?: string              // Search name, email, phone, CPF/CNPJ
  - type?: 'person' | 'business'      // Filter by client type
  - sortBy?: 'name' | 'created' | 'updated'
  - sortOrder?: 'asc' | 'desc'
  - limit?: number                    // Default: 20, Max: 100
  - page?: number                     // Default: 1

Response:
{
  success: boolean;
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

#### Get Single Client
```
GET /api/clients/:id

Response:
{
  success: boolean;
  client: Client;
}
```

#### Create Client
```
POST /api/clients
Body: {
  type: 'person' | 'business';
  name: string;
  email?: string;
  cpfCnpj?: string;
  phone?: string;
  address?: Address;
  contactMethods: ContactMethod[];    // Min 1 required
  relatedPersons?: RelatedPerson[];
  specialDates?: SpecialDate[];
  notes?: string;
  tags?: string[];
  preferences?: Preferences;
  ... (business-specific fields)
}

Response:
{
  success: boolean;
  client: Client;
  message: string;
}
```

#### Update Client
```
PUT /api/clients/:id
Body: { /* Same as Create, all fields optional */ }

Response:
{
  success: boolean;
  client: Client;
  message: string;
}
```

#### Delete Client (Soft Delete)
```
DELETE /api/clients/:id

Response:
{
  success: boolean;
  message: string;
}
```

#### Restore Client
```
POST /api/clients/:id/restore

Response:
{
  success: boolean;
  client: Client;
  message: string;
}
```

### 4.2 API Response Structure

Following existing pattern in codebase:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

---

## 5. Validation Rules

### 5.1 Field Validation

#### Personal Clients
- **name**: Required, 2-100 characters, trim whitespace
- **email**: Valid email format (optional)
- **cpfCnpj**: Valid CPF format if provided (optional)
- **contactMethods**: Minimum 1, each with valid type and value
- **phone**: Valid format (deprecated in favor of contactMethods)

#### Business Clients
- **name**: Required, company name 2-150 characters
- **companyInfo.cnpj**: Required, valid CNPJ format
- **representative.name**: Required, 2-100 characters
- **representative.email**: Required, valid email
- **representative.phone**: Required, valid phone format
- **contactMethods**: Minimum 1

#### Contact Methods
- **type**: Must be one of: phone, email, whatsapp, instagram, facebook, linkedin, other
- **value**: Required, non-empty, type-specific validation
  - Email: Valid email format
  - Phone/WhatsApp: Valid Brazilian phone format
  - Instagram/Facebook: Valid username format
  - LinkedIn: Valid URL or username
  - Other: Any non-empty string
- **isPrimary**: Boolean flag, only one per type can be primary

#### Related Persons
- **name**: Required, 2-100 characters
- **relationship**: Must be one of: child, parent, sibling, friend, spouse, other
- **email**: Valid email if provided
- **phone**: Valid phone format if provided
- **birthDate**: Valid date format if provided

#### Special Dates
- **date**: Required, valid future or past date
- **type**: Must be one of: birthday, anniversary, custom
- **description**: Required, 2-100 characters
- **notes**: Optional, max 500 characters

### 5.2 Business Rules
- Client name must be unique (or at least warning if duplicate detected)
- CPF/CNPJ must be unique across active clients
- At least 1 contact method required per client
- If business client, representative person is required
- Only one contact method per type can be marked as primary
- Soft-deleted clients cannot be edited (must restore first)

---

## 6. Component Architecture

### 6.1 Pages

#### `/clients` - List Page
- Displays list of all active clients
- Search and filter functionality
- Create new client button
- Quick actions: view, edit, delete

#### `/clients/new` - Create Page
- Form to create new personal or business client
- Toggle between client types
- Multi-step form or single form with conditional fields
- Dynamic sections for contact methods, related persons, special dates

#### `/clients/[id]` - Detail Page
- Read-only display of client information
- Organized sections with clear visual hierarchy
- Action buttons: Edit, Delete, Print (future)
- Show creation/modification timestamps

#### `/clients/[id]/edit` - Edit Page
- Pre-populated form with existing client data
- Same structure as create page
- Dynamic sections for managing contact methods, related persons, special dates
- Preserve creation info, update modification timestamp

### 6.2 Components

#### Layout Components
- **ClientsLayout**: Main page layout with sidebar context
- **ClientHeader**: Page header with title and actions

#### Form Components
- **ClientForm**: Main form component (handles both create and edit)
- **ClientTypeToggle**: Toggle between personal and business
- **PersonalClientFields**: Conditional fields for personal clients
- **BusinessClientFields**: Conditional fields for business clients
- **ContactMethodsSection**: Manage multiple contact methods (add/edit/remove)
- **RelatedPersonsSection**: Manage multiple related persons
- **SpecialDatesSection**: Manage multiple special dates
- **AddressFields**: Reusable address input section
- **PreferencesSection**: Customer preferences and notes

#### List Components
- **ClientsList**: Table or card view of clients
- **ClientCard**: Individual client card with quick actions
- **ClientRow**: Table row with client info and actions
- **ClientSearch**: Search and filter controls

#### Dialog/Modal Components
- **ClientDetailModal**: Read-only detail view
- **DeleteConfirmation**: Confirmation before deleting
- **ClientActionMenu**: Dropdown with actions

#### Utility Components
- **ContactMethodBadge**: Visual display of contact method type
- **RelationshipBadge**: Visual display of relationship type
- **SpecialDateCard**: Display special date with formatting

### 6.3 Forms Strategy

#### Single Comprehensive Form vs Multi-Step
**Recommendation: Single Comprehensive Form with Sections**

**Rationale:**
- Matches existing pattern (SupplierForm, IngredientForm)
- Users can see all fields at once
- Scrollable sections for organization
- Easier validation of related field dependencies

**Structure:**
```
ClientForm
├── Form Container
├── Section 1: Basic Info
│   ├── Client Type Toggle
│   ├── Personal or Business Fields (conditional)
│   ├── Email, Phone (primary contact)
│   └── CPF/CNPJ, Address
├── Section 2: Contact Methods
│   ├── Contact Methods List
│   ├── Add Contact Method Button
│   └── Contact Method Subform (inline edit/add)
├── Section 3: Related Persons
│   ├── Related Persons List
│   ├── Add Related Person Button
│   └── Related Person Subform (inline edit/add)
├── Section 4: Special Dates
│   ├── Special Dates List
│   ├── Add Special Date Button
│   └── Special Date Subform (inline edit/add)
├── Section 5: Notes & Preferences
│   ├── Notes textarea
│   ├── Tags input
│   ├── Marketing consent checkbox
│   └── Preferred contact method select
└── Actions
    ├── Submit Button
    └── Cancel Button
```

---

## 7. Validation & Error Handling

### 7.1 Validation Strategy

**Multi-layer Validation:**

1. **Client-side (Form)**: Real-time field validation using react-hook-form + Zod
2. **Client-side (Submit)**: Full form validation before submission
3. **Server-side (API)**: Re-validate all fields in route handler
4. **Database**: Firestore transaction validation

**Validation Schema Structure:**
```typescript
// Basic schema
const contactMethodSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['phone', 'email', 'whatsapp', 'instagram', 'facebook', 'linkedin', 'other']),
  value: z.string().min(1, 'Contact value required'),
  isPrimary: z.boolean(),
  notes: z.string().optional()
});

const relatedPersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name min 2 chars'),
  relationship: z.enum(['child', 'parent', 'sibling', 'friend', 'spouse', 'other']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional()
});

const specialDateSchema = z.object({
  id: z.string().optional(),
  date: z.string().transform(str => new Date(str)),
  type: z.enum(['birthday', 'anniversary', 'custom']),
  description: z.string().min(2).max(100),
  relatedPersonId: z.string().optional(),
  notes: z.string().optional()
});

const baseClientSchema = z.object({
  name: z.string().min(2, 'Name required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.object({
    cep: z.string().optional(),
    estado: z.string().optional(),
    cidade: z.string().optional(),
    bairro: z.string().optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional()
  }).optional(),
  contactMethods: z.array(contactMethodSchema).min(1, 'At least 1 contact method required'),
  relatedPersons: z.array(relatedPersonSchema).optional(),
  specialDates: z.array(specialDateSchema).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  preferences: z.object({
    preferredContact: z.enum(['phone', 'email', 'whatsapp', 'other']).optional(),
    marketingConsent: z.boolean().optional(),
    communicationPreference: z.string().optional()
  }).optional()
});

const personalClientSchema = baseClientSchema.extend({
  type: z.literal('person')
});

const businessClientSchema = baseClientSchema.extend({
  type: z.literal('business'),
  companyInfo: z.object({
    cnpj: z.string().min(18, 'Valid CNPJ required'),
    companyName: z.string().min(2),
    businessType: z.string().optional(),
    inscricaoEstadual: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email().optional()
  }),
  representative: z.object({
    name: z.string().min(2, 'Name required'),
    email: z.string().email('Valid email required'),
    phone: z.string().min(10, 'Valid phone required'),
    role: z.string().optional(),
    cpf: z.string().optional()
  })
});

export const createClientSchema = z.union([personalClientSchema, businessClientSchema]);
export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string()
});
```

### 7.2 Error Handling

**Error Types & Messages:**

```typescript
// Validation errors
- "Name is required"
- "Email must be valid"
- "At least 1 contact method required"
- "CPF/CNPJ already exists"
- "Contact value must be unique per type"

// Business logic errors
- "Client not found"
- "Client is inactive - cannot edit"
- "Insufficient permissions"

// System errors
- "Database error - try again later"
- "Failed to create client"
```

**UI Error Display:**
- Field-level validation errors below input fields
- Page-level error alerts for submission failures
- Toast notifications for success/errors (future)
- Form submission disabled during processing

---

## 8. Implementation Phases

### Phase 1: Foundation & Type System (1-2 days)
**Objective**: Set up types, validation schemas, and Firestore operations

**Tasks:**
1. Create TypeScript types in `src/types/client.ts`
   - Client interface with all fields
   - ContactMethod interface
   - RelatedPerson interface
   - SpecialDate interface
   - Enums for types, relationships, etc.

2. Create validation schemas in `src/lib/validators/client.ts`
   - BaseClient schema
   - PersonalClient schema
   - BusinessClient schema
   - Create/Update variations
   - Export TypeScript types from schemas

3. Create Firestore CRUD operations in `src/lib/clients.ts`
   - `fetchClients(filters)` - List with search
   - `fetchClient(id)` - Get single
   - `createClient(data)` - Create
   - `updateClient(data)` - Update
   - `deleteClient(id)` - Soft delete
   - `restoreClient(id)` - Restore soft-deleted
   - Helper functions for document conversion

4. Write unit tests for CRUD operations
   - Mock Firestore
   - Test validation errors
   - Test duplicate detection
   - Test soft delete logic

### Phase 2: API Routes (1 day)
**Objective**: Create REST API endpoints

**Tasks:**
1. Create route handler `/api/clients/route.ts`
   - GET: List with filters
   - POST: Create with validation

2. Create route handler `/api/clients/[id]/route.ts`
   - GET: Fetch single client
   - PUT: Update client
   - DELETE: Soft delete

3. Create route handler `/api/clients/[id]/restore.ts`
   - POST: Restore soft-deleted client

4. Test all endpoints with Postman/curl

### Phase 3: Components - Forms (2-3 days)
**Objective**: Build form components for create/edit

**Tasks:**
1. Create `ClientForm.tsx`
   - Main form wrapper
   - Client type toggle
   - Conditional field rendering
   - Form submission handling
   - Loading/error states

2. Create `PersonalClientFields.tsx`
   - Name, email, phone, CPF fields
   - Address section

3. Create `BusinessClientFields.tsx`
   - Company name, CNPJ, business type
   - Representative info fields
   - Company address

4. Create `ContactMethodsSection.tsx`
   - Display list of contact methods
   - Add contact method form
   - Edit/delete contact methods
   - Primary contact toggle

5. Create `RelatedPersonsSection.tsx`
   - Display list of related persons
   - Add related person form
   - Edit/delete related persons

6. Create `SpecialDatesSection.tsx`
   - Display list of special dates
   - Add special date form
   - Edit/delete special dates

7. Create supporting components
   - `AddressFields.tsx` - Reusable address input
   - `PreferencesSection.tsx` - Notes, tags, preferences
   - Form field wrappers with error display

### Phase 4: Components - Lists & Details (2 days)
**Objective**: Build list view and detail display

**Tasks:**
1. Create `ClientsList.tsx`
   - Table or card layout
   - Search and filter integration
   - Pagination
   - Action buttons (view, edit, delete)

2. Create `ClientCard.tsx` or `ClientRow.tsx`
   - Display essential client info
   - Quick action menu

3. Create `ClientDetailModal.tsx` or detail page
   - Read-only display of all sections
   - Edit/Delete buttons
   - Print button (placeholder)

4. Create `DeleteConfirmation.tsx`
   - Confirmation dialog before delete

5. Create supporting components
   - `ContactMethodBadge.tsx`
   - `RelationshipBadge.tsx`
   - `SpecialDateCard.tsx`

### Phase 5: Pages & Navigation (1 day)
**Objective**: Create pages and integrate with navigation

**Tasks:**
1. Create `/clients` page layout
   - Import and compose components
   - Integrate with sidebar navigation

2. Create `/clients/new` page
   - Display ClientForm in create mode

3. Create `/clients/[id]/edit` page
   - Load client data
   - Display ClientForm in edit mode

4. Add navigation menu item
   - Update Sidebar.tsx to include "Clients" menu
   - Set up routes in navigation config

5. Create breadcrumb support

### Phase 6: Integration & Testing (2-3 days)
**Objective**: Full E2E testing and refinement

**Tasks:**
1. Write Playwright E2E tests
   - Login and navigate to clients
   - Create personal client
   - Create business client
   - Search and filter clients
   - Edit client
   - Delete client
   - Restore client

2. Test all validation scenarios
   - Missing required fields
   - Invalid email/CPF/CNPJ
   - Duplicate client detection

3. Test edge cases
   - Large number of contact methods
   - Related persons with special dates
   - Business clients with multiple contacts

4. Performance testing
   - Load time for large client lists
   - Form submission performance

5. User acceptance testing
   - Staff reviews functionality
   - Sales team reviews client data

### Phase 7: Sales Platform Integration (1-2 days)
**Objective**: Make client data available to sales platform

**Tasks:**
1. Create read-only API for sales platform
   - GET /api/clients with sales-specific filters
   - GET /api/clients/special-dates - List upcoming special dates

2. Test sales platform access
   - Verify data synchronization
   - Test special dates query for marketing campaigns

3. Document integration points

### Phase 8: Documentation & Refinement (1 day)
**Objective**: Complete documentation and final polish

**Tasks:**
1. Create user documentation
   - How to create/edit/delete clients
   - How to manage contact methods
   - Best practices for data entry

2. Create developer documentation
   - Architecture overview
   - API documentation
   - Extension points for future features

3. Performance optimization
   - Index creation in Firestore
   - Lazy loading of large lists
   - Caching strategy

4. Final QA and bug fixes

---

## 9. Technical Specifications

### 9.1 Database Queries

**Frequently Used Queries:**

```firestore
// Get all active personal clients, sorted by name
db.collection('clients')
  .where('isActive', '==', true)
  .where('type', '==', 'person')
  .orderBy('name')

// Get all active business clients
db.collection('clients')
  .where('isActive', '==', true)
  .where('type', '==', 'business')
  .orderBy('name')

// Search for client by CPF/CNPJ (exact match)
db.collection('clients')
  .where('cpfCnpj', '==', '12345678900')
  .where('isActive', '==', true)

// Find deleted clients (for restore functionality)
db.collection('clients')
  .where('isActive', '==', false)
  .orderBy('updatedAt', 'desc')

// Get recently created clients
db.collection('clients')
  .where('isActive', '==', true)
  .orderBy('createdAt', 'desc')
  .limit(20)
```

### 9.2 Index Requirements

Firestore composite indexes needed:

```
Index 1: Collection 'clients'
- Field: type (Ascending)
- Field: isActive (Ascending)
- Field: name (Ascending)

Index 2: Collection 'clients'
- Field: type (Ascending)
- Field: createdAt (Descending)

Index 3: Collection 'clients'
- Field: isActive (Ascending)
- Field: createdAt (Descending)
```

### 9.3 Performance Considerations

**Optimization Strategies:**

1. **Pagination**: Load clients in batches of 20-50
2. **Search**: Client-side filtering for small datasets, server-side for large
3. **Lazy Loading**: Load related persons and special dates on demand
4. **Caching**: Cache frequently accessed client data (future)
5. **Batch Operations**: Use Firestore transactions for multi-document updates

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Coverage:**
- CRUD operations: Create, Read, Update, Delete, Restore
- Validation schemas: All client types and field combinations
- Helper functions: Document conversion, formatting
- Business logic: Duplicate detection, soft delete

**Framework**: Vitest with Firebase emulator

### 10.2 Component Tests

**Coverage:**
- Form validation and submission
- Dynamic section add/remove (contact methods, etc.)
- Client type toggle conditional rendering
- Error display and handling

**Framework**: Vitest + React Testing Library

### 10.3 E2E Tests

**Scenarios:**
1. Create personal client with contact methods and special dates
2. Create business client with representative
3. Search and filter clients
4. Edit client information
5. Add/remove contact methods
6. Add/remove related persons
7. Delete and restore client

**Framework**: Playwright

### 10.4 User Acceptance Testing

**Scenarios:**
- Admin staff can create and manage all client types
- Staff can quickly find clients with search
- Special dates are visible for upselling
- Business clients properly track representatives
- No data loss on form validation errors

---

## 11. Acceptance Criteria

### Core Features
- [ ] Clients CRUD (Create, Read, Update, Soft Delete, Restore) fully functional
- [ ] Personal and business client types with appropriate fields
- [ ] Multiple contact methods per client (min 1, max unlimited)
- [ ] Related persons management (optional, multiple entries)
- [ ] Special dates management (optional, multiple entries)
- [ ] Search and filter by name, email, phone, CPF/CNPJ
- [ ] Proper validation with user-friendly error messages
- [ ] Soft delete with restore capability

### User Interface
- [ ] List page with search, filter, pagination
- [ ] Create page with form
- [ ] Detail page with read-only view
- [ ] Edit page with pre-populated form
- [ ] Dynamic sections for contact methods, related persons, special dates
- [ ] Responsive design for mobile and desktop
- [ ] Clear visual feedback for form states (loading, error, success)

### Technical Quality
- [ ] TypeScript types for all data structures
- [ ] Zod validation schemas for all inputs
- [ ] API endpoints follow REST conventions
- [ ] Error handling at all layers
- [ ] Database transactions for complex operations
- [ ] Unit tests with >80% coverage
- [ ] E2E tests for critical user flows
- [ ] Code follows existing patterns in codebase

### Integration
- [ ] Navigation menu updated with Clients section
- [ ] Sales platform can access client data via API
- [ ] Breadcrumb navigation working correctly
- [ ] Layout consistent with existing pages

---

## 12. Future Enhancements (Out of Scope)

These features will be planned for Phase 2:

- [ ] Special dates automation: Send notifications/create tasks for birthdays
- [ ] Customer segmentation and tags system
- [ ] Client interaction history (orders, communications)
- [ ] Bulk import from CSV
- [ ] Export client list to PDF/Excel
- [ ] Email campaign integration
- [ ] WhatsApp integration for bulk messages
- [ ] Client360 dashboard (combined view of all touchpoints)
- [ ] Client preferences and communication history
- [ ] Analytics: Most active clients, seasonal patterns
- [ ] Role-based field visibility (hide sensitive data from some staff)

---

## 13. Success Metrics

**Completion Criteria:**
- All acceptance criteria met
- >80% test coverage (unit + component tests)
- 0 critical/high-severity bugs
- Performance: List loads in <2s, form submits in <1s
- All E2E tests pass
- Staff UAT signed off

**Launch Readiness:**
- Documentation complete
- Firestore indexes created
- Staff training materials ready
- Rollback plan in place

---

## 14. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data migration from old system | High | Plan data mapping upfront, test with sample data |
| Performance with large client lists | Medium | Implement pagination, optimize queries early |
| Complex form UX | Medium | User testing with staff early, iterate based on feedback |
| Duplicate client detection | Medium | Unique index on CPF/CNPJ, validation on create |
| Business rule validation | Medium | Comprehensive test coverage for edge cases |
| Integration with sales platform | Low | Document API contract early, test integration often |

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Design finalized and approved
- [ ] Team has access to Firebase dev environment
- [ ] All tools and dependencies available

### During Implementation
- [ ] Code follows existing patterns
- [ ] Tests written for new code
- [ ] Documentation updated
- [ ] Code reviews completed

### Pre-Launch
- [ ] All tests passing (unit, component, E2E)
- [ ] Performance acceptable
- [ ] Security review completed
- [ ] UAT sign-off obtained
- [ ] Deployment plan ready

### Post-Launch
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Performance monitoring
- [ ] Plan Phase 2 enhancements

---

## 16. Resources & References

### Code Examples to Reference
- Suppliers CRUD: `/src/lib/suppliers.ts`
- Ingredient CRUD: `/src/lib/ingredients.ts`
- Supplier Form: `/src/components/suppliers/SupplierForm.tsx`
- Recipe Validation: `/src/lib/validators/recipe.ts`
- API Route Pattern: `/src/app/api/ingredients/route.ts`

### Documentation
- Firebase Firestore: https://firebase.google.com/docs/firestore
- React Hook Form: https://react-hook-form.com/
- Zod Validation: https://zod.dev/
- Playwright Testing: https://playwright.dev/

### Team Contacts
- Design Lead: [TBD]
- Backend Owner: [TBD]
- QA Lead: [TBD]

---

**Plan Created**: 2025-10-25
**Next Step**: Begin Phase 1 - Foundation & Type System
**Estimated Total Duration**: 9-12 days (high priority, full-time)
