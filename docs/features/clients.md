# Clients Management Feature

## Overview

The Clients Management system enables Momento Cake to maintain comprehensive customer relationships, track important dates, manage contact preferences, and build lasting customer connections. This feature supports personalized service and customer retention strategies.

## Business Requirements

### Core Features
1. **List all clients** - Complete customer directory
2. **Add new client** - Register new customers
3. **View client details** - Complete customer profile
4. **Edit client information** - Update customer details
5. **Delete clients** - Remove clients (soft delete)
6. **Address management** - Multiple addresses with preferences
7. **Contact management** - Multiple contact methods with preferences
8. **Related persons** - Family and friends network
9. **Special dates tracking** - Birthdays and important occasions

### Client Information Categories
- **Personal details**: Name, document, type (individual/business)
- **Contact information**: Phones, emails with preferences
- **Addresses**: Delivery addresses with preferences
- **Related persons**: Family members and close relationships
- **Special dates**: Birthdays, anniversaries, important occasions
- **Order history**: Purchase history and preferences (future integration)

## Data Models

### Client Model
```typescript
interface Client {
  id: string
  type: ClientType
  firstName: string
  lastName: string
  companyName?: string // For business clients
  document: string // CPF or CNPJ
  description?: string
  addresses: ClientAddress[]
  contacts: ClientContact[]
  relatedPersons: RelatedPerson[]
  specialDates: SpecialDate[]
  notes: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface ClientAddress {
  id: string
  label: string // 'Casa', 'Trabalho', 'Evento', etc.
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  reference?: string
  isPreferred: boolean
}

interface ClientContact {
  id: string
  type: ContactType
  value: string
  label?: string
  isPreferred: boolean
}

interface RelatedPerson {
  id: string
  firstName: string
  lastName: string
  relationship: RelationshipType
  birthDate?: Date
  contacts: ClientContact[]
  notes?: string
}

interface SpecialDate {
  id: string
  title: string
  date: Date
  type: SpecialDateType
  isRecurring: boolean
  notes?: string
  relatedPersonId?: string
}

enum ClientType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business'
}

enum ContactType {
  PHONE = 'phone',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email'
}

enum RelationshipType {
  SPOUSE = 'spouse',
  CHILD = 'child',
  PARENT = 'parent',
  SIBLING = 'sibling',
  GRANDPARENT = 'grandparent',
  GRANDCHILD = 'grandchild',
  FRIEND = 'friend',
  COLLEAGUE = 'colleague',
  OTHER = 'other'
}

enum SpecialDateType {
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  GRADUATION = 'graduation',
  WEDDING = 'wedding',
  BAPTISM = 'baptism',
  OTHER = 'other'
}
```

## User Interface Requirements

### Clients List Screen
- **Header**: "Clientes" with add client button
- **Search/Filter**: Search by name, filter by type/location
- **Client Cards**: Display name, preferred contact, next special date
- **Quick Actions**: View details, call, WhatsApp, edit
- **Special date indicators**: Highlight upcoming birthdays/events

### Add/Edit Client Screen
#### Basic Information Tab
- **Client Type**: Individual or Business selection
- **Personal Details**: First name, last name, company name (if business)
- **Document**: CPF for individuals, CNPJ for businesses
- **Description**: Additional notes about the client

#### Addresses Tab
- **Address List**: All registered addresses
- **Add Address**: Brazilian address format with CEP lookup
- **Preferred Address**: Mark preferred delivery address
- **Address Labels**: Custom labels (Casa, Trabalho, Evento)

#### Contacts Tab
- **Contact Methods**: Phone, WhatsApp, email
- **Preferred Contact**: Mark preferred contact method
- **Contact Labels**: Custom labels for organization

#### Related Persons Tab
- **Person List**: Family members and friends
- **Add Person**: Name, relationship, contact info
- **Birthday Tracking**: Birth dates for gift occasions

#### Special Dates Tab
- **Date List**: All important dates
- **Add Date**: Title, date, type, recurring option
- **Notifications**: Reminder preferences (future)

### Client Detail Screen
- **Overview**: Quick client information summary
- **Upcoming Events**: Next special dates and reminders
- **Contact Quick Actions**: Call, WhatsApp, email buttons
- **Address Book**: All addresses with delivery preferences
- **Related Network**: Family and friends overview
- **Order History**: Recent orders and preferences (future)
- **Actions**: Edit, create order, add note

## Business Rules

