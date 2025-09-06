# Data Models Reference

## Overview

This document defines the core data models, database schema, and type definitions for the Momento Cake Admin system. All models are designed for single-company operations, eliminating multi-tenant complexity while maintaining data integrity and business logic.

## Core Entity Models

### User Model
```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatar?: string
  phone?: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager', 
  EMPLOYEE = 'employee'
}
```

**Database Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee',
  avatar TEXT,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

## Inventory Management Models

### Ingredient Model
```typescript
interface Ingredient {
  id: string
  name: string
  description?: string
  unit: IngredientUnit
  currentPrice: number
  currentStock: number
  minStock: number
  vendorId?: string
  category: IngredientCategory
  allergens: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

enum IngredientUnit {
  KILOGRAM = 'kg',
  GRAM = 'g',
  LITER = 'l',
  MILLILITER = 'ml',
  UNIT = 'unit',
  PACKAGE = 'package'
}

enum IngredientCategory {
  FLOUR = 'flour',
  SUGAR = 'sugar',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  FATS = 'fats',
  LEAVENING = 'leavening',
  FLAVORING = 'flavoring',
  NUTS = 'nuts',
  FRUITS = 'fruits',
  CHOCOLATE = 'chocolate',
  SPICES = 'spices',
  OTHER = 'other'
}
```

**Database Schema:**
```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  vendor_id UUID REFERENCES vendors(id),
  category VARCHAR(50) NOT NULL,
  allergens TEXT[], -- Array of allergen strings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_vendor ON ingredients(vendor_id);
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
```

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
  specialties: string[]
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

**Database Schema:**
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  vendor_type VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  cnpj VARCHAR(20),
  website VARCHAR(500),
  specialties TEXT[],
  payment_terms TEXT,
  delivery_days TEXT[],
  minimum_order DECIMAL(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
```

## Recipe Management Models

### Recipe Model
```typescript
interface Recipe {
  id: string
  name: string
  description?: string
  category: RecipeCategory
  servings: number
  preparationTime: number // minutes
  cookingTime: number // minutes
  totalTime: number // calculated field
  difficulty: RecipeDifficulty
  ingredients: RecipeIngredient[]
  instructions: RecipeStep[]
  notes?: string
  totalCost: number // calculated field
  costPerServing: number // calculated field
  laborCost: number // calculated field
  suggestedPrice: number // calculated field
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface RecipeIngredient {
  ingredientId: string
  ingredientName: string // denormalized for display
  quantity: number
  unit: string
  cost: number // calculated from current ingredient price
  notes?: string
}

interface RecipeStep {
  id: string
  stepNumber: number
  instruction: string
  timeMinutes: number
  notes?: string
}

enum RecipeCategory {
  CAKES = 'cakes',
  CUPCAKES = 'cupcakes',
  COOKIES = 'cookies',
  BREADS = 'breads',
  PASTRIES = 'pastries',
  ICINGS = 'icings',
  FILLINGS = 'fillings',
  OTHER = 'other'
}

enum RecipeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}
```

**Database Schema:**
```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1,
  preparation_time INTEGER NOT NULL DEFAULT 0, -- minutes
  cooking_time INTEGER NOT NULL DEFAULT 0, -- minutes
  total_time INTEGER GENERATED ALWAYS AS (preparation_time + cooking_time) STORED,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
  total_cost DECIMAL(10,2) DEFAULT 0,
  cost_per_serving DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  suggested_price DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  ingredient_name VARCHAR(255) NOT NULL, -- denormalized
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  time_minutes INTEGER DEFAULT 0,
  notes TEXT
);
```

## Customer Management Models

### Client Model
```typescript
interface Client {
  id: string
  type: ClientType
  firstName: string
  lastName: string
  companyName?: string
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
  label: string
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

**Database Schema:**
```sql
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

CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  is_preferred BOOLEAN DEFAULT false
);

CREATE TABLE related_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  birth_date DATE,
  notes TEXT
);

CREATE TABLE related_person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_person_id UUID REFERENCES related_persons(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(100),
  is_preferred BOOLEAN DEFAULT false
);

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
```

## Product Management Models

### Product Model
```typescript
interface Product {
  id: string
  name: string
  description?: string
  category: ProductCategory
  recipeId?: string
  variants: ProductVariant[]
  images: string[]
  tags: string[]
  isActive: boolean
  isCustomizable: boolean
  customizationOptions?: CustomizationOption[]
  createdAt: Date
  updatedAt: Date
}

interface ProductVariant {
  id: string
  size: string
  weight?: number
  servings?: number
  recipeMultiplier: number
  basePrice: number
  currentPrice: number
  isActive: boolean
}

interface CustomizationOption {
  id: string
  name: string
  type: CustomizationType
  options: string[]
  priceModifier: number // percentage or fixed amount
  isRequired: boolean
}

enum ProductCategory {
  CAKES = 'cakes',
  CUPCAKES = 'cupcakes',
  COOKIES = 'cookies',
  BREADS = 'breads',
  PASTRIES = 'pastries',
  SEASONAL = 'seasonal',
  CUSTOM = 'custom'
}

enum CustomizationType {
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  TEXT_INPUT = 'text_input',
  NUMBER_INPUT = 'number_input'
}
```

**Database Schema:**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  recipe_id UUID REFERENCES recipes(id),
  images TEXT[],
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_customizable BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(100) NOT NULL,
  weight DECIMAL(8,3),
  servings INTEGER,
  recipe_multiplier DECIMAL(8,3) NOT NULL DEFAULT 1,
  base_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE customization_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  options TEXT[],
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_required BOOLEAN DEFAULT false
);
```

## Order Management Models

### Order Model (Future Implementation)
```typescript
interface Order {
  id: string
  orderNumber: string
  clientId: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  discounts: OrderDiscount[]
  total: number
  notes?: string
  deliveryAddress?: ClientAddress
  deliveryDate?: Date
  deliveryTime?: string
  paymentMethod?: PaymentMethod
  paymentStatus: PaymentStatus
  createdAt: Date
  updatedAt: Date
}

