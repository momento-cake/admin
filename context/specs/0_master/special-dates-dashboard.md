# Feature Plan: Special Dates Dashboard

**Feature Title**: Datas Especiais (Special Dates) Discovery Dashboard
**Slug**: `special-dates-dashboard`
**Platform**: Web (Next.js Admin Dashboard)
**Complexity**: Medium
**Priority**: Enhancement to Clientes module
**Timeline**: TBD

---

## 1. Feature Overview

### Problem Statement
Currently, there's no centralized view to discover upcoming client special dates (birthdays, anniversaries, custom dates) across the entire client base. This makes it difficult for sales/customer success teams to identify upsell opportunities proactively. Team members must manually check individual client records to find upcoming dates.

### Solution Overview
Create a dedicated **"Datas Especiais"** (Special Dates) discovery screen under the **Clientes** menu that displays all clients with special dates falling within a customizable time range. The default view shows:
- **Past 7 days**: Recently passed dates (for follow-ups)
- **Next 14 days**: Upcoming dates (for immediate action)

Users can expand the range by clicking "Load More" to see older dates (>7 days past) or further future dates (>14 days ahead).

### Business Goal
Enable proactive outreach and upsell opportunities by making it easy to identify clients with upcoming birthdays, anniversaries, and other special occasions.

### User Story
> As a sales/customer success team member, I want to see all clients with upcoming special dates (birthdays, anniversaries) so that I can identify upsell opportunities and reach out to customers for personalized offers.

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

#### 2.1 Date Range Display (Default View)
- [ ] Show special dates from **past 7 days** through **upcoming 14 days**
- [ ] Reference point is today's date (current date when page loads)
- [ ] Display dates regardless of year (e.g., birthday on 09/01/1996 shows on 09/01/2025)
- [ ] Include all date sources:
  - Special dates (birthday, anniversary, custom) from `client.specialDates`
  - Related person birthdates from `client.relatedPersons[].birthDate`
- [ ] Sort results by days from today (closest first)

#### 2.2 Load More Functionality
- [ ] Add "Load Earlier Dates" button to expand past range
  - Click 1: Show from -30 days to -7 days (dates >7 days in past)
  - Click 2: Show from -60 days to -30 days
  - Continue expanding until all historical dates are visible
- [ ] Add "Load Future Dates" button to expand future range
  - Click 1: Show from +14 to +30 days
  - Click 2: Show from +30 to +60 days
  - Continue expanding until no more dates exist
- [ ] Buttons should disappear when no more dates are available in that direction
- [ ] Loading indicator while fetching additional data

