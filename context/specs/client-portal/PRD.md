# PRD: Client Order Portal Enhancement

## Metadata
- **Scope**: client-portal
- **Type**: Feature
- **Complexity**: Medium-High
- **Status**: Planning

## Problem Statement

Currently, the public order page (`/pedido/[token]`) shows basic order info but lacks:
1. **No confirmation flow** -- clients cannot confirm their orders online
2. **No product images** -- items display text only, no visual reference
3. **No status-based access control** -- any token works regardless of order status
4. **No subdomain routing** -- the portal is only accessible via the main admin URL
5. **No share mechanism** -- admins have no quick way to share the order link with clients

## Solution

Enhance the existing public order page to become a branded Client Order Portal that:
- Shows order details with product images, prices, delivery info, and notes
- Allows clients to confirm orders (AGUARDANDO_APROVACAO -> CONFIRMADO)
- Restricts access based on order status (only AGUARDANDO_APROVACAO and CONFIRMADO)
- Supports subdomain routing (pedidos.momentocake.com.br)
- Provides admins with a Share button to copy/send the order link

## Existing Code Inventory

### Files to Modify
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Add subdomain detection for pedidos.momentocake.com.br |
| `src/app/api/public/pedidos/[token]/route.ts` | Add status-based access control, include product image URLs |
| `src/components/public/PublicPedidoView.tsx` | Enhance UI with images, confirm button, branded design |
| `src/app/(public)/pedido/[token]/page.tsx` | Handle status-based error states from API |
| `src/components/pedidos/PedidoDetailView.tsx` | Add Share button in header area |

### Files to Create
| File | Purpose |
|------|---------|
| `src/app/api/public/pedidos/[token]/confirmar/route.ts` | POST endpoint to confirm order |
| `src/components/pedidos/ShareOrderButton.tsx` | Share button with copy-to-clipboard + WhatsApp |

### Existing Patterns to Follow
| Pattern | Reference File |
|---------|---------------|
| Public API route | `src/app/api/public/pedidos/[token]/route.ts` |
| Public component types | `src/components/public/PublicPedidoView.tsx` (lines 8-89) |
| Toast notifications | `import { toast } from 'sonner'` (used throughout settings components) |
| Status badges | `src/components/pedidos/PedidoStatusBadge.tsx` |
| Price formatting | `formatCurrency()` in PublicPedidoView.tsx (line 97) |
| Firestore admin queries | `import { adminDb } from '@/lib/firebase-admin'` |
| Pedido types/labels | `src/types/pedido.ts` |

### Key Data Structures

**PedidoItem** (src/types/pedido.ts:67-75):
```typescript
interface PedidoItem {
  id: string;
  produtoId?: string | null;  // Links to products collection
  nome: string;
  descricao?: string;
  precoUnitario: number;
  quantidade: number;
  total: number;
}
```

**Product** (src/types/product.ts:39-100):
- No image field on Product type -- products don't store images directly
- For Phase 2, we'll add an optional `imageUrl` to `PublicPedidoItem` and resolve it server-side from PedidoItem data or skip if unavailable

**Pedido.publicToken** (src/types/pedido.ts:137):
- Already exists and is generated at order creation
- Used as the URL slug: `/pedido/{publicToken}`

**PedidoStatus** (src/types/pedido.ts:12-19):
```
RASCUNHO | AGUARDANDO_APROVACAO | CONFIRMADO | EM_PRODUCAO | PRONTO | ENTREGUE | CANCELADO
```

---

## Phase 1: Middleware + API

### 1.1 Subdomain Detection in Middleware

**File**: `src/middleware.ts`

**Changes**:
Add subdomain detection at the top of the `middleware()` function, before the existing pathname checks. When the request host is `pedidos.momentocake.com.br`, rewrite to `/pedido/*` paths.

**Logic**:
```
1. Extract hostname from request
2. If hostname === 'pedidos.momentocake.com.br':
   a. If pathname === '/' or pathname === '', return 404 or redirect to main site
   b. If pathname starts with '/pedido/', allow through (already correct)
   c. If pathname is '/{token}' (single segment, no /pedido/ prefix), rewrite to /pedido/{token}
   d. For all other paths, return 404
3. In development (localhost:4000), skip subdomain logic -- everything works as-is
```

**Important**: The middleware must NOT break existing `/pedido/[token]` access from the main domain. Both paths must work:
- `momentocake.com.br/pedido/{token}` (existing)
- `pedidos.momentocake.com.br/{token}` (new subdomain shorthand)