### Document Validation
```typescript
const validateDocument = (document: string, type: ClientType): boolean => {
  if (type === ClientType.INDIVIDUAL) {
    return validateCPF(document)
  } else {
    return validateCNPJ(document)
  }
}

const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false // All same digits
  
  // CPF validation algorithm
  const weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  
  const digit1 = calculateCPFDigit(cpf.slice(0, 9), weights1)
  const digit2 = calculateCPFDigit(cpf.slice(0, 10), weights2)
  
  return cpf[9] === digit1.toString() && cpf[10] === digit2.toString()
}
```

### Brazilian Address Handling
- **CEP Integration**: Automatic address lookup from postal code
- **State Validation**: Brazilian state codes validation
- **Delivery Zones**: Validate delivery areas for Momento Cake
- **Address Standardization**: Consistent address formatting

### Contact Preferences
- **Preferred Contact**: One primary contact method per client
- **Communication History**: Track communication preferences
- **Privacy Settings**: Respect client communication preferences
- **WhatsApp Integration**: Direct WhatsApp messaging capability

### Special Dates Management
- **Recurring Events**: Annual birthdays and anniversaries
- **Reminder System**: Proactive event reminders (future)
- **Gift Suggestions**: Based on past orders and preferences (future)
- **Family Connections**: Link special dates to related persons

## Technical Implementation

### API Endpoints
```typescript
// Clients CRUD
GET    /api/clients              // List all clients
POST   /api/clients              // Create new client
GET    /api/clients/:id          // Get client details
PUT    /api/clients/:id          // Update client
DELETE /api/clients/:id          // Soft delete client

// Client addresses
POST   /api/clients/:id/addresses     // Add address
PUT    /api/clients/:id/addresses/:addressId  // Update address
DELETE /api/clients/:id/addresses/:addressId  // Remove address

// Client contacts
POST   /api/clients/:id/contacts      // Add contact
PUT    /api/clients/:id/contacts/:contactId   // Update contact
DELETE /api/clients/:id/contacts/:contactId   // Remove contact

// Related persons
POST   /api/clients/:id/persons       // Add related person
PUT    /api/clients/:id/persons/:personId     // Update person
DELETE /api/clients/:id/persons/:personId     // Remove person

// Special dates
GET    /api/clients/upcoming-dates    // Get upcoming special dates
POST   /api/clients/:id/dates         // Add special date
PUT    /api/clients/:id/dates/:dateId // Update special date
DELETE /api/clients/:id/dates/:dateId // Remove special date
```

### Database Schema
```sql
-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'individual',
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  document VARCHAR(20) NOT NULL,
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client addresses table
CREATE TABLE client_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(255),
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  reference TEXT,
  is_preferred BOOLEAN DEFAULT false
);

-- Client contacts table
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  is_preferred BOOLEAN DEFAULT false
);

-- Related persons table
CREATE TABLE related_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  birth_date DATE,
  notes TEXT
);

-- Related person contacts table
CREATE TABLE related_person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_person_id UUID REFERENCES related_persons(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  is_preferred BOOLEAN DEFAULT false
);

-- Special dates table
CREATE TABLE special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  related_person_id UUID REFERENCES related_persons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_clients_document ON clients(document);
CREATE INDEX idx_clients_name ON clients(first_name, last_name);
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_active ON clients(is_active);
CREATE INDEX idx_special_dates_date ON special_dates(date);
CREATE INDEX idx_special_dates_client ON special_dates(client_id);
```

### State Management (Zustand)
```typescript
interface ClientStore {
  // State
  clients: Client[]
  currentClient: Client | null
  upcomingDates: SpecialDate[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    type: ClientType | null
    hasUpcomingEvents: boolean
  }

  // Actions
  fetchClients: () => Promise<void>
  fetchClient: (id: string) => Promise<void>
  createClient: (data: CreateClientData) => Promise<void>
  updateClient: (id: string, data: UpdateClientData) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  
  // Address management
  addAddress: (clientId: string, address: ClientAddress) => Promise<void>
  updateAddress: (clientId: string, addressId: string, address: ClientAddress) => Promise<void>
  deleteAddress: (clientId: string, addressId: string) => Promise<void>
  setPreferredAddress: (clientId: string, addressId: string) => Promise<void>
  
  // Contact management
  addContact: (clientId: string, contact: ClientContact) => Promise<void>
  updateContact: (clientId: string, contactId: string, contact: ClientContact) => Promise<void>
  deleteContact: (clientId: string, contactId: string) => Promise<void>
  setPreferredContact: (clientId: string, contactId: string) => Promise<void>
  
  // Special dates
  fetchUpcomingDates: () => Promise<void>
  addSpecialDate: (clientId: string, date: SpecialDate) => Promise<void>
  updateSpecialDate: (clientId: string, dateId: string, date: SpecialDate) => Promise<void>
  deleteSpecialDate: (clientId: string, dateId: string) => Promise<void>
  
  setFilters: (filters: Partial<ClientStore['filters']>) => void
  clearError: () => void
}
```

