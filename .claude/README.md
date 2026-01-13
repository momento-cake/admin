# 🤖 Momento Cake Claude Sub-Agents

Specialized Claude sub-agents for the Momento Cake admin system, optimized for Next.js development and Playwright testing with MCP integration.

## Agent Overview

### 🔥 **Web & Firebase Specialist Agent**
**File**: `agents/web-firebase-specialist.md`  
**Persona**: Full-stack web developer with Firebase expertise  
**Stack**: Next.js 15, TypeScript, Firebase v10, shadcn/ui, Tailwind CSS  

**Specialization**:
- Authentication flows and role-based access control
- Firestore real-time data management with business isolation
- Component development with Momento Cake branding
- Form validation with react-hook-form + zod
- Multi-tenant architecture patterns

### 🎭 **Web Tester Agent (Playwright MCP)**
**File**: `agents/web-tester-playwright.md`  
**Persona**: QA specialist with cross-browser testing expertise  
**Stack**: Playwright MCP, Firebase Testing, Accessibility Auditing  

**Specialization**:
- E2E testing across multiple browsers and devices
- Firebase authentication and data testing
- Performance auditing (Core Web Vitals)
- Accessibility compliance (WCAG 2.1 AA)
- User journey validation with role-based scenarios

## Project Architecture

### **Stack Overview**
```typescript
// Frontend
Next.js 15 (App Router + Turbopack)
React 19 (Server Components)
TypeScript 5+ (Strict mode)
shadcn/ui + Tailwind CSS 4

// Backend & Services
Firebase v10 (Auth + Firestore + Functions + Hosting)
Multi-tenant architecture with business isolation
Role-based access control (admin, company_admin, etc.)

// Development
VS Code workspace with specialized configurations
ESLint + Prettier for code quality
Custom snippets and tasks for productivity
```

### **Data Model**
```typescript
// Core Collections
/users/{userId}                    // UserModel with roles
/businesses/{businessId}           // Business entities  
/businesses/{businessId}/clients   // Client management
/businesses/{businessId}/ingredients // Ingredient inventory
/businesses/{businessId}/recipes   // Recipe management
/businesses/{businessId}/vendors   // Vendor relationships

// Security Pattern
- Business data isolation enforced
- Role-based read/write permissions
- Cross-business access prevention
```

## Agent Usage Guide

### **🔥 Web Developer Agent Activation**

**Via VS Code Tasks**:
1. `Ctrl+Shift+P` → `Tasks: Run Task` → `🔥 Web Developer Agent Mode`
2. Use launch configuration `🔥 Full Stack Development (Next.js + Firebase)`
3. Access custom snippets: `mccomponent`, `mcpage`, `mcform`

**Agent Capabilities**:
- Create Firebase-integrated components with proper authentication
- Implement business logic with multi-tenant patterns
- Design forms with validation using Momento Cake branding
- Set up real-time data subscriptions with error handling
- Generate TypeScript interfaces matching the data model

**Example Usage**:
```typescript
// Request: "Create an ingredient management form with validation"
// Agent will generate:
// - Form component with shadcn/ui styling
// - zod validation schema
// - Firebase Firestore integration
// - Momento Cake color scheme
// - TypeScript interfaces
// - Error handling and loading states
```

### **🎭 Web Tester Agent Activation**

**Via VS Code Tasks**:
1. `Ctrl+Shift+P` → `Tasks: Run Task` → `🎭 Web Tester Agent Mode`  
2. Use launch configuration `🎭 Testing Environment (Development + Playwright)`
3. Run specific test suites via debugging panel

**Agent Capabilities**:
- Generate E2E tests for complete user workflows
- Test authentication flows across different user roles
- Validate business operations (CRUD for ingredients/recipes)
- Perform cross-browser compatibility testing
- Audit accessibility and performance metrics
- Test Firebase real-time features and offline scenarios

**Example Usage**:
```typescript
// Request: "Create E2E tests for ingredient management workflow"
// Agent will generate:
// - Authentication setup for business users
// - CRUD operation tests with proper assertions
// - Cross-browser test scenarios
// - Performance and accessibility validation
// - Screenshot comparison for visual regression
// - Firebase emulator integration
```