### 1.2 Status-Based Access Control on GET

**File**: `src/app/api/public/pedidos/[token]/route.ts`

**Changes**:
After fetching the pedido (line 49), add a status check before building the response:

```typescript
const allowedStatuses: PedidoStatus[] = ['AGUARDANDO_APROVACAO', 'CONFIRMADO'];
if (!allowedStatuses.includes(data.status)) {
  return NextResponse.json(
    { success: false, error: 'Este pedido nao esta mais disponivel para visualizacao' },
    { status: 403 }
  );
}
```

**Also add** the `imageUrl` field to the response items. For each item in the active orcamento that has a `produtoId`, look up the product name but do NOT fetch images from the gallery system (no product-image relationship exists). Instead, simply pass through item data as-is. Product images are DEFERRED until a product-image association is added to the data model.

### 1.3 POST /api/public/pedidos/[token]/confirmar

**File**: `src/app/api/public/pedidos/[token]/confirmar/route.ts` (NEW)

**Endpoint**: `POST /api/public/pedidos/{token}/confirmar`

**Logic**:
1. Validate token (same as GET)
2. Find pedido by publicToken + isActive
3. Check status is exactly `AGUARDANDO_APROVACAO`
   - If not, return 400: "Este pedido nao pode ser confirmado no status atual"
4. Update pedido status to `CONFIRMADO` + set `updatedAt`
5. Return success with updated public pedido data

**Response**:
```json
{ "success": true, "data": { "status": "CONFIRMADO", ... } }
```

### 1.4 Tests for Phase 1

**Test File**: `src/__tests__/api/public/pedidos/public-pedidos-api.test.ts` (NEW)

**Test Cases**:
1. GET returns 403 for RASCUNHO status orders
2. GET returns 403 for CANCELADO status orders
3. GET returns 200 for AGUARDANDO_APROVACAO orders
4. GET returns 200 for CONFIRMADO orders
5. GET returns 404 for non-existent tokens
6. GET returns 400 for invalid tokens (< 10 chars)
7. POST confirmar returns 200 and updates status for AGUARDANDO_APROVACAO
8. POST confirmar returns 400 for CONFIRMADO orders (already confirmed)
9. POST confirmar returns 400 for RASCUNHO orders
10. POST confirmar returns 404 for non-existent tokens

**Test File**: `src/__tests__/middleware/subdomain.test.ts` (NEW)

**Test Cases**:
1. pedidos.momentocake.com.br/{token} rewrites to /pedido/{token}
2. pedidos.momentocake.com.br/ returns 404 or redirect
3. Regular domain requests pass through unchanged
4. localhost:4000 requests pass through unchanged
5. Existing /pedido/{token} path on main domain still works

### Phase 1 Dependencies
- None (this is the foundation)

---

## Phase 2: Enhanced PublicPedidoView UI

### 2.1 Update PublicPedidoView Component

**File**: `src/components/public/PublicPedidoView.tsx`

**Changes**:

#### A. Update PublicPedidoData type (lines 77-89)
No type changes needed for now. The `observacoesCliente` field already exists.

#### B. Remove the Progress Indicator (lines 159-216)
Replace the 3-step progress (Itens/Entrega/Pagamento) with a simpler status-aware display since this is now a "view + confirm" portal, not a multi-step wizard.

#### C. Enhanced Items Display (lines 228-299)
Update the items list to show:
- Larger text for item names
- Item description if present
- Quantity x unit price breakdown
- Line totals
- (Product images deferred -- no product-image relationship in data model yet)

#### D. Add "Confirmar Pedido" Button
- Only visible when `pedido.status === 'AGUARDANDO_APROVACAO'`
- Calls `POST /api/public/pedidos/{token}/confirmar`
- Shows loading state during API call
- On success: updates local pedido state to show CONFIRMADO status
- On error: shows error message

**Button design**:
```
Full-width rose-500 button at the bottom of the page
Text: "Confirmar Pedido"
Loading: spinner + "Confirmando..."
```

#### E. Confirmed State Display
When `pedido.status === 'CONFIRMADO'`:
- Show a success banner at the top: "Pedido Confirmado!"
- Replace the confirm button with a green checkmark + "Pedido confirmado" text
- All order details remain visible (read-only)

#### F. Delivery/Pickup Info Section
The existing `PublicEntregaToggle` handles delivery/pickup toggle interactively. For the portal, we should:
- Show the delivery/pickup info as **read-only** when status is CONFIRMADO
- Keep it interactive only for AGUARDANDO_APROVACAO status
- Display the delivery date (`dataEntrega`) prominently

