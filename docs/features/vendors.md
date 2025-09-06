# Vendors Management Feature

## Overview

The Vendors Management system enables Momento Cake to manage supplier relationships, track vendor performance, and maintain comprehensive vendor contact information. This feature supports ingredient purchasing decisions and supplier relationship management.

## Business Requirements

### Core Features
1. **List all vendors** - Complete supplier directory
2. **Add new vendor** - Register new suppliers
3. **View vendor details** - Complete vendor information
4. **Edit vendor information** - Update supplier details
5. **Delete vendors** - Remove vendors (soft delete)
6. **Vendor performance tracking** - Price history and reliability metrics
7. **Contact management** - Comprehensive contact information

### Vendor Information
- **Basic details**: Name, type, contact person
- **Contact information**: Phone, email, address
- **Business details**: CNPJ, business type, specialties
- **Performance metrics**: Price trends, delivery reliability
- **Notes and preferences**: Internal notes and preferences

## Data Models

### Vendor Model
```typescript
interface Vendor {
  id: string
  name: string
  contactPerson: string
  vendorType: VendorType
  phone: string
  email: string
  address: VendorAddress
  cnpj?: string
  website?: string
  specialties: string[] // Categories they supply
  paymentTerms?: string
  deliveryDays: DeliveryDay[]
  minimumOrder?: number
  notes: string
  isActive: boolean
  rating: number // 1-5 stars
  createdAt: Date
  updatedAt: Date
}

interface VendorAddress {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  reference?: string
}

enum VendorType {
  SUPERMARKET = 'supermarket',
  ECOMMERCE = 'ecommerce', 
  WHOLESALE = 'wholesale',
  DISTRIBUTOR = 'distributor',
  PRODUCER = 'producer',
  OTHER = 'other'
}

enum DeliveryDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}
```

### Vendor Performance Model
```typescript
interface VendorPerformance {
  vendorId: string
  totalOrders: number
  averageDeliveryTime: number // days
  onTimeDeliveryRate: number // percentage
  averagePriceIncrease: number // percentage over time
  lastOrderDate: Date
  reliabilityScore: number // calculated score
  priceCompetitiveness: number // compared to other vendors
}
```

## User Interface Requirements

### Vendors List Screen
- **Header**: "Fornecedores" with add vendor button
- **Search/Filter**: Search by name, filter by type/specialties
- **Vendor Cards**: Display name, type, contact, rating
- **Quick Actions**: View details, edit, call, email
- **Performance indicators**: Visual rating and reliability indicators

### Add/Edit Vendor Screen
- **Basic Information**:
  - Name, contact person, vendor type
  - Phone, email with validation
  - CNPJ with Brazilian format validation
- **Address Information**:
  - Complete Brazilian address format
  - CEP (zip code) lookup integration
  - Reference point for delivery
- **Business Details**:
  - Specialties (multi-select categories)
  - Payment terms and conditions
  - Delivery days and minimum order
- **Notes**: Internal notes and preferences

### Vendor Detail Screen
- **Contact Overview**: Quick contact information
- **Performance Metrics**: Rating, delivery stats, price trends
- **Recent Orders**: List of recent purchases
- **Ingredients Supplied**: List of ingredients from this vendor
- **Actions**: Edit, deactivate, add note, contact

## Business Rules

### Vendor Classification
```typescript
const vendorTypes = {
  SUPERMARKET: {
    label: 'Supermercado',
    description: 'Retail chains and supermarkets',
    expectedDelivery: 'Same day or next day',
    paymentTerms: 'Immediate or 30 days'
  },
  ECOMMERCE: {
    label: 'E-commerce',
    description: 'Online retailers and marketplaces',
    expectedDelivery: '2-5 business days',
    paymentTerms: 'Immediate or credit card'
  },
  WHOLESALE: {
    label: 'Atacadista',
    description: 'Wholesale suppliers',
    expectedDelivery: '1-3 business days',
    paymentTerms: '30-60 days'
  },
  DISTRIBUTOR: {
    label: 'Distribuidor',
    description: 'Specialized food distributors',
    expectedDelivery: '1-2 business days',
    paymentTerms: '30-45 days'
  },
  PRODUCER: {
    label: 'Produtor',
    description: 'Direct from producer',
    expectedDelivery: 'Weekly or bi-weekly',
    paymentTerms: 'Immediate or 15 days'
  }
}
```