#### 2.3 Display Information Per Date Entry
For each special date, display:
- [ ] Client name (clickable, links to client details)
- [ ] Client ID or identifier (optional)
- [ ] Date type (Aniversário, Aniversário de Casamento, Aniversário da Empresa, Customizado, etc.)
- [ ] Number of days from today (e.g., "Em 5 dias", "Hoje!", "Há 3 dias")
- [ ] Actual date formatted as "DD de Mês de Yyyy" (e.g., "15 de março de 2025")
- [ ] Related person name if applicable (e.g., "→ João" for a related person's birthday)
- [ ] Optional: Notes field if present
- [ ] Date emoji/icon for visual distinction

#### 2.4 Performance & Optimization
- [ ] Implement pagination/lazy loading strategy for large datasets
- [ ] Fetch only necessary fields (client name, dates, minimal info)
- [ ] Cache results appropriately to minimize API calls
- [ ] Responsive design for mobile/desktop
- [ ] Loading states during data fetches

#### 2.5 Navigation Integration
- [ ] Add "Datas Especiais" submenu item under **Clientes** menu
- [ ] URL pattern: `/clients/special-dates`
- [ ] Include breadcrumb navigation
- [ ] Maintain consistent sidebar navigation

### Non-Functional Requirements
- [ ] No filtering or grouping functionality
- [ ] No export or reporting features
- [ ] Discovery tool only (read-only, no editing from this view)
- [ ] Performance optimized for 1000+ clients with 3000+ special dates

---

## 3. Data Model & Schema

### Source Data
All data sourced from existing Firestore `clients` collection:

```typescript
interface SpecialDateWithClient {
  // Date information
  dateId: string
  date: string // YYYY-MM-DD format (stored)
  type: 'birthday' | 'anniversary' | 'custom'
  description: string
  relatedPersonId?: string
  relatedPersonName?: string
  notes?: string

  // Client information
  clientId: string
  clientName: string
  clientType: 'person' | 'business'

  // Calculated fields
  daysFromToday: number
  displayDate: string // "15 de março de 2025"
  relativeDate: string // "Em 5 dias", "Hoje!", "Há 3 dias"
  yearOfDate: number // 2025, 2026, etc.
}
```

### Query Strategy
Firestore query approach:
1. Fetch all active clients with `specialDates` and `relatedPersons` arrays
2. Client-side filtering by date range (past 7 days to future 14 days by default)
3. Client-side sorting by days from today
4. Implement pagination/virtual scrolling for large result sets

---

## 4. Feature Architecture

### Components Structure

```
src/components/special-dates/
├── SpecialDatesPage.tsx              // Main page component
├── SpecialDatesList.tsx              // List container with pagination
├── SpecialDateCard.tsx               # Individual date entry card
└── LoadMoreButton.tsx                // Expand range buttons
```

### Page Layout
```
┌─────────────────────────────────────────┐
│ Clientes > Datas Especiais (breadcrumb) │
├─────────────────────────────────────────┤
│                                         │
│  Page Title: "Datas Especiais"         │
│  Description: "Birthdays and special   │
│  dates from your clients"              │
│                                         │
│  [Status Filter: All | Personal | Biz] │
│  [Sort: Days from today | Date | Name] │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ [ LOAD EARLIER DATES ]  (if available) │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎂 João da Silva              [→]  │ │
│ │ Aniversário | Há 2 dias            │ │
│ │ 13 de outubro de 2025             │ │
│ │ Notas: (if any)                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 💍 Maria dos Santos           [→]  │ │
│ │ Aniversário de Casamento | Em 5 d │ │
│ │ 20 de março de 2025               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ LOAD FUTURE DATES ]  (if available)  │
│                                         │
└─────────────────────────────────────────┘
```

### Data Flow
```
Page Load
  ↓
Fetch all active clients (with specialDates & relatedPersons)
  ↓
Transform & flatten data (convert to SpecialDateWithClient[])
  ↓
Filter by current date range (past 7 days to future 14 days)
  ↓
Sort by daysFromToday
  ↓
Display results with pagination
  ↓
User clicks "Load More" (past or future)
  ↓
Expand range client-side, re-filter, re-render
```

---

## 5. Implementation Tasks

### Phase 1: Foundation & Data Fetching
- [ ] **Task 1.1**: Create `fetchSpecialDatesForDashboard()` function in `src/lib/clients.ts`
  - Fetches all active clients with optimized field selection
  - Returns clients with only necessary data
  - Handle empty results gracefully

- [ ] **Task 1.2**: Create utility function `transformClientDatesToDashboardFormat()`
  - Converts raw client data to `SpecialDateWithClient[]` format
  - Handles both `specialDates` array and `relatedPersons.birthDate`
  - Calculates `daysFromToday`, `relativeDate`, `displayDate`
  - Filters by date range (accepts min/max date parameters)
  - Sorts by `daysFromToday`

- [ ] **Task 1.3**: Create `src/lib/special-dates-utils.ts` with helper functions:
  - `calculateDaysFromToday(dateString: string): number`
  - `getRelativeDateLabel(daysFromToday: number): string` (returns "Em 5 dias", "Hoje!", etc.)
  - `formatDisplayDate(dateString: string, year: number): string` (returns "15 de março de 2025")
  - `getDateTypeLabel(type: string): string` (returns localized type name)
  - `getDateTypeEmoji(type: string): string` (returns emoji)

### Phase 2: Component Creation
- [ ] **Task 2.1**: Create `src/components/special-dates/SpecialDateCard.tsx`
  - Display single date entry with all required information
  - Clickable client name links to client details
  - Show emoji, date type, days from today, formatted date
  - Optional: related person name if applicable
  - Optional: notes if present
  - Responsive design

- [ ] **Task 2.2**: Create `src/components/special-dates/LoadMoreButton.tsx`
  - "Load Earlier Dates" button for past dates
  - "Load Future Dates" button for future dates
  - Loading state during fetch
  - Disappears when no more dates available
  - Show count of additional dates available (optional)

- [ ] **Task 2.3**: Create `src/components/special-dates/SpecialDatesList.tsx`
  - Container component managing pagination state
  - Tracks current date range (past/future days)
  - Handles "Load More" clicks
  - Implements virtual scrolling or pagination
  - Shows loading/empty states
  - Renders SpecialDateCard for each entry

- [ ] **Task 2.4**: Create `src/app/(dashboard)/clients/special-dates/page.tsx`
  - Main page component
  - Integrate SpecialDatesList
  - Add breadcrumb navigation
  - Add page title and description
  - Handle error states

### Phase 3: Navigation Integration
- [ ] **Task 3.1**: Update sidebar navigation to add "Datas Especiais" submenu item
  - File: `src/components/navigation/SidebarNav.tsx` or equivalent
  - Link to `/clients/special-dates`
  - Active state highlighting
  - Proper menu organization under Clientes

- [ ] **Task 3.2**: Verify URL routing
  - Ensure route `/clients/special-dates` resolves correctly
  - Next.js dynamic routing setup

### Phase 4: Performance Optimization
- [ ] **Task 4.1**: Implement pagination/lazy loading strategy
  - Option A: Virtual scrolling (use `react-window` for 1000+ items)
  - Option B: Page-based pagination (load 50 items at a time)
  - Option C: Infinite scroll with Load More buttons
  - Recommendation: Use Load More buttons as per requirement (current approach)

- [ ] **Task 4.2**: Optimize Firestore query
  - Fetch only required fields: `id`, `name`, `type`, `specialDates`, `relatedPersons`
  - Implement field projection if Firestore Admin SDK supports it
  - Consider caching strategy (e.g., SWR/React Query)

- [ ] **Task 4.3**: Add loading indicators
  - Show skeleton loaders while fetching initial data
  - Show loading spinner when expanding date range

### Phase 5: Testing
- [ ] **Task 5.1**: Create E2E test for special dates dashboard
  - Test initial load (past 7 days + future 14 days)
  - Test "Load Earlier Dates" button (3 clicks)
  - Test "Load Future Dates" button (3 clicks)
  - Test client name navigation
  - Test responsive design

- [ ] **Task 5.2**: Create unit tests for utility functions
  - Test date calculations for various scenarios
  - Test relative date label generation
  - Test date formatting
  - Edge cases: leap years, year boundaries, dates far in past/future

### Phase 6: Documentation & Polish
- [ ] **Task 6.1**: Add inline code documentation
  - JSDoc comments for all functions
  - Explain date calculation logic

- [ ] **Task 6.2**: Create feature documentation
  - File: `docs/features/special-dates-dashboard.md`
  - Screenshots
  - Usage guide
  - Troubleshooting

---

## 6. Technical Specifications

### Date Calculation Logic
```typescript
// Example: Birthday stored as 1985-09-01 (September 1st, any year)
// Today: 2025-10-15

function calculateDaysFromToday(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Create date for current year
  let dateThisYear = new Date(today.getFullYear(), month - 1, day)
  dateThisYear.setHours(0, 0, 0, 0)

  // If date already passed, use next year
  if (dateThisYear < today) {
    dateThisYear = new Date(today.getFullYear() + 1, month - 1, day)
    dateThisYear.setHours(0, 0, 0, 0)
  }

  const diff = dateThisYear.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
```

### Date Range Expansion Strategy
```typescript
// Initial range: -7 to +14 days
// Load More Past: Expand by 30 days each click
// Load More Future: Expand by 30 days each click

interface DateRangeState {
  pastDays: number    // Starts at 7
  futureDays: number  // Starts at 14
}

// Click "Load Earlier"
pastDays = pastDays + 30  // 7 → 37 → 67 → 97 → ...

// Click "Load Future"
futureDays = futureDays + 30  // 14 → 44 → 74 → 104 → ...
```

### Pagination Strategy
For large datasets (1000+ clients):
- **Recommended**: Virtual scrolling using `react-window`
  - Renders only visible items
  - Handles 3000+ dates smoothly
  - Better performance than load more buttons alone

- **Alternative**: Keep Load More buttons as specified
  - Load 50-100 dates at a time
  - Add "Show more" indicator

---

## 7. Database & Performance

### Firestore Query
```typescript
// Main query (optimized)
const query = db.collection('clients')
  .where('isActive', '==', true)
  .select('id', 'name', 'type', 'specialDates', 'relatedPersons')
  .limit(1000) // Fetch in batches if needed
```

### Index Requirements
Current index structure supports sorting by `isActive` and `createdAt`. For this feature:
- No new indexes required
- Query is efficient (filtering and sorting handled client-side)
- Consider adding index for future pagination: `(isActive, createdAt)`

### Caching Strategy
```typescript
// Use SWR or React Query for caching
const { data, error, isLoading } = useSWR(
  'special-dates-dashboard',
  fetchSpecialDatesForDashboard,
  {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000 // Cache for 1 minute
  }
)
```

---

## 8. UI/UX Specifications

### Date Card Design
- Card with subtle shadow/border
- Left side: Emoji (20px) or icon
- Middle: Client name (bold, clickable), date type, relative date
- Right side: Arrow icon (→) for navigation
- Hover state: Slight elevation, cursor pointer
- Responsive: Stack on mobile, single row on desktop

### Color/Styling
- Use existing Shadcn UI components for consistency
- Color scheme:
  - Birthday (🎂): Blue/Teal accent
  - Anniversary (💍): Pink/Red accent
  - Custom (📅): Gray accent
- Text hierarchy:
  - Client name: 16px bold
  - Date type: 12px medium
  - Relative date: 12px regular (secondary color)
  - Formatted date: 12px regular (tertiary color)

### Empty States
- No dates in range: "Nenhuma data especial encontrada neste período"
- Loading: Skeleton loaders
- Error: "Erro ao carregar datas. Tente novamente"

### Accessibility
- Semantic HTML (button, link elements)
- ARIA labels for buttons
- Keyboard navigation support
- Sufficient color contrast

---

## 9. Validation & Testing

### Test Scenarios

#### E2E Tests
1. **Initial Load**
   - Page loads with past 7 days + future 14 days
   - Correct number of dates displayed
   - Dates sorted by days from today
   - Load buttons present/hidden appropriately

2. **Load Earlier Dates**
   - Click "Load Earlier" button
   - Verify new dates appear (7-37 days in past)
   - Verify button remains available or disappears
   - Repeat 3 times to test cumulative expansion

3. **Load Future Dates**
   - Click "Load Future" button
   - Verify new dates appear (14-44 days in future)
   - Verify button remains available or disappears
   - Repeat 3 times to test cumulative expansion

4. **Navigation**
   - Click client name → Navigate to client details
   - Verify client details page loads correctly

5. **Responsive Design**
   - Test on mobile (375px), tablet (768px), desktop (1920px)
   - Layout adjusts correctly
   - Touch targets are adequate (48px minimum)

#### Unit Tests
1. Date calculation edge cases:
   - Birthday in 3 days → "Em 3 dias"
   - Birthday today → "Hoje!"
   - Birthday 2 days ago → "Há 2 dias"
   - Birthday 1 year ago → Correctly calculated next occurrence
   - Leap year dates (Feb 29) → Handle correctly

2. Date formatting:
   - Portuguese month names
   - Correct year (current or next year)
   - ISO date string parsing

3. Data transformation:
   - Special dates included
   - Related person birthdates included
   - Missing data handled gracefully

### Edge Cases
- [ ] Clients with no special dates
- [ ] Clients with multiple special dates
- [ ] Related persons with birthdates but no special dates
- [ ] Dates stored with different years (1985 vs 2020)
- [ ] Leap year dates (Feb 29)
- [ ] Large client base (1000+)
- [ ] Slow network conditions

---

## 10. Acceptance Criteria

### Implementation Complete When:
- [ ] Page accessible at `/clients/special-dates`
- [ ] Sidebar navigation includes "Datas Especiais" under Clientes
- [ ] Initial load shows past 7 days + future 14 days
- [ ] Dates sorted by proximity to today (ascending days)
- [ ] Each date shows: client name, type, days from today, formatted date, optional notes
- [ ] Client names are clickable, navigate to client details
- [ ] "Load Earlier Dates" button expands past range by 30 days (repeatable)
- [ ] "Load Future Dates" button expands future range by 30 days (repeatable)
- [ ] Buttons disappear when no more dates exist in that direction
- [ ] Loading states visible during data fetch
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] E2E tests passing (initial load, load more, navigation)
- [ ] Unit tests passing (date calculations, formatting)
- [ ] Handles 1000+ clients efficiently
- [ ] Documentation complete