## VS Code Integration

### **Launch Configurations**
```json
// Development
🚀 Next.js Development Server
🔥 Next.js + Firebase Emulators  
🔧 Next.js Development (Debug Mode)

// Testing
🎭 Playwright Test Runner
🎭 Playwright Test (Headed)
🎭 Playwright Test (Debug)
🎭 Playwright Test (MCP Integration)

// Production
🏗️ Next.js Build
🚀 Next.js Production Preview

// Compounds
🔥 Full Stack Development (Next.js + Firebase)
🎭 Testing Environment (Development + Playwright)
```

### **Tasks & Automation**
```json
// Development Tasks
🚀 Start Development Server
🔥 Start Firebase Emulators
🏗️ Build Production

// Testing Tasks  
🎭 Run E2E Tests (All Browsers)
🎭 Run E2E Tests (MCP Integration)
🔍 Performance Audit
♿ Accessibility Audit

// Agent Activation
🔥 Web Developer Agent Mode
🎭 Web Tester Agent Mode
```

### **Custom Snippets**
```typescript
// mccomponent - React component with TypeScript
// mcpage - Next.js page with metadata
// mcform - Form component with validation
// mcfirestore - Firestore hook for real-time data
```

## Development Workflow

### **1. Setup Environment**
```bash
cd admin
npm install
cp .env.local.example .env.local
# Configure Firebase credentials
firebase login
```

### **2. Activate Agent**
- Open VS Code workspace: `momentocake-admin.code-workspace`
- Run task: `🔥 Web Developer Agent Mode` or `🎭 Web Tester Agent Mode`
- Use appropriate launch configuration

### **3. Development Patterns**
- **Web Developer**: Focus on component creation, Firebase integration, business logic
- **Web Tester**: Focus on E2E scenarios, cross-browser testing, performance validation

### **4. Quality Gates**
- ESLint + Prettier compliance
- TypeScript strict mode validation  
- Firebase security rules compatibility
- WCAG 2.1 AA accessibility compliance
- Core Web Vitals performance thresholds

## Agent Coordination

### **Collaborative Workflow**
1. **Web Developer Agent** creates features with proper testing attributes
2. **Web Tester Agent** generates comprehensive test suites
3. Both agents ensure Momento Cake branding consistency
4. Integration testing validates end-to-end functionality

### **Shared Context**
- Same TypeScript interfaces and data models
- Consistent component patterns and styling
- Firebase configuration and security rules
- Business domain expertise (bakery operations)

## Quick Reference

### **Common Commands**
```bash
# Development
npm run dev              # Start with Turbopack
npm run dev:debug        # Debug mode

# Testing  
npx playwright test      # Run all tests
npx playwright test --ui # Visual test runner
npx playwright test --project=chromium # Chrome only

# Firebase
firebase emulators:start # Local Firebase
firebase deploy          # Deploy to production
```

### **File Structure**
```
admin/
├── .claude/
│   ├── agents/                    # Agent specifications
│   ├── commands/                  # Slash commands (/plan, /execute, /implement)
│   │   ├── plan.md                # Create PRD and AI handoff
│   │   ├── execute.md             # Orchestrate multi-phase execution
│   │   ├── implement.md           # Execute single phase
│   │   └── validate/              # Validation commands
│   ├── scripts/                   # Helper scripts (outside commands)
│   │   ├── analyze_dependencies.py
│   │   ├── orchestrate_execution.py
│   │   ├── validate_prerequisites.sh
│   │   └── cleanup_execution.sh
│   ├── templates/                 # PRD and platform templates (outside commands)
│   │   ├── PRD.md
│   │   ├── web_feature.md
│   │   └── ...
│   └── README.md                  # This file
├── .vscode/                       # VS Code configuration
├── src/
│   ├── app/                       # Next.js App Router
│   ├── components/                # React components
│   ├── hooks/                     # Custom hooks
│   ├── lib/                       # Utilities and config
│   └── types/                     # TypeScript definitions
└── tests/                         # Playwright E2E tests
```

---

**Usage**: Load the appropriate agent specification when working with Claude to get domain-specific expertise for Momento Cake admin system development and testing.