### Performance Calculation
```typescript
const calculateVendorPerformance = (vendor: Vendor, orders: PurchaseOrder[]) => {
  const vendorOrders = orders.filter(o => o.vendorId === vendor.id)
  
  const onTimeDeliveries = vendorOrders.filter(o => 
    o.deliveredDate && o.deliveredDate <= o.expectedDeliveryDate
  ).length
  
  const onTimeRate = (onTimeDeliveries / vendorOrders.length) * 100
  
  const avgDeliveryTime = vendorOrders.reduce((sum, order) => {
    if (order.deliveredDate) {
      const days = differenceInDays(order.deliveredDate, order.orderDate)
      return sum + days
    }
    return sum
  }, 0) / vendorOrders.length
  
  return {
    totalOrders: vendorOrders.length,
    onTimeDeliveryRate: onTimeRate,
    averageDeliveryTime: avgDeliveryTime,
    reliabilityScore: calculateReliabilityScore(onTimeRate, avgDeliveryTime)
  }
}
```

### Brazilian Business Validation
- **CNPJ validation**: Validate Brazilian company registration number
- **CEP integration**: Automatic address lookup from postal code
- **Phone format**: Brazilian phone number format validation
- **State codes**: Brazilian state abbreviations

## Technical Implementation

### API Endpoints
```typescript
// Vendors CRUD
GET    /api/vendors              // List all vendors
POST   /api/vendors              // Create new vendor
GET    /api/vendors/:id          // Get vendor details
PUT    /api/vendors/:id          // Update vendor
DELETE /api/vendors/:id          // Soft delete vendor

// Vendor performance
GET    /api/vendors/:id/performance // Get vendor performance metrics
GET    /api/vendors/:id/orders      // Get vendor order history
POST   /api/vendors/:id/rating      // Rate vendor

// Address services
GET    /api/address/cep/:cep     // Lookup address by CEP
POST   /api/vendors/cnpj/validate // Validate CNPJ
```

### Database Schema
```sql
-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  vendor_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  cnpj VARCHAR(20),
  website VARCHAR(500),
  specialties TEXT[], -- Array of specialties
  payment_terms TEXT,
  delivery_days TEXT[], -- Array of delivery days
  minimum_order DECIMAL(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor addresses table
CREATE TABLE vendor_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  reference TEXT,
  is_primary BOOLEAN DEFAULT true
);

-- Vendor performance metrics (materialized view for performance)
CREATE MATERIALIZED VIEW vendor_performance AS
SELECT 
  v.id as vendor_id,
  v.name,
  COUNT(pr.id) as total_orders,
  AVG(EXTRACT(DAY FROM (pr.delivered_date - pr.order_date))) as avg_delivery_time,
  (COUNT(CASE WHEN pr.delivered_date <= pr.expected_delivery_date THEN 1 END) * 100.0 / 
   COUNT(pr.id)) as on_time_rate,
  MAX(pr.order_date) as last_order_date
FROM vendors v
LEFT JOIN purchase_records pr ON v.id = pr.vendor_id
WHERE v.is_active = true
GROUP BY v.id, v.name;

-- Indexes
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendor_addresses_vendor ON vendor_addresses(vendor_id);
```

### State Management (Zustand)
```typescript
interface VendorStore {
  // State
  vendors: Vendor[]
  currentVendor: Vendor | null
  loading: boolean
  error: string | null
  filters: {
    search: string
    type: VendorType | null
    specialties: string[]
    activeOnly: boolean
  }

  // Actions
  fetchVendors: () => Promise<void>
  fetchVendor: (id: string) => Promise<void>
  createVendor: (data: CreateVendorData) => Promise<void>
  updateVendor: (id: string, data: UpdateVendorData) => Promise<void>
  deleteVendor: (id: string) => Promise<void>
  rateVendor: (id: string, rating: number) => Promise<void>
  searchVendors: (query: string) => Promise<void>
  setFilters: (filters: Partial<VendorStore['filters']>) => void
  clearError: () => void
}
```

## Component Structure

