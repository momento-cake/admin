# Client CRUD Feature - Quick Start Guide

## 🎯 What Was Built

A complete Client Management System (CRUD) for the Momento Cake Admin Dashboard that handles:
- **Personal Clients** (individual customers)
- **Business Clients** (companies)
- Multiple contact methods per client
- Client information management
- Search and filtering

## 📍 Where Everything Is

### Core Implementation
| Component | Location | Purpose |
|-----------|----------|---------|
| Types | `src/types/client.ts` | TypeScript interfaces |
| Validation | `src/lib/validators/client.ts` | Zod schemas |
| Database Ops | `src/lib/clients.ts` | Firestore CRUD |
| API Routes | `src/app/api/clients/` | REST endpoints |
| Pages | `src/app/(dashboard)/clients/` | UI pages |
| Tests | `tests/clients/` | E2E tests |

### Navigation
- **Menu**: Sidebar → "Clientes" → "Listagem" or "Novo Cliente"
- **URL**: `/clients` (list), `/clients/new` (create), `/clients/[id]` (detail)

## 🚀 Quick Reference

### API Endpoints
```
GET    /api/clients                    # List clients
POST   /api/clients                    # Create client
GET    /api/clients/[id]               # Get one
PUT    /api/clients/[id]               # Update
DELETE /api/clients/[id]               # Delete (soft)
POST   /api/clients/[id]/restore       # Restore
```

### Main Pages
```
/clients              → List page (search, filter, pagination)
/clients/new         → Create new client form
/clients/[id]        → View client details
/clients/[id]/edit   → Edit client information
```

### Database Structure
```
Firestore Collection: clients
├── id (string)
├── type (person | business)
├── name (string)
├── email (string)
├── cpfCnpj (string)
├── phone (string)
├── contactMethods (array)
│   ├── id, type, value, isPrimary, notes
├── address (object)
│   ├── cep, estado, cidade, bairro, endereco, numero, complemento
├── notes (string)
├── companyInfo (business only)
│   ├── cnpj, companyName, businessType
├── representative (business only)
│   ├── name, email, phone, role, cpf
└── Metadata: isActive, createdAt, updatedAt, createdBy, lastModifiedBy
```

## 🧪 Testing

### Run Tests
```bash
# All client tests
npx playwright test tests/clients/

# Specific test
npx playwright test tests/clients/client-management.spec.ts -g "create personal"

# See browser
npx playwright test tests/clients/ --headed

# Interactive UI
npx playwright test tests/clients/ --ui

# View results
npx playwright show-report test-results/clients
```

### Test Scenarios Covered
✅ Create personal client
✅ Create business client
✅ Search clients
✅ Filter by type
✅ View details
✅ Edit client
✅ Delete client
✅ Validation errors
✅ Pagination

## 📝 Key Files to Know

### Types & Validation
```typescript
// Imports
import { Client, ClientType } from '@/types/client'
import { createClientSchema } from '@/lib/validators/client'

// Using types
const client: Client = {...}
const isPersonal = client.type === 'person'
```

### Database Operations
```typescript
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient
} from '@/lib/clients'

// Fetch with filters
const response = await fetchClients({
  searchQuery: 'name',
  type: 'person',
  page: 1,
  limit: 20
})

// Create client
const newClient = await createClient({
  type: 'person',
  name: 'João Silva',
  contactMethods: [...]
})
```

### API Usage
```typescript
// Frontend
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(clientData)
})

const result = await response.json()
if (result.success) {
  console.log('Created:', result.data)
}
```

## 🔍 Common Tasks

### Add a New Client Field
1. Update type in `src/types/client.ts`
2. Add validation in `src/lib/validators/client.ts`
3. Update form in `src/app/(dashboard)/clients/new/page.tsx`
4. Update detail view in `src/app/(dashboard)/clients/[id]/page.tsx`
5. Update edit page in `src/app/(dashboard)/clients/[id]/edit/page.tsx`
6. Test in E2E: `tests/clients/client-management.spec.ts`

### Change Search Behavior
- Edit `fetchClients()` in `src/lib/clients.ts`
- Test in `src/app/(dashboard)/clients/page.tsx` (search functionality)

