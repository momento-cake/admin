---
description: Generate spec using a specific template (simple, multiphase-planning, multiphase-execution)
argument-hint: [template] [context]
---

# Generate Spec with Template

Generate a spec document using a specified template. This command supports three templates:

- **simple**: Single-phase spec for straightforward tasks
- **multiphase-planning**: Three-phase planning (Explore → Clarify → Document)
- **multiphase-execution**: Phased implementation spec with AI handoff prompts

## Variables

- $param1: $1 - Template name (simple | multiphase-planning | multiphase-execution)
- $param2: $2 - Context or feature description

## Instructions

### 1. Determine Template

If $param1 is provided, use that template. Otherwise default to "simple".

Valid templates:
- `simple` - Use the simple spec template
- `multiphase-planning` - Use the PRD planning template with clarification
- `multiphase-execution` - Use the comprehensive phased execution template

### 2. Route to Appropriate Command

Based on the template, execute the corresponding command:

#### For `simple` template:
Execute `/cmd:generate-feature-spec` with the provided context.

#### For `multiphase-planning` template:
Execute `/cmd:generate-prd` with the provided context.

Before generating, follow this process:

**Phase 0: Silent Exploration**
- Search codebase for related patterns using Glob and Grep
- Identify existing conventions and similar implementations
- Gather context for informed questions

**Phase 1: Clarification**
Ask clarifying questions ONE AT A TIME using the interactive `agentcmd:question` format.
This renders an interactive UI with clickable options in the session viewer.

**Question Format:**
```agentcmd:question
{
  "id": "unique-question-id",
  "question": "Your question here?",
  "context": "Optional context from Phase 0 exploration (reference specific files/patterns found)",
  "options": [
    { "id": "1", "label": "Option 1", "description": "Brief explanation of this choice" },
    { "id": "2", "label": "Option 2", "description": "Brief explanation of this choice" },
    { "id": "3", "label": "Option 3", "description": "Brief explanation of this choice" }
  ],
  "allowCustom": true,
  "multiSelect": false
}
```

**Example questions to ask:**

1. **Work type** (single-select):
```agentcmd:question
{
  "id": "work-type",
  "question": "What type of work is this?",
  "context": "This helps determine the spec structure and complexity scoring approach.",
  "options": [
    { "id": "feature", "label": "Feature", "description": "New functionality being added" },
    { "id": "bugfix", "label": "Bug Fix", "description": "Fixing existing behavior" },
    { "id": "chore", "label": "Chore", "description": "Refactoring, maintenance, or infrastructure" }
  ],
  "allowCustom": true,
  "multiSelect": false
}
```

2. **Affected layers** (multi-select):
```agentcmd:question
{
  "id": "affected-layers",
  "question": "Which layers of the application will be affected?",
  "context": "Based on my analysis of [relevant files], I identified these potential areas.",
  "options": [
    { "id": "ui", "label": "UI/Frontend", "description": "React components, styles, client state" },
    { "id": "api", "label": "API/Backend", "description": "Routes, services, server logic" },
    { "id": "database", "label": "Database", "description": "Schema changes, migrations" },
    { "id": "shared", "label": "Shared/Types", "description": "Shared utilities, type definitions" }
  ],
  "allowCustom": true,
  "multiSelect": true
}
```

3. **Scope/complexity** (single-select):
```agentcmd:question
{
  "id": "scope",
  "question": "What's the expected scope of this change?",
  "options": [
    { "id": "small", "label": "Small", "description": "1-3 files, straightforward implementation" },
    { "id": "medium", "label": "Medium", "description": "4-10 files, some cross-cutting concerns" },
    { "id": "large", "label": "Large", "description": "10+ files, architectural impact" }
  ],
  "allowCustom": false,
  "multiSelect": false
}
```

**Key principles:**
- Reference specific files/patterns from Phase 0 exploration in the `context` field
- Ask questions ONE AT A TIME - wait for response before next question
- Use `multiSelect: true` when user can select multiple options (e.g., affected layers)
- Always include `allowCustom: true` unless options are exhaustive

**Phase 2: PRD Generation**
After clarification, generate the PRD.

#### For `multiphase-execution` template:
Execute `/cmd:generate-feature-spec` with enhanced instructions for:
- Multiple implementation phases (Data → Logic → UI → Testing)
- AI handoff prompts for each phase
- Detailed complexity scoring per task
- Completion notes sections per phase

### 3. Context Integration

If $param2 contains file references (paths starting with @):
- Read those files first to understand context
- Include relevant patterns in the spec
- Reference specific line numbers when applicable

### 4. Output

Follow the output format of the underlying command:
- Simple → Feature spec JSON output
- Multiphase Planning → PRD JSON output
- Multiphase Execution → Feature spec JSON output with enhanced phases

## Examples

### Example 1: Simple spec
```bash
/cmd:generate-spec-with-template simple "Add user profile avatar upload"
```

### Example 2: Multiphase planning with clarification
```bash
/cmd:generate-spec-with-template multiphase-planning "Implement real-time notifications system"
```

### Example 3: Multiphase execution with file references
```bash
/cmd:generate-spec-with-template multiphase-execution "Add OAuth login @src/auth/login.ts @src/api/auth.ts"
```

## Template Details

### Simple Template Structure
- Single-phase implementation
- Basic complexity scoring
- Standard validation commands
- Best for: Bug fixes, small features, config changes

### Multiphase Planning Template Structure
- Problem/Solution analysis
- User personas and requirements
- Technical approach (high-level)
- Risks and mitigations
- Best for: New features needing exploration, unclear requirements

### Multiphase Execution Template Structure
- 4-6 implementation phases
- AI handoff prompts per phase
- Detailed task breakdowns with complexity
- Completion notes sections
- Best for: Large features, team collaboration, phased delivery