```
src/features/vendors/
├── components/
│   ├── VendorsList.tsx             # Main vendors list
│   ├── VendorCard.tsx              # Vendor card component
│   ├── VendorDetail.tsx            # Vendor detail view
│   ├── VendorForm.tsx              # Create/edit vendor form
│   ├── VendorPerformance.tsx       # Performance metrics display
│   ├── AddressForm.tsx             # Brazilian address form
│   ├── CNPJValidator.tsx           # CNPJ validation component
│   └── VendorRating.tsx            # Rating component
├── hooks/
│   ├── useVendors.ts               # Vendors data management
│   ├── useVendorForm.ts            # Form state management
│   ├── useAddressLookup.ts         # CEP address lookup
│   └── useVendorPerformance.ts     # Performance calculations
├── services/
│   ├── vendorsApi.ts               # API service layer
│   ├── addressService.ts           # Address lookup service
│   └── cnpjService.ts              # CNPJ validation service
├── types/
│   └── vendor.types.ts             # TypeScript definitions
└── utils/
    ├── vendorValidation.ts         # Form validation
    ├── cnpjUtils.ts                # CNPJ utilities
    └── addressUtils.ts             # Address formatting
```

## Brazilian-Specific Features

### CNPJ Validation
```typescript
const validateCNPJ = (cnpj: string): boolean => {
  // Remove non-numeric characters
  cnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cnpj)) return false // All same digits
  
  // CNPJ validation algorithm
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  
  const digit1 = calculateCNPJDigit(cnpj.slice(0, 12), weights1)
  const digit2 = calculateCNPJDigit(cnpj.slice(0, 13), weights2)
  
  return cnpj[12] === digit1.toString() && cnpj[13] === digit2.toString()
}

const formatCNPJ = (cnpj: string): string => {
  cnpj = cnpj.replace(/[^\d]/g, '')
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}
```

### CEP Address Lookup
```typescript
const lookupAddress = async (cep: string): Promise<Address> => {
  const cleanCEP = cep.replace(/[^\d]/g, '')
  
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos')
  }
  
  const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
  const data = await response.json()
  
  if (data.erro) {
    throw new Error('CEP não encontrado')
  }
  
  return {
    street: data.logradouro,
    neighborhood: data.bairro,
    city: data.localidade,
    state: data.uf,
    zipCode: cleanCEP
  }
}
```

## User Experience Features

### Smart Forms
- **Auto-complete vendor names**: Prevent duplicates
- **CEP lookup**: Automatic address completion
- **CNPJ validation**: Real-time validation with formatting
- **Phone formatting**: Brazilian phone number formatting

### Performance Visualization
- **Rating display**: Star ratings with hover details
- **Delivery performance**: Visual indicators for reliability
- **Price trend charts**: Historical price analysis
- **Comparison tools**: Compare vendors side-by-side

### Contact Integration
- **Click-to-call**: Direct phone dialing on mobile
- **Email links**: Quick email composition
- **WhatsApp integration**: Direct WhatsApp messaging
- **Map integration**: Navigation to vendor location

## Integration Points

### Ingredients System
- **Preferred vendors**: Link ingredients to preferred suppliers
- **Price comparison**: Compare prices across vendors
- **Supply reliability**: Track vendor stock availability

### Purchase System
- **Order history**: Complete purchase history per vendor
- **Payment tracking**: Monitor payment status
- **Delivery tracking**: Track order deliveries

### Reporting System
- **Vendor analysis**: Performance and cost analysis
- **Purchase reports**: Spending by vendor
- **Reliability metrics**: Vendor reliability reporting

## Performance Considerations

### Data Loading
- **Lazy loading**: Load vendor details on demand
- **Search optimization**: Fast vendor search with indexing
- **Caching**: Cache frequently accessed vendor data
- **Offline capability**: Store essential vendor info offline

### Address Services
- **CEP caching**: Cache address lookups
- **Batch validation**: Validate multiple CNPJs together
- **Error handling**: Graceful handling of service failures

## Testing Strategy

### Unit Tests
- CNPJ validation functions
- Address formatting utilities
- Performance calculation logic
- Form validation rules

### Integration Tests
- CEP address lookup service
- CNPJ validation API
- Complete vendor CRUD operations
- Performance metrics calculation

### E2E Tests
- Full vendor management workflow
- Address lookup and validation
- Contact information management
- Performance tracking accuracy

## Implementation Timeline

### Phase 1 (Week 1-2)
- Basic vendor CRUD operations
- Brazilian address and CNPJ validation
- Vendor list and detail views

### Phase 2 (Week 3-4)
- Performance tracking system
- Advanced search and filtering
- Contact management features

### Phase 3 (Week 5-6)
- Performance analytics
- Integration with purchase system
- Mobile optimization

This comprehensive documentation provides complete guidance for implementing a robust vendor management system specifically designed for Brazilian business operations and Momento Cake's supplier relationship needs.