#### G. Client-Visible Notes
The `observacoesCliente` section already renders (lines 321-326). Keep as-is.

#### H. Mobile Responsive
The existing design is already mobile-first with `max-w-2xl mx-auto`. Maintain this pattern.

### 2.2 Update Page Component

**File**: `src/app/(public)/pedido/[token]/page.tsx`

**Changes**:
- Handle new error states from API (403 for restricted status)
- Show a specific message for 403: "Este pedido nao esta disponivel para visualizacao"
- Different from 404 (pedido not found)

### 2.3 Tests for Phase 2

**Test File**: `src/__tests__/components/public/PublicPedidoView.test.tsx` (NEW)

**Test Cases**:
1. Renders order items with names, quantities, prices
2. Shows "Confirmar Pedido" button for AGUARDANDO_APROVACAO status
3. Does NOT show confirm button for CONFIRMADO status
4. Shows confirmed success banner for CONFIRMADO orders
5. Confirm button calls API and updates state on success
6. Shows error message on confirm failure
7. Shows loading state during confirmation
8. Shows delivery info for ENTREGA orders
9. Shows pickup info for RETIRADA orders
10. Shows client notes when observacoesCliente is present
11. Does not show notes section when observacoesCliente is null
12. Renders branded header with Momento Cake logo
13. Shows delivery date when dataEntrega is present
14. Formats prices in BRL currency

**Test File**: `src/__tests__/app/public/pedido-page.test.tsx` (NEW)

**Test Cases**:
1. Shows loading state while fetching
2. Shows error message for 404 responses
3. Shows restricted access message for 403 responses
4. Renders PublicPedidoView on successful fetch

### Phase 2 Dependencies
- Phase 1 (API must return status-based access control; confirmar endpoint must exist)

---

## Phase 3: Admin Share Button

### 3.1 ShareOrderButton Component

**File**: `src/components/pedidos/ShareOrderButton.tsx` (NEW)

**Props**:
```typescript
interface ShareOrderButtonProps {
  publicToken: string;
  pedidoStatus: PedidoStatus;
  clienteNome: string;
  numeroPedido: string;
}
```

**Visibility**: Only render when `pedidoStatus === 'AGUARDANDO_APROVACAO'`

**UI Design**:
A dropdown button (using shadcn DropdownMenu):
- Main button: "Compartilhar" with Share icon
- Dropdown items:
  1. "Copiar Link" -- copies `https://pedidos.momentocake.com.br/{publicToken}` to clipboard, shows toast "Link copiado!"
  2. "Enviar via WhatsApp" -- opens `https://wa.me/?text={encodedMessage}` in new tab
    - Message: `Ola {clienteNome}! Seu pedido {numeroPedido} da Momento Cake esta pronto para revisao. Acesse aqui: {url}`

### 3.2 Integrate into PedidoDetailView

**File**: `src/components/pedidos/PedidoDetailView.tsx`

**Changes**:
Add the `ShareOrderButton` in the header card (around line 154), next to the total price display. Only visible when status is AGUARDANDO_APROVACAO.

```tsx
// After the total price display, before </div> closing the right column
{pedido.status === 'AGUARDANDO_APROVACAO' && (
  <ShareOrderButton
    publicToken={pedido.publicToken}
    pedidoStatus={pedido.status}
    clienteNome={pedido.clienteNome}
    numeroPedido={pedido.numeroPedido}
  />
)}
```

### 3.3 Also Add to Order Detail Page Header

**File**: `src/app/(dashboard)/orders/[id]/page.tsx`

Consider adding the share button next to the "Editar" button (line 80-86) for quick access. This provides two access points:
1. In the detail view header card (via PedidoDetailView)
2. In the page-level action buttons

Recommendation: Only add in PedidoDetailView to avoid duplication. The detail view already shows the status, so it's the natural place.

### 3.4 Tests for Phase 3

**Test File**: `src/__tests__/components/pedidos/ShareOrderButton.test.tsx` (NEW)

**Test Cases**:
1. Renders share button for AGUARDANDO_APROVACAO status
2. Does not render for other statuses
3. Copy link copies correct URL to clipboard
4. Shows toast after copying
5. WhatsApp link opens correct URL with encoded message
6. WhatsApp message includes client name and order number

**Test File**: `src/__tests__/components/pedidos/PedidoDetailView-share.test.tsx` (NEW)

