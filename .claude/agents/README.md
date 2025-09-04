---
name: "Agent Registry"
type: "registry"
version: "1.0.0"
purpose: "Central registry and identification system for Momento Cake agents"
last_updated: "2025-01-29"
---

# 🤖 Momento Cake Agent Registry

Central registry for all available Claude agents in the Momento Cake project.

## Available Agents

### 🔥 Web & Firebase Specialist
- **File**: `web-firebase-specialist.md`
- **Type**: `web-firebase-specialist`
- **Specialization**: Full-stack Web Development & Firebase Integration Expert
- **Primary Domains**: Next.js 15, TypeScript, Firebase v10, shadcn/ui, Tailwind CSS
- **Auto-Activation**: ✅ Enabled
- **Keywords**: component, firebase, form, authentication, firestore, UI, frontend, React

### 🎭 Web Tester (Playwright MCP)
- **File**: `web-tester-playwright.md`
- **Type**: `web-tester-playwright`
- **Specialization**: E2E Testing & Quality Assurance Expert with Playwright MCP Integration
- **Primary Domains**: Playwright MCP, Firebase Testing, Next.js E2E, User Journey Validation
- **Auto-Activation**: ✅ Enabled
- **Keywords**: test, e2e, playwright, testing, quality, performance, accessibility, validation
- **MCP Integration**: Playwright

### 📚 Usage Examples
- **File**: `usage-examples.md`
- **Type**: `documentation`
- **Purpose**: Reference guide for proper agent usage and coordination
- **Agents Covered**: web-firebase-specialist, web-tester-playwright

## Agent Selection Guide

### For Development Tasks
```yaml
Frontend Components: → web-firebase-specialist
Backend Integration: → web-firebase-specialist
Form Validation: → web-firebase-specialist
Authentication: → web-firebase-specialist
Firebase Operations: → web-firebase-specialist
```

### For Testing Tasks
```yaml
E2E Testing: → web-tester-playwright
Performance Testing: → web-tester-playwright
Accessibility Audits: → web-tester-playwright
Cross-browser Testing: → web-tester-playwright
User Journey Validation: → web-tester-playwright
```

### For Documentation & Examples
```yaml
Usage Examples: → usage-examples.md
Best Practices: → usage-examples.md
Agent Coordination: → usage-examples.md
```

## Quick Identification Format

Each agent file now includes structured YAML frontmatter:
```yaml
---
name: "Agent Name"
type: "agent-type"
version: "1.0.0"
specialization: "Brief description"
domains: ["Domain 1", "Domain 2"]
activation_keywords: ["keyword1", "keyword2"]
auto_activate: true/false
---
```

## Usage Instructions

1. **Automatic Detection**: Agents will be auto-selected based on keywords and context
2. **Manual Selection**: Reference specific agent file when needed
3. **Coordination**: Use multiple agents for complex workflows (development + testing)
4. **Examples**: Refer to `usage-examples.md` for practical implementation patterns

## Version History

- **v1.0.0** (2025-01-29): Initial agent registry with structured format
  - Added YAML frontmatter to all agent files
  - Implemented proper identification system
  - Created central registry for easy reference