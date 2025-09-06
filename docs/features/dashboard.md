# Dashboard Feature

## Overview

The Dashboard serves as the central hub for Momento Cake's daily operations, providing quick access to all system features, key business metrics, and actionable insights. It's designed for efficiency and immediate understanding of business status.

## Business Requirements

### Core Features
1. **Feature Navigation** - Grid-based access to all system modules
2. **Business Metrics** - Key performance indicators and summaries
3. **Quick Actions** - Shortcuts to common daily tasks
4. **Recent Activity** - Latest orders, updates, and system activity
5. **Alerts & Notifications** - Low stock, upcoming events, system messages
6. **User Profile** - Current user information and settings access

### Dashboard Sections
- **Header**: Company branding, user menu, notifications
- **Metrics Cards**: Revenue, orders, stock alerts, upcoming events
- **Feature Grid**: Main navigation to system modules
- **Activity Feed**: Recent system activities and updates
- **Quick Actions**: Fast access to common operations

## Data Models

### Dashboard Metrics Model
```typescript
interface DashboardMetrics {
  revenue: RevenueMetrics
  orders: OrderMetrics
  inventory: InventoryMetrics
  clients: ClientMetrics
  alerts: AlertMetrics
  lastUpdated: Date
}

interface RevenueMetrics {
  today: number
  thisWeek: number
  thisMonth: number
  trend: TrendDirection
  comparison: {
    period: 'week' | 'month'
    percentage: number
  }
}

interface OrderMetrics {
  today: number
  pending: number
  completed: number
  trend: TrendDirection
}

interface InventoryMetrics {
  lowStock: number
  outOfStock: number
  totalIngredients: number
  criticalAlerts: number
}

interface ClientMetrics {
  total: number
  newThisMonth: number
  upcomingBirthdays: number
  upcomingEvents: number
}

interface AlertMetrics {
  total: number
  high: number
  medium: number
  low: number
}

enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable'
}
```

### Dashboard Feature Model
```typescript
interface DashboardFeature {
  id: string
  title: string
  description: string
  icon: string
  route: string
  category: FeatureCategory
  isEnabled: boolean
  requiresPermission?: string
  badge?: {
    count: number
    type: 'info' | 'warning' | 'error' | 'success'
  }
}

enum FeatureCategory {
  CORE = 'core',
  INVENTORY = 'inventory',
  CUSTOMERS = 'customers',
  REPORTS = 'reports',
  SETTINGS = 'settings'
}
```

### Recent Activity Model
```typescript
interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  user: string
  metadata?: Record<string, any>
}

enum ActivityType {
  ORDER_CREATED = 'order_created',
  INGREDIENT_UPDATED = 'ingredient_updated',
  RECIPE_CREATED = 'recipe_created',
  CLIENT_ADDED = 'client_added',
  VENDOR_UPDATED = 'vendor_updated',
  STOCK_ALERT = 'stock_alert'
}
```

## User Interface Requirements

### Dashboard Layout
```
┌─────────────────────────────────────────┐
│ Header: Logo + User Menu + Notifications │
├─────────────────────────────────────────┤
│ Welcome Message + Quick Stats Summary    │
├─────────────────────────────────────────┤
│ Metrics Cards (Revenue, Orders, etc.)   │
├─────────────────────────────────────────┤
│ Feature Grid (Main Navigation)          │
├─────────────────────────────────────────┤
│ Recent Activity + Alerts                │
└─────────────────────────────────────────┘
```

### Metrics Cards Section
- **Revenue Card**: Today/week/month revenue with trend indicator
- **Orders Card**: Active orders, pending, completed counts
- **Inventory Card**: Stock alerts, critical items count
- **Clients Card**: Total clients, upcoming birthdays/events

### Feature Grid
- **Grid Layout**: 2 columns on mobile, 3-4 columns on desktop
- **Feature Cards**: Icon, title, description, status badge
- **Visual Hierarchy**: Core features prominently displayed
- **Category Grouping**: Logical feature organization

### Header Components
- **Company Logo**: Momento Cake branding
- **User Avatar**: Current user photo/initials
- **Notifications Bell**: Alert count badge
- **User Menu**: Settings, profile, logout options

## Business Logic