### Add New Contact Method Type
1. Update enum in `src/types/client.ts`: `type ContactMethodType = '...' | 'newtype'`
2. Update validation in `src/lib/validators/client.ts`
3. Add option to select in forms

### Modify Validation Rules
- Edit schemas in `src/lib/validators/client.ts`
- Both client-side and server-side will use same rules (Zod)
- Error messages display automatically

## ⚙️ Build & Deploy

### Build
```bash
npm run build
# ✓ Compiled successfully in ~3s
```

### Development
```bash
npm run dev
# App runs on http://localhost:3001
```

### Type Check
```bash
npm run type-check
# Verifies all TypeScript types
```

## 📊 Metrics

- **6 API Endpoints** fully functional
- **4 Page Routes** for CRUD operations
- **15+ Type Definitions** for strong typing
- **8+ Zod Schemas** for validation
- **10+ E2E Test Cases** for quality assurance
- **3,500+ Lines** of implementation code
- **0 Build Errors** (only pre-existing warnings)

## 🚨 Important Notes

### Required Firestore Indexes
For optimal performance, create these indexes:
```
Index 1: type (Asc), isActive (Asc), createdAt (Desc)
Index 2: isActive (Asc), createdAt (Desc)
Index 3: type (Asc), createdAt (Desc)
```

### Default Pagination
- Page size: 20 clients
- Maximum: 100 clients per page
- Implements offset-based pagination

### Soft Delete
- Deleted clients marked as inactive (`isActive: false`)
- Not shown in regular list views
- Can be restored via `/api/clients/[id]/restore`

### Validation
- Real-time client-side (react-hook-form)
- Server-side (Zod schemas)
- Unique CPF/CNPJ enforcement
- Required field validation

## 📚 Documentation

- **Full Details**: `docs/features/CLIENT_CRUD_IMPLEMENTATION.md`
- **Master Plan**: `context/specs/0_master/client-crud.md`
- **Test Docs**: `tests/clients/README.md`

## 🎓 Learning Path

1. **Start**: Read this quick start
2. **Types**: Check `src/types/client.ts`
3. **API**: Look at `src/lib/clients.ts`
4. **Routes**: Review `src/app/api/clients/`
5. **UI**: Explore page components
6. **Tests**: Study E2E test cases

## ✨ Features Implemented

### Core CRUD
- ✅ Create personal & business clients
- ✅ Read client details
- ✅ Update all client info
- ✅ Soft delete clients
- ✅ Restore deleted clients

### User Experience
- ✅ Search by name/email/phone
- ✅ Filter by client type
- ✅ Pagination controls
- ✅ Form validation
- ✅ Error messages
- ✅ Loading states

### Data Management
- ✅ Multiple contact methods
- ✅ Address management
- ✅ Notes & preferences
- ✅ Type-safe operations
- ✅ Unique constraint enforcement

## 🔮 Next Steps (Phase 6+)

- Related persons management
- Special dates tracking
- Sales platform integration
- Bulk import/export
- Advanced filtering
- Communication history

## 💡 Tips

1. **Test New Features**: Use E2E tests as documentation
2. **Type Safety**: Leverage TypeScript for compile-time checks
3. **Validation**: Zod schemas prevent bad data early
4. **Reusability**: API operations can be used across platforms
5. **Extensibility**: Add fields easily with existing patterns

## 🆘 Troubleshooting

### Build Fails
- Check Node version (need 18+)
- Clear `.next` folder: `rm -rf .next`
- Reinstall: `npm install`

### Tests Don't Run
- Ensure app running on port 3001
- Check test config in `tests/clients/playwright.config.ts`
- Verify login credentials in test file

### Form Validation Fails
- Check error messages in console
- Verify schema in `src/lib/validators/client.ts`
- Test API directly with curl or Postman

### Database Issues
- Verify Firestore connection
- Check security rules allow read/write
- Ensure document structure matches types

## 📞 Support

For detailed questions:
1. Check the full documentation files
2. Review test cases for examples
3. Examine type definitions for structure
4. Look at existing implementations in suppliers/ingredients

---

**Status**: ✅ Complete and Ready to Use
**Last Updated**: 2025-10-25
**Maintainer**: Momento Cake Admin Team