**Test Cases**:
1. Shows ShareOrderButton when pedido is AGUARDANDO_APROVACAO
2. Does not show ShareOrderButton for CONFIRMADO pedidos
3. Does not show ShareOrderButton for RASCUNHO pedidos

### Phase 3 Dependencies
- Phase 1 (needs the confirmar API to exist for the status flow to make sense)
- Phase 2 (the portal must be functional before sharing links)

---

## Phase 4: E2E Tests

### 4.1 Playwright Tests

**Test File**: `tests/client-portal.spec.ts` (NEW)

**Test Scenarios**:

#### Portal Access Tests
1. Visit /pedido/{token} for an AGUARDANDO_APROVACAO order -- page loads with order details
2. Visit /pedido/{token} for a CONFIRMADO order -- page loads with confirmed state
3. Visit /pedido/{token} for a RASCUNHO order -- shows "not available" message
4. Visit /pedido/{token} for a CANCELADO order -- shows "not available" message
5. Visit /pedido/{invalidToken} -- shows "not found" message

#### Order Confirmation Flow
6. Visit AGUARDANDO_APROVACAO order -- see confirm button
7. Click "Confirmar Pedido" -- order status changes to CONFIRMADO
8. After confirmation -- confirm button replaced with success message
9. Refresh page -- still shows CONFIRMADO state

#### Content Display Tests
10. Order items display with names, quantities, prices
11. Delivery info shows for ENTREGA orders
12. Pickup info shows for RETIRADA orders
13. Client notes display when present
14. Totals calculate correctly (subtotal, discounts, freight)

#### Admin Share Tests (requires login)
15. Login as admin, navigate to AGUARDANDO_APROVACAO order
16. Click Share dropdown -- see "Copiar Link" and "WhatsApp" options
17. Click "Copiar Link" -- verify toast appears
18. Share button NOT visible for CONFIRMADO orders

### 4.2 Test Setup

**File**: `tests/helpers/pedido-fixtures.ts` (NEW)

Create test fixtures:
- A pedido in AGUARDANDO_APROVACAO status with items, delivery, notes
- A pedido in CONFIRMADO status
- A pedido in RASCUNHO status

These may need to be created via the admin API or direct Firestore seeding before tests run.

### Phase 4 Dependencies
- Phase 1, 2, 3 (all features must be implemented before E2E testing)

---

## URL Construction

The share URL should be constructed as:
```typescript
const getPortalUrl = (publicToken: string): string => {
  if (process.env.NEXT_PUBLIC_PORTAL_DOMAIN) {
    return `https://${process.env.NEXT_PUBLIC_PORTAL_DOMAIN}/${publicToken}`;
  }
  // Fallback to current origin + /pedido/ path
  return `${window.location.origin}/pedido/${publicToken}`;
};
```

**Environment Variable**: `NEXT_PUBLIC_PORTAL_DOMAIN=pedidos.momentocake.com.br`

This allows:
- Production: `https://pedidos.momentocake.com.br/{token}`
- Development: `http://localhost:4000/pedido/{token}`

---

## Out of Scope (DEFERRED)

1. **Payment integration** -- no payment processing or payment status on portal
2. **Product images** -- Product type has no image field; requires data model change first
3. **PDF generation** -- no PDF export of orders
4. **Email notifications** -- no automatic email when order is confirmed
5. **Order editing by client** -- client can only confirm, not modify items
6. **Multiple confirmation steps** -- single confirm action only

---

## Acceptance Criteria

### Functional
- [ ] Client can view order details via public link (items, prices, delivery, notes)
- [ ] Client can confirm order (AGUARDANDO_APROVACAO -> CONFIRMADO)
- [ ] Confirmed orders show success state, no re-confirmation possible
- [ ] Orders in other statuses (RASCUNHO, CANCELADO, etc.) return "not available"
- [ ] Subdomain pedidos.momentocake.com.br/{token} works in production
- [ ] Main domain /pedido/{token} continues to work
- [ ] Admin can share order link via copy-to-clipboard or WhatsApp
- [ ] Share button only visible for AGUARDANDO_APROVACAO orders

### Technical
- [ ] All API changes have unit tests with 90%+ coverage
- [ ] All component changes have component tests
- [ ] E2E tests cover critical flows (view, confirm, share)
- [ ] No breaking changes to existing functionality
- [ ] Mobile responsive (existing pattern maintained)
- [ ] Toast notifications use sonner (existing pattern)