### Metrics Calculation
```typescript
const calculateDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const today = startOfDay(new Date())
  const thisWeek = startOfWeek(today)
  const thisMonth = startOfMonth(today)
  
  // Revenue calculations
  const todayRevenue = await calculateRevenue(today, endOfDay(today))
  const weekRevenue = await calculateRevenue(thisWeek, endOfWeek(today))
  const monthRevenue = await calculateRevenue(thisMonth, endOfMonth(today))
  
  // Order metrics
  const orderMetrics = await calculateOrderMetrics(today)
  
  // Inventory alerts
  const inventoryAlerts = await getInventoryAlerts()
  
  // Client metrics
  const clientMetrics = await calculateClientMetrics()
  
  return {
    revenue: {
      today: todayRevenue,
      thisWeek: weekRevenue,
      thisMonth: monthRevenue,
      trend: calculateTrend(weekRevenue, await getLastWeekRevenue()),
      comparison: {
        period: 'week',
        percentage: calculatePercentageChange(weekRevenue, await getLastWeekRevenue())
      }
    },
    orders: orderMetrics,
    inventory: {
      lowStock: inventoryAlerts.lowStock.length,
      outOfStock: inventoryAlerts.outOfStock.length,
      totalIngredients: await getIngredientCount(),
      criticalAlerts: inventoryAlerts.critical.length
    },
    clients: clientMetrics,
    alerts: await calculateAlertMetrics(),
    lastUpdated: new Date()
  }
}
```

### Feature Permissions
```typescript
const getEnabledFeatures = (userRole: UserRole): DashboardFeature[] => {
  const allFeatures: DashboardFeature[] = [
    {
      id: 'ingredients',
      title: 'Ingredientes',
      description: 'Gerir inventário de ingredientes',
      icon: 'ingredients',
      route: '/ingredients',
      category: FeatureCategory.INVENTORY,
      isEnabled: true
    },
    {
      id: 'recipes',
      title: 'Receitas',
      description: 'Criar e gerir receitas',
      icon: 'recipe',
      route: '/recipes',
      category: FeatureCategory.CORE,
      isEnabled: true
    },
    {
      id: 'vendors',
      title: 'Fornecedores',
      description: 'Gerir relacionamentos com fornecedores',
      icon: 'vendors',
      route: '/vendors',
      category: FeatureCategory.INVENTORY,
      isEnabled: true
    },
    {
      id: 'clients',
      title: 'Clientes',
      description: 'Gerir relacionamentos com clientes',
      icon: 'clients',
      route: '/clients',
      category: FeatureCategory.CUSTOMERS,
      isEnabled: true
    },
    // Additional features...
  ]
  
  return allFeatures.filter(feature => 
    feature.isEnabled && hasPermission(userRole, feature.requiresPermission)
  )
}
```

## Technical Implementation

### API Endpoints
```typescript
// Dashboard data
GET    /api/dashboard/metrics        // Get dashboard metrics
GET    /api/dashboard/features       // Get enabled features for user
GET    /api/dashboard/activity       // Get recent activity feed
GET    /api/dashboard/alerts         // Get system alerts

// Quick actions
POST   /api/dashboard/quick-actions  // Execute quick action
GET    /api/dashboard/shortcuts      // Get user shortcuts

// Notifications
GET    /api/notifications            // Get user notifications
PUT    /api/notifications/:id/read   // Mark notification as read
DELETE /api/notifications/:id        // Dismiss notification
```

### Database Schema
```sql
-- Dashboard metrics (cached/materialized view)
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
  'revenue' as metric_type,
  DATE_TRUNC('day', created_at) as period,
  SUM(total_amount) as value
FROM orders 
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', created_at)

UNION ALL

SELECT 
  'orders' as metric_type,
  DATE_TRUNC('day', created_at) as period,
  COUNT(*) as value
FROM orders
GROUP BY DATE_TRUNC('day', created_at);

-- Activity feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_dashboard_metrics_period ON dashboard_metrics(period);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
```

### State Management
```typescript
interface DashboardStore {
  // State
  metrics: DashboardMetrics | null
  features: DashboardFeature[]
  activities: ActivityItem[]
  alerts: Alert[]
  notifications: Notification[]
  loading: {
    metrics: boolean
    activities: boolean
    alerts: boolean
  }
  error: string | null

  // Actions
  fetchMetrics: () => Promise<void>
  fetchFeatures: () => Promise<void>
  fetchActivities: () => Promise<void>
  fetchAlerts: () => Promise<void>
  fetchNotifications: () => Promise<void>
  
  markNotificationRead: (id: string) => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  executeQuickAction: (action: string, params?: any) => Promise<void>
  
  refreshAll: () => Promise<void>
  clearError: () => void
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  metrics: null,
  features: [],
  activities: [],
  alerts: [],
  notifications: [],
  loading: {
    metrics: false,
    activities: false,
    alerts: false
  },
  error: null,
  
  // Actions
  fetchMetrics: async () => {
    set(state => ({ loading: { ...state.loading, metrics: true }, error: null }))
    
    try {
      const metrics = await dashboardApi.getMetrics()
      set({ metrics, loading: { ...get().loading, metrics: false } })
    } catch (error) {
      set({ 
        error: error.message, 
        loading: { ...get().loading, metrics: false } 
      })
    }
  },
  
  refreshAll: async () => {
    const { fetchMetrics, fetchActivities, fetchAlerts, fetchNotifications } = get()
    await Promise.all([
      fetchMetrics(),
      fetchActivities(), 
      fetchAlerts(),
      fetchNotifications()
    ])
  }
}))
```

