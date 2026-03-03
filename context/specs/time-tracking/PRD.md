# PRD: Time Tracking System (Controle de Ponto)

## Metadata
- **Scope**: time-tracking
- **Type**: Feature
- **Complexity**: High
- **Priority**: High
- **Estimated Phases**: 9
- **Legal Framework**: CLT + Portaria 671/2021 + CCT Panificação SP 2025/2026

---

## 1. Problem Statement

Momento Cake currently has no way to track employee work hours. Production employees (Produção) need a compliant time tracking system for:
- Legal compliance with Brazilian labor laws (CLT Art. 74, Portaria 671)
- Accurate salary calculation based on hourly rates
- Overtime, night shift, and rest day premium calculations per CCT SP
- Audit trail for manual edits (required by Portaria 671)
- Employee self-service access to their own time records

## 2. Solution Overview

Build a **REP-P (Registro Eletrônico de Ponto por Programa)** compliant time tracking system integrated into the Momento Cake Admin dashboard with:

1. **New user role**: `producao` with access to time tracking + dashboard (read-only)
2. **Clock in/out** with geolocation capture (recorded but not enforced)
3. **Employee view**: Personal clock widget, calendar view (day/week/month), timeline
4. **Admin view**: All employees overview, manual edit capability, payroll reports
5. **Payroll calculations**: Hora extra (55%), adicional noturno (37%), DSR, repouso (100%)
6. **Compliance**: Digital comprovante, audit trail, export capabilities

---

## 3. Legal Compliance Requirements

### 3.1 CLT + Portaria 671/2021
- **Portaria 671 REP-P**: Software-based time tracking on computers/mobile devices
- **Digital comprovante**: Must emit receipt after each clock marking (PDF)
- **48-hour access**: Employees must access records from last 48 hours minimum
- **AFD (Arquivo Fonte de Dados)**: Audit file generation capability
- **Manual edits**: Only for corrections, with full audit trail
- **Data integrity**: CRC-16/SHA-256 checksums on audit files

### 3.2 CCT Panificação e Confeitaria SP 2025/2026 (MR051146/2025)

**Vigência**: 01/11/2025 a 31/10/2026

| Rule | Clause | Value |
|------|--------|-------|
| Salário Normativo (≤60 emp) | Cláusula 3ª | R$ 2.130,40/mês ou R$ 9,68/hora |
| Hora Extra | Cláusula 12ª | **55%** sobre hora normal |
| Adicional Noturno (22h-05h) | Cláusula 14ª | **37%** sobre hora diurna |
| Trabalho em Dia de Repouso | Cláusula 5ª | **100%** (sem folga compensatória) |
| Trabalho em Dia de Eleição | Cláusula 15ª | **100%** ou folga em 30 dias |
| Intervalo Intrajornada | Cláusula 35ª | **30 min** mínimo permitido |
| Intervalo Interjornadas | Cláusula 34ª | **11 horas** consecutivas |
| Quinquênio | Cláusula 13ª | 10% abono a cada 5 anos |
| Cesta Básica (condição) | Cláusula 19ª | Perdida com 1 falta injustificada ou 5+ atrasos/60min+ atraso no mês |

**Intervalo de Almoço - Cláusula 35ª (detalhamento)**:
- Redução para 30 min permitida com compensação:
  - Entrada 30 min mais tarde, OU
  - Saída 30 min mais cedo, OU
  - Folga semanal compensatória, OU
  - Pagamento do período suprimido com adicional de 55%

**Adicional Noturno - Cláusula 14ª (detalhamento)**:
- Período: 22:00 às 05:00
- Hora noturna reduzida: 52 min 30 seg = 1 hora
- Adicional: 37% sobre hora diurna

**Ausências Justificadas - Cláusula 37ª**:
- CLT Art. 473 (todas as hipóteses)
- + 1 dia para falecimento de sogro/sogra

---

## 4. User Roles & Permissions

### 4.1 New Role: `producao`

```typescript
type UserRole = 'admin' | 'atendente' | 'producao';
```

**Default Permissions for `producao`**:
| Feature | View | Create | Update | Delete |
|---------|------|--------|--------|--------|
| dashboard | ✅ | ❌ | ❌ | ❌ |
| time_tracking | ✅ | ✅ | ✅ | ❌ |
| All others | ❌ | ❌ | ❌ | ❌ |

**Admin Permissions for `time_tracking`**:
| Feature | View | Create | Update | Delete |
|---------|------|--------|--------|--------|
| time_tracking | ✅ | ✅ | ✅ | ✅ |

### 4.2 Permission Integration
- Add `time_tracking` to `FeatureKey` type
- Add default permissions for `producao` role in `permissions.ts`
- Update middleware route protection for `/ponto/*` paths
- Update sidebar navigation with new menu items

---

## 5. Data Model

### 5.1 Firestore Collections

#### `time_entries` Collection
```typescript
interface TimeEntry {
  id: string;
  userId: string;                    // Reference to users collection
  date: string;                      // ISO date 'YYYY-MM-DD'

  // Clock markings (array for flexibility - 4 typical: entry, lunch-out, lunch-in, exit)
  markings: TimeMarking[];

  // Computed summary (updated on each marking)
  summary: {
    totalWorkedMinutes: number;      // Total worked time in minutes
    totalBreakMinutes: number;       // Total break time in minutes
    regularMinutes: number;          // Regular hours (up to 8h = 480min)
    overtimeMinutes: number;         // Minutes above 8h
    nightMinutes: number;            // Minutes between 22:00-05:00
    isRestDay: boolean;              // Sunday or designated rest day
    isHoliday: boolean;              // Public/national holiday
    status: 'incomplete' | 'complete' | 'absent' | 'justified_absence' | 'day_off';
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastModifiedBy: string;           // UID of who last modified
  isManualEntry: boolean;           // true if entire entry was manually created
}

interface TimeMarking {
  id: string;                        // Unique marking ID
  type: 'clock_in' | 'lunch_out' | 'lunch_in' | 'clock_out';
  timestamp: Timestamp;              // Exact time of marking

  // Geolocation (recorded, not enforced)
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;                // meters
    capturedAt: Timestamp;
  };

  // Source tracking
  source: 'clock' | 'manual';       // How was this marking created
  originalTimestamp?: Timestamp;     // If edited, keeps the original time

  // Metadata
  createdAt: Timestamp;
  createdBy: string;                 // UID of creator (self or admin)
}
```