---

## 11. Success Metrics

- **Adoption**: Team members use the feature for identifying upsell opportunities
- **Performance**: Page loads in < 2 seconds for 1000+ clients
- **User Satisfaction**: Zero complaints about UX or missing functionality
- **Upsell Impact**: Track number of opportunities identified through this feature (optional future analytics)

---

## 12. Future Enhancements (Out of Scope)

- [ ] Email notifications for upcoming dates
- [ ] Export/CSV download functionality
- [ ] Date type filtering (show only birthdays, exclude anniversaries, etc.)
- [ ] Client status filtering (active/inactive)
- [ ] Bulk actions (e.g., send email to all with upcoming dates)
- [ ] Integration with CRM or email marketing platform
- [ ] Analytics: most common special date types, upcoming dates by month

---

## 13. References & Context

### Related Files
- `src/types/client.ts` - Client data types
- `src/lib/clients.ts` - Client queries and utilities
- `src/components/clients/SpecialDatesSection.tsx` - Existing special dates component
- `src/components/clients/RelatedPersonsSection.tsx` - Related persons component
- `firestore.indexes.json` - Database indexes
- `firestore.rules` - Security rules

### Navigation Patterns
- URL format: Subpath-based (`/clients/special-dates`)
- Menu structure: Clientes > Datas Especiais
- Breadcrumb: Clientes > Datas Especiais

### Existing Patterns to Follow
- Component organization in `src/components/`
- Use Shadcn UI components for consistency
- TypeScript for type safety
- Firestore queries with proper error handling
- Firebase Auth for access control (verify user is authenticated)

---

## 14. Next Steps

1. **Review & Approval**: Share plan with stakeholders for feedback
2. **Begin Phase 1**: Create data fetching functions and utilities
3. **Continue Sequentially**: Follow implementation tasks in order
4. **Testing**: Run tests after each phase
5. **Documentation**: Update docs and deployment guide

---

**Plan Created**: October 29, 2025
**Status**: Ready for Implementation
**Clarifications Applied**: All Phase 1 questions answered and documented