## Component Structure

```
src/features/clients/
├── components/
│   ├── ClientsList.tsx             # Main clients list
│   ├── ClientCard.tsx              # Client card component
│   ├── ClientDetail.tsx            # Client detail view
│   ├── ClientForm.tsx              # Main client form
│   ├── BasicInfoForm.tsx           # Basic information tab
│   ├── AddressesForm.tsx           # Addresses management
│   ├── ContactsForm.tsx            # Contact methods management
│   ├── RelatedPersonsForm.tsx      # Related persons management
│   ├── SpecialDatesForm.tsx        # Special dates management
│   ├── UpcomingEvents.tsx          # Upcoming events widget
│   ├── QuickContact.tsx            # Quick contact buttons
│   └── DocumentValidator.tsx       # CPF/CNPJ validation
├── hooks/
│   ├── useClients.ts               # Clients data management
│   ├── useClientForm.ts            # Form state management
│   ├── useAddressLookup.ts         # CEP address lookup
│   ├── useDocumentValidation.ts    # Document validation
│   └── useUpcomingEvents.ts        # Special dates tracking
├── services/
│   ├── clientsApi.ts               # API service layer
│   ├── addressService.ts           # Address services
│   └── documentService.ts          # Document validation services
├── types/
│   └── client.types.ts             # TypeScript definitions
└── utils/
    ├── clientValidation.ts         # Form validation
    ├── documentUtils.ts            # CPF/CNPJ utilities
    ├── addressUtils.ts             # Address formatting
    └── dateUtils.ts                # Date calculations
```

## User Experience Features

### Smart Address Management
- **CEP Auto-complete**: Automatic address completion
- **Delivery Zone Validation**: Check if address is in delivery area
- **Multiple Addresses**: Support for multiple delivery addresses
- **Address Labels**: Custom labeling system

### Communication Tools
- **Click-to-Call**: Direct phone dialing on mobile
- **WhatsApp Integration**: Direct messaging with formatted text
- **Email Templates**: Pre-formatted emails for common scenarios
- **Contact Preferences**: Respect client communication preferences

### Special Events Tracking
- **Upcoming Events Dashboard**: Next 30 days special dates
- **Birthday Reminders**: Proactive birthday notifications
- **Anniversary Tracking**: Wedding and relationship anniversaries
- **Custom Events**: Support for custom special occasions

### Relationship Management
- **Family Tree View**: Visual representation of relationships
- **Bulk Contact Updates**: Update multiple related persons
- **Contact Inheritance**: Inherit preferences from main client
- **Notes and History**: Track interaction history

## Integration Points

### Orders System (Future)
- **Order History**: Complete purchase history per client
- **Preferences Tracking**: Favorite products and customizations
- **Delivery Preferences**: Preferred addresses and times
- **Payment History**: Payment methods and history

### Marketing System (Future)
- **Segmentation**: Client segmentation for marketing
- **Email Campaigns**: Targeted email marketing
- **Birthday Campaigns**: Automated birthday promotions
- **Loyalty Programs**: Customer loyalty tracking

### Communication System
- **WhatsApp Business API**: Automated messaging
- **Email Templates**: Standardized communications
- **SMS Notifications**: Order updates and reminders
- **Push Notifications**: Mobile app notifications

## Performance Considerations

### Data Loading
- **Lazy Loading**: Load client details on demand
- **Pagination**: Paginate large client lists
- **Search Optimization**: Fast client search with indexing
- **Caching**: Cache frequently accessed client data

### Address Services
- **CEP Caching**: Cache address lookups
- **Batch Operations**: Handle multiple address updates
- **Offline Capability**: Essential client info offline

## Testing Strategy

### Unit Tests
- CPF/CNPJ validation functions
- Address formatting utilities
- Date calculation functions
- Form validation logic

### Integration Tests
- Complete client CRUD operations
- Address and contact management
- Special dates functionality
- Document validation services

### E2E Tests
- Full client management workflow
- Multi-tab form completion
- Address lookup and validation
- Contact method management

## Implementation Timeline

### Phase 1 (Week 1-2)
- Basic client CRUD operations
- Brazilian document validation (CPF/CNPJ)
- Address management with CEP lookup

### Phase 2 (Week 3-4)
- Contact management system
- Related persons functionality
- Special dates tracking

### Phase 3 (Week 5-6)
- Advanced relationship features
- Communication integrations
- Mobile optimization and testing

This comprehensive documentation provides complete guidance for implementing a sophisticated client relationship management system tailored for Brazilian customer service and Momento Cake's personalized approach to customer relationships.