#### `time_entry_audit_logs` Collection
```typescript
interface TimeEntryAuditLog {
  id: string;
  timeEntryId: string;              // Reference to time_entries
  userId: string;                    // Employee whose entry was modified
  performedBy: string;               // UID of who performed the action
  performedByName: string;           // Display name for readability

  action: 'create' | 'update' | 'delete' | 'manual_create' | 'manual_update';

  // Change details
  changes: {
    field: string;                   // e.g., 'markings[0].timestamp'
    oldValue: any;
    newValue: any;
  }[];

  reason?: string;                   // Required for manual edits

  timestamp: Timestamp;
}
```

#### `work_schedules` Collection
```typescript
interface WorkSchedule {
  id: string;
  userId: string;                    // Reference to users collection

  // Schedule definition
  name: string;                      // e.g., "Turno Manhã", "Turno Tarde"
  hourlyRate: number;                // R$/hora (minimum R$ 9.68 per CCT)

  // Expected schedule per day of week (0=Sunday, 6=Saturday)
  weeklySchedule: {
    [dayOfWeek: number]: {
      isWorkDay: boolean;
      expectedStart?: string;        // HH:mm format, e.g., "06:00"
      expectedEnd?: string;          // HH:mm format, e.g., "14:00"
      expectedBreakMinutes?: number; // Lunch break duration (min 30)
    };
  };

  // Lunch break configuration
  lunchBreakMinimum: number;         // Minimum lunch break in minutes (30 per CCT)
  lunchCompensation: 'late_entry' | 'early_exit' | 'weekly_off' | 'payment_55';

  effectiveFrom: Timestamp;         // When this schedule starts
  effectiveTo?: Timestamp;          // When this schedule ends (null = current)

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
  isActive: boolean;
}
```

