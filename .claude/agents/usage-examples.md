---
name: "Agent Usage Examples"
type: "documentation"
version: "1.0.0"
specialization: "Usage examples and best practices for Momento Cake agents"
purpose: "Reference guide for proper agent usage and coordination"
agents_covered:
  - "web-firebase-specialist"
  - "web-tester-playwright"
last_updated: "2025-01-29"
---

# 🎯 Agent Usage Examples

Practical examples demonstrating how to work with the Momento Cake Claude sub-agents.

## 🔥 Web & Firebase Specialist Agent Examples

### **Example 1: Create Ingredient Management Component**

**User Request**:
> "Create a complete ingredient management interface with CRUD operations, validation, and real-time updates"

**Agent Context**: Load `web-firebase-specialist.md`

**Expected Output**:
```typescript
// Component with:
- shadcn/ui form with Momento Cake styling
- zod validation schema for ingredients
- Firestore real-time subscriptions
- Business context isolation
- TypeScript interfaces
- Error handling and loading states
- Accessibility compliance (WCAG 2.1 AA)
```

**Generated Files**:
- `src/app/dashboard/ingredients/page.tsx` - Main page component
- `src/components/ingredients/IngredientForm.tsx` - Form component
- `src/components/ingredients/IngredientList.tsx` - List component
- `src/hooks/useIngredients.ts` - Firestore hook
- `src/types/ingredient.ts` - TypeScript interfaces

### **Example 2: Authentication Flow with Role-Based Access**

**User Request**:
> "Implement login form with role-based redirects and business context switching"

**Agent Context**: Load `web-firebase-specialist.md`

**Expected Output**:
```typescript
// Authentication system with:
- Login form with Firebase Auth integration
- Role-based route protection
- Business context switching for multi-tenant
- Session persistence and automatic logout
- Error handling for auth failures
- Loading states during authentication
```