## Component Structure

```
src/features/dashboard/
├── components/
│   ├── Dashboard.tsx               # Main dashboard container
│   ├── DashboardHeader.tsx         # Header with user menu
│   ├── MetricsSection.tsx          # Metrics cards section
│   ├── MetricCard.tsx              # Individual metric card
│   ├── FeatureGrid.tsx             # Main navigation grid
│   ├── FeatureCard.tsx             # Individual feature card
│   ├── ActivityFeed.tsx            # Recent activity list
│   ├── ActivityItem.tsx            # Individual activity item
│   ├── AlertsPanel.tsx             # Alerts and notifications
│   ├── QuickActions.tsx            # Quick action buttons
│   └── WelcomeMessage.tsx          # Personalized welcome
├── hooks/
│   ├── useDashboardMetrics.ts      # Metrics data management
│   ├── useActivityFeed.ts          # Activity feed management
│   ├── useAlerts.ts                # Alerts management
│   └── useNotifications.ts         # Notifications management
├── services/
│   └── dashboardApi.ts             # Dashboard API service
├── types/
│   └── dashboard.types.ts          # TypeScript definitions
└── utils/
    ├── metricsCalculations.ts      # Metrics calculation utilities
    ├── trendAnalysis.ts            # Trend analysis functions
    └── activityFormatters.ts       # Activity formatting utilities
```

## User Experience Features

### Real-time Updates
```typescript
const useDashboardRealtime = () => {
  const { refreshAll } = useDashboardStore()
  
  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshAll()
    }, 5 * 60 * 1000)
    
    // Real-time websocket updates
    const ws = new WebSocket('/ws/dashboard')
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      
      switch (update.type) {
        case 'metrics_updated':
          useDashboardStore.getState().fetchMetrics()
          break
        case 'new_activity':
          useDashboardStore.getState().fetchActivities()
          break
        case 'alert_created':
          useDashboardStore.getState().fetchAlerts()
          break
      }
    }
    
    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [refreshAll])
}
```

### Responsive Design
- **Mobile**: Single column layout, swipeable metrics cards
- **Tablet**: Two-column grid, collapsible sidebar
- **Desktop**: Full grid layout, fixed header

### Interactive Elements
- **Metric Cards**: Click to view detailed reports
- **Feature Cards**: Hover effects, click to navigate
- **Activity Items**: Click for detailed view
- **Quick Actions**: One-click common operations

### Personalization
- **Custom Shortcuts**: User-defined quick access buttons
- **Widget Preferences**: Show/hide dashboard sections
- **Metric Timeframes**: Preferred date ranges for metrics
- **Activity Filters**: Filter activity feed by type

## Performance Optimization

### Data Loading Strategy
```typescript
const DashboardContainer = () => {
  const { fetchMetrics, fetchFeatures, fetchActivities } = useDashboardStore()
  
  useEffect(() => {
    // Load critical data first
    const loadCriticalData = async () => {
      await Promise.all([
        fetchMetrics(),
        fetchFeatures()
      ])
    }
    
    // Load secondary data after critical
    const loadSecondaryData = async () => {
      await Promise.all([
        fetchActivities(),
        fetchAlerts(),
        fetchNotifications()
      ])
    }
    
    loadCriticalData().then(() => {
      // Small delay to prioritize critical rendering
      setTimeout(loadSecondaryData, 100)
    })
  }, [])
}
```

### Caching Strategy
- **Metrics**: Cache for 5 minutes, background refresh
- **Features**: Cache until user permission change
- **Activities**: Cache for 1 minute, real-time updates
- **Notifications**: No caching, always fresh

## Testing Strategy

### Unit Tests
- Metrics calculation functions
- Trend analysis utilities
- Permission checking logic
- Activity formatting functions

### Integration Tests
- Dashboard data loading
- Real-time update handling
- User interaction workflows
- Navigation functionality

### E2E Tests
- Complete dashboard loading
- Feature navigation flows
- Alert and notification handling
- Responsive behavior across devices

## Implementation Timeline

### Phase 1 (Week 1)
- Basic dashboard layout and routing
- Metrics cards implementation
- Feature grid with navigation

### Phase 2 (Week 2)
- Activity feed and alerts system
- User notifications
- Quick actions implementation

### Phase 3 (Week 3)
- Real-time updates
- Performance optimization
- Mobile responsive design

This comprehensive dashboard documentation provides all necessary information for implementing a professional, efficient, and user-friendly central hub for Momento Cake's bakery management operations.