#### `workplace_locations` Collection
```typescript
interface WorkplaceLocation {
  id: string;
  name: string;                      // e.g., "Padaria Momento Cake"
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;              // Geofence radius for reference
  isActive: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 5.2 Firestore Indexes Required

```json
[
  {
    "collectionGroup": "time_entries",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "date", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "time_entries",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "date", "order": "ASCENDING" },
      { "fieldPath": "userId", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "time_entry_audit_logs",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "timeEntryId", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "time_entry_audit_logs",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "work_schedules",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "isActive", "order": "ASCENDING" }
    ]
  }
]
```

### 5.3 Firestore Security Rules

```firestore
// Time entries - employees can read their own, admins can read all
match /time_entries/{entryId} {
  allow read: if isAuthenticated() &&
    (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if isAuthenticated() &&
    (request.resource.data.userId == request.auth.uid || isAdmin());
  allow update: if isAdmin();
  allow delete: if isAdmin();
}

// Audit logs - admins only for full access, employees can read their own
match /time_entry_audit_logs/{logId} {
  allow read: if isAuthenticated() &&
    (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if isAuthenticated();
  allow update, delete: if false; // Immutable audit trail
}

// Work schedules - admins manage, employees read their own
match /work_schedules/{scheduleId} {
  allow read: if isAuthenticated() &&
    (resource.data.userId == request.auth.uid || isAdmin());
  allow create, update, delete: if isAdmin();
}

// Workplace locations - admins manage, all authenticated read
match /workplace_locations/{locationId} {
  allow read: if isAuthenticated();
  allow create, update, delete: if isAdmin();
}
```

---

## 6. Navigation & Routes

### 6.1 Menu Structure

**Ponto (Time Tracking)** - New top-level menu item
- `/ponto/registro` - Clock in/out widget + today's markings (Produção default landing page)
- `/ponto/espelho` - Personal time records with calendar view (day/week/month)
- `/ponto/admin` - Admin: all employees overview (admin only)
- `/ponto/admin/[userId]` - Admin: specific employee detail view
- `/ponto/configuracoes` - Admin: work schedules, locations, system settings

### 6.2 Sidebar Configuration

```typescript
{
  name: 'Ponto',
  icon: Clock,
  feature: 'time_tracking',
  hasSubmenu: true,
  submenu: [
    { name: 'Registro', href: '/ponto/registro', feature: 'time_tracking' },
    { name: 'Meu Espelho', href: '/ponto/espelho', feature: 'time_tracking' },
    { name: 'Painel Admin', href: '/ponto/admin', feature: 'time_tracking', adminOnly: true },
    { name: 'Configurações', href: '/ponto/configuracoes', feature: 'time_tracking', adminOnly: true },
  ]
}
```

---

## 7. UI/UX Specifications

### 7.1 Clock In/Out Page (`/ponto/registro`)

**Layout**: Full-width card centered on page

**Primary Widget**:
- Large digital clock showing current time (real-time, HH:mm:ss)
- Current date in Brazilian format (dia da semana, DD de mês de YYYY)
- Large prominent button:
  - **Green "Registrar Entrada"** when no clock-in today
  - **Orange "Registrar Saída p/ Almoço"** after clock-in
  - **Blue "Registrar Retorno do Almoço"** after lunch-out
  - **Red "Registrar Saída"** after lunch return
  - **Disabled with checkmark** when all 4 markings are complete
- Geolocation status indicator (small icon showing if GPS is available)
- GPS permission prompt on first use

**Today's Markings Card** (below the widget):
- Timeline showing all markings for today
- Each marking shows: type icon, time (HH:mm), geolocation indicator
- Summary bar: Total worked, Break time, Status

**Recent Days Quick View** (collapsible):
- Last 7 days with status indicators (complete, incomplete, absent)

### 7.2 Personal Time Records (`/ponto/espelho`)

**Sub-tabs**: Dia | Semana | Mês

**Day View**:
- Date picker (calendar popup)
- Detailed timeline of all markings for selected day
- Summary: Entry, Lunch Out, Lunch In, Exit, Total, Overtime, Night hours
- Audit log for that day (if any edits were made)

**Week View**:
- Week picker (Mon-Sun)
- Table: columns = days, rows = entry/lunch-out/lunch-in/exit/total/overtime
- Weekly summary totals
- Visual indicators for anomalies (missing entries, short lunch, overtime)

**Month View**:
- Calendar grid (like a typical month calendar)
- Each day cell shows:
  - Color-coded status (green=complete, yellow=incomplete, red=absent, gray=day-off, blue=justified)
  - Total hours worked
  - Overtime indicator
- Monthly summary panel:
  - Total hours worked
  - Regular hours
  - Overtime hours (with 55% calculation)
  - Night hours (with 37% calculation)
  - Rest day hours (with 100% calculation)
  - Estimated gross pay breakdown

### 7.3 Admin Panel (`/ponto/admin`)

**Overview Page**:
- Filter: Date range, Employee, Status
- Table of all employees with today's status:
  - Name, Role, Schedule, Clock In, Lunch Out, Lunch In, Clock Out, Total, Status
- Quick stats cards: On time, Late, Absent, On lunch, Not clocked out
- Actions: View detail, Edit entry, Export

**Employee Detail Page** (`/ponto/admin/[userId]`):
- Same calendar/timeline views as personal espelho but for selected employee
- Edit capabilities:
  - Add missing markings
  - Correct timestamps
  - Mark justified absence
  - Required: reason text for all manual changes
- Audit trail panel showing all changes

**Bulk Actions**:
- Export monthly report for all employees (CSV)
- Export espelho de ponto (PDF per employee)

### 7.4 Settings Page (`/ponto/configuracoes`)

**Tabs**: Escalas | Locais | Feriados

**Escalas (Work Schedules)**:
- CRUD for work schedule templates
- Assign schedules to employees
- Fields: name, hourly rate, weekly schedule grid, lunch config

**Locais (Workplace Locations)**:
- CRUD for workplace locations
- Map preview with radius circle
- Fields: name, address, lat/lng, radius

**Feriados (Holidays)**:
- Year calendar with holiday markings
- CRUD for custom holidays (add national + municipal holidays)
- Auto-populate national holidays option

---

## 8. Payroll Calculation Engine

### 8.1 Core Calculations

```typescript
interface PayrollCalculation {
  employeeId: string;
  period: { start: string; end: string };  // Month period

  // Hours breakdown
  regularHours: number;              // Up to 8h/day on workdays
  overtimeHours: number;             // Above 8h/day
  nightHours: number;                // 22:00-05:00 (in reduced hours: 52.5min = 1h)
  restDayHours: number;              // Sunday/holiday work

  // Rate calculations per CCT SP
  hourlyRate: number;                // Base rate from schedule
  overtimeRate: number;              // hourlyRate * 1.55
  nightRate: number;                 // hourlyRate * 1.37
  restDayRate: number;               // hourlyRate * 2.00

  // Monetary values
  regularPay: number;                // regularHours * hourlyRate
  overtimePay: number;               // overtimeHours * overtimeRate
  nightPremiumPay: number;           // nightHours * (nightRate - hourlyRate)
  restDayPay: number;                // restDayHours * restDayRate

  // DSR (Descanso Semanal Remunerado)
  dsrValue: number;                  // Weekly rest calculation
  dsrLost: boolean;                  // Lost due to unjustified absence

  // Totals
  grossPay: number;

  // Attendance metrics
  totalWorkDays: number;
  daysPresent: number;
  daysAbsent: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  tardiness: { count: number; totalMinutes: number };
}
```

### 8.2 Night Hour Conversion (Hora Noturna Reduzida)
- 1 night hour = 52 minutes 30 seconds of actual time
- Every 52.5 real minutes between 22:00-05:00 counts as 60 minutes
- Formula: `nightHours = actualNightMinutes / 52.5`

### 8.3 DSR Calculation
- Employee loses DSR if they have unjustified absences during the week
- DSR value = (total weekly earnings / days worked in week) * rest days in week

### 8.4 Cesta Básica Impact (Cláusula 19ª)
The system should flag/warn when:
- Employee has 1+ unjustified absence in the month (loses cesta básica)
- Employee has 5+ tardiness events OR 60+ minutes total tardiness (loses cesta básica)

---

## 9. Implementation Phases

### Phase 1: Data Layer & Types
**Files to create/modify**:
- `src/types/time-tracking.ts` - All TypeScript interfaces
- `src/lib/validators/time-tracking.ts` - Zod schemas
- `firestore.indexes.json` - Add new indexes
- `firestore.rules` - Add security rules

### Phase 2: Role & Permission System
**Files to modify**:
- `src/types/index.ts` - Add `producao` to UserRole, add `time_tracking` to FeatureKey
- `src/lib/permissions.ts` - Add producao defaults, time_tracking permissions
- `src/middleware.ts` - Add `/ponto` to protected routes
- `src/components/layout/Sidebar.tsx` - Add Ponto menu items
- `src/hooks/usePermissions.ts` - Add `isProducao` helper

### Phase 3: Clock In/Out Service Layer
**Files to create**:
- `src/lib/time-tracking.ts` - Core CRUD operations
- `src/lib/time-tracking-calculations.ts` - Payroll calculation engine
- `src/app/api/time-tracking/route.ts` - API routes for entries
- `src/app/api/time-tracking/clock/route.ts` - Clock in/out endpoint
- `src/app/api/time-tracking/[entryId]/route.ts` - Entry CRUD
- `src/hooks/useTimeTracking.ts` - React hook for time entries
- `src/hooks/useGeolocation.ts` - Geolocation capture hook

### Phase 4: Clock In/Out UI (Employee)
**Files to create**:
- `src/app/(dashboard)/ponto/registro/page.tsx` - Clock page
- `src/components/time-tracking/ClockWidget.tsx` - Main clock widget
- `src/components/time-tracking/TodayMarkings.tsx` - Today's timeline
- `src/components/time-tracking/RecentDays.tsx` - Last 7 days
- `src/components/time-tracking/MarkingTimeline.tsx` - Reusable timeline

### Phase 5: Employee Espelho de Ponto (Calendar Views)
**Files to create**:
- `src/app/(dashboard)/ponto/espelho/page.tsx` - Espelho page
- `src/components/time-tracking/DayView.tsx` - Detailed day view
- `src/components/time-tracking/WeekView.tsx` - Week table view
- `src/components/time-tracking/MonthView.tsx` - Calendar grid
- `src/components/time-tracking/MonthlySummary.tsx` - Monthly totals
- `src/components/time-tracking/PayrollBreakdown.tsx` - Pay calculation display

### Phase 6: Manual Edits & Audit Trail
**Files to create/modify**:
- `src/lib/time-tracking-audit.ts` - Audit log service
- `src/app/api/time-tracking/audit/route.ts` - Audit API
- `src/components/time-tracking/EditMarkingModal.tsx` - Edit modal (requires reason)
- `src/components/time-tracking/AddMarkingModal.tsx` - Add missing marking
- `src/components/time-tracking/AuditLog.tsx` - Audit trail timeline display
- `src/components/time-tracking/JustifyAbsenceModal.tsx` - Mark justified absence

### Phase 7: Admin Panel
**Files to create**:
- `src/app/(dashboard)/ponto/admin/page.tsx` - Admin overview
- `src/app/(dashboard)/ponto/admin/[userId]/page.tsx` - Employee detail
- `src/components/time-tracking/admin/EmployeeOverviewTable.tsx` - All employees
- `src/components/time-tracking/admin/EmployeeStatusCards.tsx` - Quick stats
- `src/components/time-tracking/admin/AdminEditPanel.tsx` - Admin edit controls
- `src/hooks/useTimeTrackingAdmin.ts` - Admin-specific hook

### Phase 8: Settings & Configuration
**Files to create**:
- `src/app/(dashboard)/ponto/configuracoes/page.tsx` - Settings page
- `src/components/time-tracking/settings/WorkScheduleForm.tsx` - Schedule CRUD
- `src/components/time-tracking/settings/LocationForm.tsx` - Location CRUD
- `src/components/time-tracking/settings/HolidayCalendar.tsx` - Holiday management
- `src/lib/work-schedules.ts` - Schedule service
- `src/lib/workplace-locations.ts` - Location service
- `src/app/api/work-schedules/route.ts` - Schedule API
- `src/app/api/workplace-locations/route.ts` - Location API

### Phase 9: Export & Compliance
**Files to create**:
- `src/lib/time-tracking-export.ts` - Export service
- `src/app/api/time-tracking/export/route.ts` - Export API
- `src/components/time-tracking/ExportModal.tsx` - Export options UI
- PDF generation for espelho de ponto (comprovante digital)
- CSV export for payroll integration

---

## 10. Agent Team Specification

### Team Structure

| Agent | Role | Type | Responsibilities |
|-------|------|------|-----------------|
| **team-lead** | Orchestrator | general-purpose | Coordinate all agents, manage task dependencies, merge work |
| **data-architect** | Data Layer | general-purpose | Types, schemas, Firebase, security rules, indexes |
| **permission-engineer** | Permissions | general-purpose | Role system, middleware, sidebar navigation |
| **backend-engineer** | API & Services | general-purpose | Service functions, API routes, calculation engine |
| **clock-ui-builder** | Clock In/Out UI | general-purpose | Clock widget, geolocation, today view (uses frontend-design skill) |
| **calendar-ui-builder** | Calendar Views | general-purpose | Day/week/month views, espelho de ponto (uses frontend-design skill) |
| **admin-ui-builder** | Admin Panel | general-purpose | Admin overview, employee detail, edit panels (uses frontend-design skill) |
| **settings-builder** | Settings | general-purpose | Work schedules, locations, holidays CRUD |
| **export-engineer** | Export & Compliance | general-purpose | PDF/CSV generation, AFD files |
| **qa-reviewer** | Quality Assurance | general-purpose | Review each deliverable, run tests, verify compliance |

### Execution Order & Dependencies

```
Phase 1: data-architect          → qa-reviewer validates
Phase 2: permission-engineer     → qa-reviewer validates
    (depends on Phase 1)
Phase 3: backend-engineer        → qa-reviewer validates
    (depends on Phase 1, 2)
Phase 4: clock-ui-builder        → qa-reviewer validates
    (depends on Phase 3)
Phase 5: calendar-ui-builder     → qa-reviewer validates
    (depends on Phase 3)
Phase 6: backend-engineer        → qa-reviewer validates
    (depends on Phase 3)
    CAN RUN IN PARALLEL with Phase 4, 5
Phase 7: admin-ui-builder        → qa-reviewer validates
    (depends on Phase 3, 6)
Phase 8: settings-builder        → qa-reviewer validates
    (depends on Phase 1, 2)
    CAN RUN IN PARALLEL with Phase 4, 5, 6
Phase 9: export-engineer         → qa-reviewer validates
    (depends on Phase 3, 5, 7)
```

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──┬──→ Phase 4 ──────────────→ Phase 9
                                   ├──→ Phase 5 ──────────────→ Phase 9
                                   ├──→ Phase 6 ──→ Phase 7 ──→ Phase 9
                         Phase 8 ──┘ (parallel)
```

---

## 11. Detailed Task Breakdown with DOD

### Phase 1: Data Layer & Types

#### Task 1.1: Create TypeScript Interfaces
**Agent**: data-architect
**Files**: `src/types/time-tracking.ts`
**DOD**:
- [ ] `TimeEntry`, `TimeMarking`, `TimeEntryAuditLog`, `WorkSchedule`, `WorkplaceLocation` interfaces created
- [ ] `PayrollCalculation` interface created
- [ ] All enums and literal types defined
- [ ] Types are exported and importable
- [ ] `npm run build` passes with no type errors

#### Task 1.2: Create Zod Validation Schemas
**Agent**: data-architect
**Files**: `src/lib/validators/time-tracking.ts`
**DOD**:
- [ ] Zod schemas for creating/updating time entries
- [ ] Zod schemas for clock in/out request validation
- [ ] Zod schemas for work schedule CRUD
- [ ] Zod schemas for manual edit with required reason field
- [ ] All schemas have Portuguese error messages
- [ ] Type inference from schemas matches TypeScript interfaces

#### Task 1.3: Firestore Configuration
**Agent**: data-architect
**Files**: `firestore.indexes.json`, `firestore.rules`
**DOD**:
- [ ] All required indexes added to `firestore.indexes.json`
- [ ] Security rules added for all new collections
- [ ] Employees can only read their own entries
- [ ] Admins can read/write all entries
- [ ] Audit logs are immutable (no update/delete)
- [ ] Rules tested with Firebase emulator

#### Task 1.4: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] All types compile without errors
- [ ] Zod schemas validate correctly (valid data passes, invalid fails)
- [ ] Security rules cover all access patterns
- [ ] Data model supports all payroll calculations from CCT
- [ ] Night hour reduced time (52.5 min) is accounted for
- [ ] `npm run build` passes

---

### Phase 2: Role & Permission System

#### Task 2.1: Add `producao` Role
**Agent**: permission-engineer
**Files**: `src/types/index.ts`, `src/lib/permissions.ts`
**DOD**:
- [ ] `UserRole` type includes `'producao'`
- [ ] `FeatureKey` includes `'time_tracking'`
- [ ] Default permissions for `producao`: dashboard (view), time_tracking (view, create, update)
- [ ] Admin has full time_tracking permissions
- [ ] `getDefaultPermissions('producao')` returns correct defaults
- [ ] Existing roles unaffected

#### Task 2.2: Update Middleware & Navigation
**Agent**: permission-engineer
**Files**: `src/middleware.ts`, `src/components/layout/Sidebar.tsx`, `src/hooks/usePermissions.ts`
**DOD**:
- [ ] `/ponto` and `/ponto/*` added to protected routes in middleware
- [ ] Sidebar has "Ponto" menu with 4 submenu items (Registro, Meu Espelho, Painel Admin, Configurações)
- [ ] Painel Admin and Configurações only visible to admins
- [ ] `usePermissions` has `isProducao` boolean helper
- [ ] `producao` users see only Dashboard + Ponto in sidebar
- [ ] Active state highlighting works for all ponto routes
- [ ] Mobile sidebar closes on navigation (existing behavior preserved)

#### Task 2.3: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Login as admin → can see Ponto menu with all 4 items
- [ ] Create a user with `producao` role → can only see Dashboard + Ponto (Registro, Meu Espelho)
- [ ] `producao` user cannot access `/users`, `/clients`, etc.
- [ ] Middleware correctly redirects unauthorized access to `/login`
- [ ] `npm run build` passes
- [ ] No regressions in existing permission behavior for admin/atendente

---

### Phase 3: Clock In/Out Service Layer

#### Task 3.1: Core Time Tracking Service
**Agent**: backend-engineer
**Files**: `src/lib/time-tracking.ts`
**DOD**:
- [ ] `clockIn(userId, geolocation?)` - Creates time entry + first marking
- [ ] `clockLunchOut(userId, entryId)` - Adds lunch-out marking
- [ ] `clockLunchIn(userId, entryId)` - Adds lunch-in marking with 30min validation
- [ ] `clockOut(userId, entryId)` - Adds clock-out marking, computes summary
- [ ] `getTimeEntry(entryId)` - Fetch single entry
- [ ] `getTimeEntries(userId, dateRange)` - Fetch entries for date range
- [ ] `getTodayEntry(userId)` - Fetch today's entry
- [ ] Summary auto-calculated on each marking (total, overtime, night hours)
- [ ] Validates lunch break >= 30 minutes per CCT
- [ ] Validates interjornada >= 11 hours from previous day's exit

#### Task 3.2: Payroll Calculation Engine
**Agent**: backend-engineer
**Files**: `src/lib/time-tracking-calculations.ts`
**DOD**:
- [ ] `calculateDayPayroll(entry, schedule)` - Single day calculation
- [ ] `calculatePeriodPayroll(entries, schedule, holidays)` - Period calculation
- [ ] Overtime: 55% premium (Cláusula 12ª CCT)
- [ ] Night premium: 37% (Cláusula 14ª CCT) with reduced hour (52.5 min = 1h)
- [ ] Rest day: 100% premium (Cláusula 5ª CCT)
- [ ] DSR calculation with loss on unjustified absences
- [ ] Cesta básica eligibility flag (1 falta or 5+ atrasos/60min)
- [ ] Holiday detection
- [ ] All calculations have unit tests

#### Task 3.3: API Routes
**Agent**: backend-engineer
**Files**: `src/app/api/time-tracking/route.ts`, `src/app/api/time-tracking/clock/route.ts`, `src/app/api/time-tracking/[entryId]/route.ts`
**DOD**:
- [ ] `POST /api/time-tracking/clock` - Clock in/out/lunch endpoint
- [ ] `GET /api/time-tracking?userId=&startDate=&endDate=` - Fetch entries
- [ ] `GET /api/time-tracking/[entryId]` - Fetch single entry
- [ ] `PUT /api/time-tracking/[entryId]` - Update entry (admin only)
- [ ] All routes have auth verification
- [ ] All routes have permission checks
- [ ] Zod validation on request bodies
- [ ] Proper error responses (400, 401, 403, 404, 500)

#### Task 3.4: React Hooks
**Agent**: backend-engineer
**Files**: `src/hooks/useTimeTracking.ts`, `src/hooks/useGeolocation.ts`
**DOD**:
- [ ] `useTimeTracking()` - Manages today's entry, clock operations, loading states
- [ ] `useTimeEntries(userId?, dateRange)` - Fetch entries with caching
- [ ] `useGeolocation()` - Request GPS, capture coordinates, handle errors
- [ ] Loading and error states properly managed
- [ ] Optimistic updates for clock operations
- [ ] Proper cleanup on unmount

#### Task 3.5: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Clock flow works: in → lunch-out → lunch-in → out
- [ ] Cannot clock in twice without clocking out
- [ ] Lunch break < 30 min shows validation error
- [ ] Overtime correctly calculated for > 8h work
- [ ] Night hours (22:00-05:00) correctly identified with reduced hour
- [ ] Rest day work correctly flagged
- [ ] API returns proper errors for unauthorized access
- [ ] Payroll calculations match CCT rules (test with sample data)
- [ ] `npm run build` passes

---

### Phase 4: Clock In/Out UI

#### Task 4.1: Clock Widget Component
**Agent**: clock-ui-builder (uses `frontend-design` skill)
**Files**: `src/app/(dashboard)/ponto/registro/page.tsx`, `src/components/time-tracking/ClockWidget.tsx`
**DOD**:
- [ ] Real-time digital clock (HH:mm:ss) updating every second
- [ ] Current date in PT-BR format
- [ ] Context-aware action button (green entry → orange lunch-out → blue lunch-in → red exit → disabled complete)
- [ ] Geolocation status indicator
- [ ] GPS permission request on first clock
- [ ] Loading state during clock operation
- [ ] Success/error toast notifications
- [ ] Responsive design (mobile-first)
- [ ] Uses Momento Cake brown/gold brand colors
- [ ] Accessible (keyboard navigation, screen reader)

#### Task 4.2: Today's Markings & Recent Days
**Agent**: clock-ui-builder (uses `frontend-design` skill)
**Files**: `src/components/time-tracking/TodayMarkings.tsx`, `src/components/time-tracking/RecentDays.tsx`, `src/components/time-tracking/MarkingTimeline.tsx`
**DOD**:
- [ ] Vertical timeline showing today's markings with icons and times
- [ ] Summary bar: total worked, break time, status badge
- [ ] Last 7 days collapsible section with status dots
- [ ] Reusable `MarkingTimeline` component for use elsewhere
- [ ] Empty state for no markings yet
- [ ] Consistent with app design system

#### Task 4.3: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Clock updates in real-time
- [ ] Button changes state correctly through the full day flow
- [ ] Geolocation captured and displayed
- [ ] Toast messages appear on success/error
- [ ] Mobile layout works correctly
- [ ] Page accessible at `/ponto/registro`
- [ ] Only visible to users with time_tracking permission

---

### Phase 5: Employee Espelho de Ponto

#### Task 5.1: Day View Component
**Agent**: calendar-ui-builder (uses `frontend-design` skill)
**Files**: `src/app/(dashboard)/ponto/espelho/page.tsx`, `src/components/time-tracking/DayView.tsx`
**DOD**:
- [ ] Date picker for selecting any day
- [ ] Detailed timeline of all markings
- [ ] Summary card: entry, lunch-out, lunch-in, exit, total, overtime, night
- [ ] Audit log display for that day (if any changes)
- [ ] Navigate between days (prev/next arrows)

#### Task 5.2: Week View Component
**Agent**: calendar-ui-builder (uses `frontend-design` skill)
**Files**: `src/components/time-tracking/WeekView.tsx`
**DOD**:
- [ ] Week picker (Mon-Sun navigation)
- [ ] Table with days as columns, markings as rows
- [ ] Weekly totals row
- [ ] Visual indicators for anomalies (missing entries, short lunch, overtime)
- [ ] Color coding for status

#### Task 5.3: Month View Component
**Agent**: calendar-ui-builder (uses `frontend-design` skill)
**Files**: `src/components/time-tracking/MonthView.tsx`, `src/components/time-tracking/MonthlySummary.tsx`, `src/components/time-tracking/PayrollBreakdown.tsx`
**DOD**:
- [ ] Calendar grid with status-colored day cells
- [ ] Each cell shows: hours worked, overtime indicator, status icon
- [ ] Monthly summary panel with all hour breakdowns
- [ ] Payroll breakdown showing calculated values per CCT rates
- [ ] Month/year navigation
- [ ] Legend explaining color codes

#### Task 5.4: Tab Navigation
**Agent**: calendar-ui-builder
**Files**: `src/app/(dashboard)/ponto/espelho/page.tsx`
**DOD**:
- [ ] Tabs: Dia | Semana | Mês
- [ ] URL-based tab state (query param or subpath)
- [ ] Default to Mês view
- [ ] Smooth transitions between views

#### Task 5.5: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] All three views render correctly
- [ ] Date navigation works in all views
- [ ] Data is consistent across views (same day shows same data in day/week/month)
- [ ] Monthly payroll breakdown matches manual calculation using CCT rates
- [ ] Mobile responsive
- [ ] Performance: loads within 2 seconds for 30 days of data

---

### Phase 6: Manual Edits & Audit Trail

#### Task 6.1: Edit & Add Marking Modals
**Agent**: backend-engineer
**Files**: `src/components/time-tracking/EditMarkingModal.tsx`, `src/components/time-tracking/AddMarkingModal.tsx`, `src/components/time-tracking/JustifyAbsenceModal.tsx`
**DOD**:
- [ ] Edit modal: change timestamp, requires reason text (mandatory)
- [ ] Add modal: add missing marking to a day, requires reason
- [ ] Justify absence modal: mark a day as justified absence with type
- [ ] All changes create audit log entries
- [ ] Original timestamp preserved when editing
- [ ] Validation: cannot create overlapping markings
- [ ] Admin-only actions clearly marked

#### Task 6.2: Audit Log Service & Display
**Agent**: backend-engineer
**Files**: `src/lib/time-tracking-audit.ts`, `src/app/api/time-tracking/audit/route.ts`, `src/components/time-tracking/AuditLog.tsx`
**DOD**:
- [ ] `createAuditLog(changes)` - Immutable audit entry creation
- [ ] `getAuditLogs(entryId)` - Fetch logs for an entry
- [ ] `getAuditLogs(userId, dateRange)` - Fetch all logs for employee in period
- [ ] UI component showing chronological audit trail
- [ ] Each log shows: who, what changed, when, reason
- [ ] Visual diff (old value → new value)
- [ ] Audit logs are immutable (no delete/update in Firestore rules)

#### Task 6.3: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Admin can edit any marking → audit log created
- [ ] Employee CANNOT edit their own markings (only clock)
- [ ] Reason field is required for all manual changes
- [ ] Audit log shows correct before/after values
- [ ] Audit logs cannot be deleted via API or Firestore
- [ ] Multiple edits on same entry all tracked in chronological order

---

### Phase 7: Admin Panel

#### Task 7.1: Admin Overview Page
**Agent**: admin-ui-builder (uses `frontend-design` skill)
**Files**: `src/app/(dashboard)/ponto/admin/page.tsx`, `src/components/time-tracking/admin/EmployeeOverviewTable.tsx`, `src/components/time-tracking/admin/EmployeeStatusCards.tsx`
**DOD**:
- [ ] Quick stats cards: On time, Late, Absent, On lunch, Not clocked out
- [ ] Filterable table: date range, employee name, status
- [ ] Table columns: Name, Schedule, Clock In, Lunch Out, Lunch In, Clock Out, Total, Status
- [ ] Row click navigates to employee detail
- [ ] Today's date as default, with date picker
- [ ] Export button for current view

#### Task 7.2: Employee Detail Page (Admin)
**Agent**: admin-ui-builder (uses `frontend-design` skill)
**Files**: `src/app/(dashboard)/ponto/admin/[userId]/page.tsx`, `src/components/time-tracking/admin/AdminEditPanel.tsx`
**DOD**:
- [ ] Reuses Day/Week/Month views from Phase 5
- [ ] Admin-specific edit controls on each view
- [ ] Inline edit buttons on each marking
- [ ] "Add Missing Marking" button
- [ ] "Justify Absence" button for absent days
- [ ] Full audit trail panel for this employee
- [ ] Monthly payroll calculation summary

#### Task 7.3: Admin Hook
**Agent**: admin-ui-builder
**Files**: `src/hooks/useTimeTrackingAdmin.ts`
**DOD**:
- [ ] `useAllEmployeesStatus(date)` - Fetch all employees' status for a date
- [ ] `useEmployeeTimeEntries(userId, dateRange)` - Fetch specific employee's entries
- [ ] `useUpdateTimeEntry(entryId)` - Admin update with audit log
- [ ] Loading and error states

#### Task 7.4: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Admin can see all employees on overview
- [ ] Admin can navigate to any employee's detail
- [ ] Admin can edit markings with required reason
- [ ] Audit log created for every admin edit
- [ ] Non-admin users cannot access `/ponto/admin`
- [ ] Stats cards show correct counts
- [ ] Mobile responsive

---

### Phase 8: Settings & Configuration

#### Task 8.1: Work Schedule Management
**Agent**: settings-builder
**Files**: `src/app/(dashboard)/ponto/configuracoes/page.tsx`, `src/components/time-tracking/settings/WorkScheduleForm.tsx`, `src/lib/work-schedules.ts`, `src/app/api/work-schedules/route.ts`
**DOD**:
- [ ] CRUD for work schedule templates
- [ ] Weekly grid: for each day, toggle workday, set start/end times
- [ ] Hourly rate field with minimum R$ 9.68 validation (CCT)
- [ ] Lunch break config: minimum minutes + compensation type
- [ ] Assign schedule to employees
- [ ] Effective date range (supports schedule changes)
- [ ] API with auth + admin permission check

#### Task 8.2: Workplace Location Management
**Agent**: settings-builder
**Files**: `src/components/time-tracking/settings/LocationForm.tsx`, `src/lib/workplace-locations.ts`, `src/app/api/workplace-locations/route.ts`
**DOD**:
- [ ] CRUD for workplace locations
- [ ] Address input with lat/lng fields
- [ ] Radius configuration
- [ ] List view with edit/delete actions
- [ ] API with auth + admin permission check

#### Task 8.3: Holiday Calendar
**Agent**: settings-builder
**Files**: `src/components/time-tracking/settings/HolidayCalendar.tsx`
**DOD**:
- [ ] Year calendar view with holiday markings
- [ ] Add/remove holidays
- [ ] Pre-populated Brazilian national holidays
- [ ] Municipal holiday support
- [ ] Holidays stored and used by payroll calculation engine

#### Task 8.4: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] Can create work schedule with all fields
- [ ] Hourly rate validates minimum per CCT
- [ ] Lunch break minimum enforced at 30 min
- [ ] Location CRUD works
- [ ] Holidays appear on calendar
- [ ] Only admins can access settings
- [ ] Settings affect payroll calculations correctly

---

### Phase 9: Export & Compliance

#### Task 9.1: CSV Export for Payroll
**Agent**: export-engineer
**Files**: `src/lib/time-tracking-export.ts`, `src/app/api/time-tracking/export/route.ts`
**DOD**:
- [ ] Monthly CSV export with all payroll data per employee
- [ ] Columns: Employee, Date, Entry, Lunch Out, Lunch In, Exit, Regular Hours, Overtime, Night Hours, Rest Day Hours
- [ ] Summary row per employee with totals and calculated values
- [ ] Date range filter
- [ ] Downloaded as file (not inline)

#### Task 9.2: PDF Espelho de Ponto (Comprovante Digital)
**Agent**: export-engineer
**Files**: `src/lib/time-tracking-export.ts`
**DOD**:
- [ ] Per-employee monthly PDF
- [ ] Includes: employer ID (CNPJ), employee data (name, CPF, position, hire date)
- [ ] All markings for the period
- [ ] Daily totals and monthly summary
- [ ] Overtime, night, rest day breakdowns
- [ ] Compliant with Portaria 671 comprovante requirements
- [ ] Uses employee-accessible format (not just admin)

#### Task 9.3: Export UI
**Agent**: export-engineer (uses `frontend-design` skill)
**Files**: `src/components/time-tracking/ExportModal.tsx`
**DOD**:
- [ ] Modal with export options (CSV payroll, PDF espelho)
- [ ] Date range picker
- [ ] Employee selector (admin: multi-select, employee: self only)
- [ ] Format selection
- [ ] Download button with loading state

#### Task 9.4: Review & Validation
**Agent**: qa-reviewer
**DOD**:
- [ ] CSV opens correctly in Excel with proper encoding (UTF-8 BOM)
- [ ] CSV values match UI calculations
- [ ] PDF renders correctly with all required fields per Portaria 671
- [ ] Employee can export their own espelho
- [ ] Admin can export for any/all employees
- [ ] Export handles edge cases (empty months, partial months)

---

## 12. Testing Strategy

### Unit Tests
- Payroll calculation engine (all CCT rules)
- Night hour conversion (52.5 min)
- Overtime detection
- DSR calculation
- Lunch break validation
- Zod schema validation

### Integration Tests
- Clock in/out flow
- Permission checks
- API route authentication
- Firestore read/write operations

### E2E Tests (Playwright)
- Full clock in/out day flow
- Employee espelho navigation
- Admin overview and edit flow
- Export functionality
- Permission-based access control
- Mobile responsive layout

### Test Data
- Sample employees with different schedules
- Days with overtime
- Night shift entries
- Rest day work entries
- Manual edits with audit trail
- Edge cases: midnight crossing, missing markings

---

## 13. Acceptance Criteria

### Functional
- [ ] Produção user can clock in/out with 4 markings per day
- [ ] Geolocation captured (but not enforced) on each marking
- [ ] Lunch break minimum 30 minutes enforced
- [ ] Employee can view their time records in day/week/month views
- [ ] Admin can view all employees' records
- [ ] Admin can manually edit/add markings with required reason
- [ ] All manual changes create immutable audit logs
- [ ] Overtime calculated at 55% per CCT
- [ ] Night premium calculated at 37% per CCT with reduced hour
- [ ] Rest day work calculated at 100% per CCT
- [ ] DSR calculated and flagged when lost
- [ ] Cesta básica eligibility flagged
- [ ] CSV export for payroll integration
- [ ] PDF espelho de ponto generation

### Technical
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] All API routes have auth + permission checks
- [ ] Firestore security rules enforce access control
- [ ] Audit logs immutable at database level
- [ ] Responsive on mobile and desktop
- [ ] Performance: all pages load within 3 seconds
- [ ] No regressions to existing features

### Legal Compliance
- [ ] System qualifies as REP-P per Portaria 671
- [ ] Digital comprovante with required employer/employee data
- [ ] 48-hour record access for employees
- [ ] All CCT SP 2025/2026 rates correctly applied
- [ ] Audit trail for all modifications
- [ ] Interjornada 11h validation
- [ ] Intervalo intrajornada 30 min minimum

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Geolocation denied by browser | Medium | System works without GPS, shows warning only |
| Timezone issues | High | Use server timestamps (Firestore), display in America/Sao_Paulo |
| CCT rate changes | Medium | Rates configurable in settings, not hardcoded |
| Employee forgets to clock | High | Manual edit system with audit trail |
| Browser refresh during clock | Low | Re-fetch current state from Firestore |
| PDF generation complexity | Medium | Start with simple table layout, enhance later |
| Firestore costs at scale | Low | 1-10 employees, minimal reads/writes |

---

## 15. Future Enhancements (Out of Scope)

- eSocial integration (event S-1200)
- AFD file generation with CRC-16/SHA-256
- Bank of hours (banco de horas)
- Biometric authentication
- Mobile app (React Native)
- Integration with external payroll systems
- Automatic holiday calendar sync
- Employee self-service for justified absences
- Shift swap management