**Generated Files**:
- `src/app/login/page.tsx` - Login page
- `src/components/auth/LoginForm.tsx` - Login form component  
- `src/hooks/useAuth.ts` - Authentication hook
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/contexts/AuthContext.tsx` - Auth context provider

### **Example 3: Recipe Management with Cost Calculation**

**User Request**:
> "Create recipe management with ingredient selection, cost calculation, and preparation steps"

**Agent Context**: Load `web-firebase-specialist.md`

**Expected Output**:
```typescript
// Recipe system with:
- Dynamic ingredient selection from business inventory
- Real-time cost calculation based on ingredient prices
- Drag-and-drop preparation step ordering
- Recipe yield and unit conversion
- Batch cost analysis for production planning
```

## 🎭 Web Tester Agent (Playwright MCP) Examples

### **Example 1: E2E Test for Ingredient Workflow**

**User Request**:
> "Generate comprehensive E2E tests for the ingredient management workflow including CRUD operations and real-time updates"

**Agent Context**: Load `web-tester-playwright.md`

**Expected Output**:
```typescript
// Test suite covering:
- User authentication with business role
- Navigate to ingredients section
- Create new ingredient with form validation
- Edit existing ingredient with optimistic updates
- Delete ingredient with confirmation dialog
- Real-time synchronization between browser tabs
- Cross-browser compatibility (Chrome, Firefox, Safari)
```

**Generated Files**:
- `tests/ingredients/crud-operations.spec.ts` - CRUD test scenarios
- `tests/ingredients/realtime-sync.spec.ts` - Real-time update tests
- `tests/ingredients/form-validation.spec.ts` - Form validation tests
- `tests/fixtures/ingredient-data.ts` - Test data fixtures
- `tests/helpers/auth-helper.ts` - Authentication utilities

### **Example 2: Performance and Accessibility Audit**

**User Request**:
> "Create automated tests to validate Core Web Vitals performance and WCAG 2.1 AA accessibility compliance"

**Agent Context**: Load `web-tester-playwright.md`

**Expected Output**:
```typescript
// Performance & accessibility tests:
- Core Web Vitals measurement (LCP, FID, CLS)
- Lighthouse performance audit automation  
- axe-core accessibility testing integration
- Color contrast validation
- Keyboard navigation testing
- Screen reader compatibility
- Mobile responsiveness validation
```

**Generated Files**:
- `tests/performance/core-web-vitals.spec.ts` - Performance metrics
- `tests/accessibility/wcag-compliance.spec.ts` - Accessibility audit
- `tests/accessibility/keyboard-navigation.spec.ts` - Keyboard tests
- `tests/responsive/mobile-compatibility.spec.ts` - Responsive tests

### **Example 3: Multi-User Role-Based Testing**

**User Request**:
> "Generate tests that validate role-based access control across different user types and business contexts"

**Agent Context**: Load `web-tester-playwright.md`

**Expected Output**:
```typescript
// Role-based testing scenarios:
- Admin user: Full system access, business management
- Company Admin: Business-specific access, user management
- Company Manager: Limited business operations
- Company Employee: Read-only access with basic operations
- Cross-business data isolation validation
```

**Generated Files**:
- `tests/auth/role-based-access.spec.ts` - Role permission tests
- `tests/auth/business-isolation.spec.ts` - Multi-tenant tests
- `tests/fixtures/user-roles.ts` - Test user configurations
- `tests/helpers/role-helper.ts` - Role switching utilities

## 🔄 Agent Coordination Examples

### **Example 1: Feature Development + Testing Pipeline**

**Workflow**:
1. **Web Developer Agent** creates ingredient management feature
2. **Web Tester Agent** generates corresponding test suite  
3. Both agents ensure consistency in data attributes and workflows

**User Request**:
> "Create ingredient management feature with comprehensive testing"

**Step 1 - Web Developer Agent**:
```typescript
// Creates ingredient management with:
- data-testid attributes for testing
- Proper error handling and loading states
- Accessible form elements with ARIA labels
- Consistent styling with Momento Cake theme
```

**Step 2 - Web Tester Agent**:
```typescript
// Generates tests targeting:
- Same data-testid attributes for element selection
- Error scenario testing for edge cases
- Accessibility compliance validation
- Visual regression testing with screenshots
```

### **Example 2: Performance Optimization Cycle**

**Workflow**:
1. **Web Tester Agent** identifies performance bottlenecks
2. **Web Developer Agent** implements optimizations
3. **Web Tester Agent** validates improvements

**Performance Issues Detected**:
```typescript
// Web Tester findings:
- LCP > 3.5s on ingredient list page
- Large bundle size from unused shadcn/ui components
- Firestore query N+1 problem on recipe ingredients
```

**Optimization Implementation**:
```typescript  
// Web Developer solutions:
- Implement React.lazy() for code splitting
- Optimize Firestore queries with batch operations
- Add memoization for expensive calculations
- Implement virtual scrolling for large lists
```

**Validation Testing**:
```typescript
// Web Tester verification:
- LCP improved to <2.5s (target achieved)
- Bundle size reduced by 40%
- Firestore read operations reduced by 75%
```

## 📋 Best Practices for Agent Usage

### **🔥 Web Developer Agent Best Practices**

1. **Always provide context** about the business domain (bakery operations)
2. **Specify user roles** when creating features (admin, company_admin, etc.)
3. **Request accessibility compliance** explicitly for all UI components
4. **Ask for TypeScript interfaces** to match existing data models
5. **Mention Firebase integration** requirements (auth, Firestore, security rules)
6. **Specify Momento Cake branding** for consistent visual design

### **🎭 Web Tester Agent Best Practices**

1. **Define user journeys** clearly with specific business scenarios
2. **Specify browsers and devices** for cross-compatibility testing
3. **Include performance thresholds** (Core Web Vitals targets)
4. **Request accessibility validation** with specific WCAG criteria
5. **Ask for visual regression tests** for UI consistency
6. **Mention MCP integration** when using advanced Playwright features

### **🔄 Agent Coordination Best Practices**

1. **Sequential workflow**: Development first, then testing
2. **Shared vocabulary**: Use consistent terminology across agents
3. **Test data consistency**: Same fixtures and mock data
4. **Quality gates**: Both agents enforce same standards
5. **Documentation sync**: Keep specifications updated together

## 🛠️ VS Code Integration Workflow

### **Agent Activation Workflow**
```bash
# 1. Open workspace
code momentocake-admin.code-workspace

# 2. Activate appropriate agent
Ctrl+Shift+P → Tasks: Run Task → 🔥 Web Developer Agent Mode
# OR
Ctrl+Shift+P → Tasks: Run Task → 🎭 Web Tester Agent Mode

# 3. Use launch configurations
F5 → Select appropriate configuration

# 4. Start development/testing
Use custom snippets, tasks, and debugging features
```

### **Development Cycle Example**
```bash
# Web Developer Agent workflow:
1. F5 → 🔥 Full Stack Development (Next.js + Firebase)
2. Type "mccomponent" → Generate component template
3. Implement Firebase integration with business context
4. Test locally with Firebase emulators
5. Commit changes with proper git workflow

# Web Tester Agent workflow:  
1. F5 → 🎭 Testing Environment (Development + Playwright)
2. Generate E2E test suite for new feature
3. Run cross-browser testing with MCP integration
4. Generate performance and accessibility reports
5. Validate test coverage and success criteria
```

---

**Remember**: Each agent has specialized knowledge about their domain. Load the appropriate agent specification to get optimal results for your specific development or testing needs.