interface OrderItem {
  id: string
  productId: string
  variantId: string
  quantity: number
  unitPrice: number
  customizations?: OrderCustomization[]
  specialInstructions?: string
  totalPrice: number
}

interface OrderCustomization {
  optionId: string
  optionName: string
  value: string
  priceModifier: number
}

interface OrderDiscount {
  id: string
  type: DiscountType
  description: string
  amount: number
  percentage?: number
}

enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PRODUCTION = 'in_production',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  BANK_TRANSFER = 'bank_transfer'
}

enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  REFUNDED = 'refunded'
}

enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_DELIVERY = 'free_delivery'
}
```

## Purchase Management Models

### Purchase Record Model
```typescript
interface PurchaseRecord {
  id: string
  vendorId: string
  purchaseDate: Date
  items: PurchaseItem[]
  subtotal: number
  taxes?: number
  shipping?: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  invoiceNumber?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface PurchaseItem {
  id: string
  ingredientId: string
  ingredientName: string // denormalized
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  expiryDate?: Date
  batchNumber?: string
}
```

**Database Schema:**
```sql
CREATE TABLE purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  purchase_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  taxes DECIMAL(10,2),
  shipping DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending',
  invoice_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_record_id UUID REFERENCES purchase_records(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  ingredient_name VARCHAR(255) NOT NULL, -- denormalized
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  batch_number VARCHAR(100)
);
```

## System Configuration Models

### Settings Model
```typescript
interface SystemSettings {
  id: string
  category: SettingsCategory
  key: string
  value: any
  description?: string
  isSystem: boolean
  updatedAt: Date
  updatedBy: string
}

interface RecipeSettings {
  laborHourRate: number // R$ per hour
  defaultMargin: number // percentage
  marginsByCategory: {
    [key in RecipeCategory]?: number
  }
}

interface BusinessSettings {
  name: string
  cnpj?: string
  address: VendorAddress
  phone: string
  email: string
  website?: string
  logo?: string
  currency: string
  timezone: string
  dateFormat: string
  workingDays: DeliveryDay[]
  workingHours: {
    start: string
    end: string
  }
}

enum SettingsCategory {
  BUSINESS = 'business',
  RECIPE = 'recipe',
  NOTIFICATION = 'notification',
  SYSTEM = 'system'
}
```

**Database Schema:**
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id),
  UNIQUE(category, key)
);

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_key ON system_settings(key);
```

## Audit and Activity Models

### Activity Log Model
```typescript
interface ActivityLog {
  id: string
  entityType: EntityType
  entityId: string
  action: ActivityAction
  userId: string
  userName: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

enum EntityType {
  USER = 'user',
  INGREDIENT = 'ingredient',
  RECIPE = 'recipe',
  VENDOR = 'vendor',
  CLIENT = 'client',
  PRODUCT = 'product',
  ORDER = 'order',
  PURCHASE = 'purchase'
}

enum ActivityAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout'
}
```

**Database Schema:**
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

## Data Validation and Constraints

### Brazilian Document Validation
```typescript
// CPF validation for individual clients
export const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/[^\d]/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  const digits = cleaned.split('').map(Number)
  const checkDigits = [
    calculateCPFDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]),
    calculateCPFDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  ]
  
  return digits[9] === checkDigits[0] && digits[10] === checkDigits[1]
}

// CNPJ validation for business clients and vendors
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/[^\d]/g, '')
  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  const digits = cleaned.split('').map(Number)
  const checkDigits = [
    calculateCNPJDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]),
    calculateCNPJDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  ]
  
  return digits[12] === checkDigits[0] && digits[13] === checkDigits[1]
}
```

### Database Constraints
```sql
-- Business logic constraints
ALTER TABLE ingredients ADD CONSTRAINT check_positive_price 
  CHECK (current_price >= 0);
  
ALTER TABLE ingredients ADD CONSTRAINT check_positive_stock 
  CHECK (current_stock >= 0 AND min_stock >= 0);

ALTER TABLE vendors ADD CONSTRAINT check_rating_range 
  CHECK (rating >= 0 AND rating <= 5);

ALTER TABLE recipes ADD CONSTRAINT check_positive_servings 
  CHECK (servings > 0);

ALTER TABLE recipes ADD CONSTRAINT check_positive_times 
  CHECK (preparation_time >= 0 AND cooking_time >= 0);

-- Brazilian state codes constraint
ALTER TABLE vendor_addresses ADD CONSTRAINT check_brazilian_state 
  CHECK (state IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
                   'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
                   'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'));

-- CEP format constraint
ALTER TABLE vendor_addresses ADD CONSTRAINT check_cep_format 
  CHECK (zip_code ~ '^[0-9]{5}-?[0-9]{3}$');
```

This comprehensive data models reference provides the foundation for implementing a robust, type-safe, and business-logic-compliant system for Momento Cake's bakery management operations.