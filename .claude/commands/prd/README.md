# PRD Workflow Commands

This directory contains the PRD (Product Requirements Document) workflow commands adapted from the Spectora mobile-flutter project for use with the Momento Cake Admin web application.

## Overview

The PRD workflow provides a structured approach to planning and implementing features, bug fixes, and chores using:
- **Three-phase planning process** with codebase exploration
- **Scope-based naming** instead of ticket numbers
- **AI handoff prompts** for phase-by-phase execution
- **Flexible git strategies** (worktrees, new branches, or current branch)

## Commands

### `/plan` - Create PRD

Creates a comprehensive Product Requirements Document with AI handoff prompts.

**File**: `plan.md`

**Usage**:
```bash
/plan "scope-name" "Work item description"
```

**Process**:
1. **Phase 0: Exploratory Analysis** - Searches codebase for related patterns
2. **Phase 1: Requirements Clarification** - Asks context-aware questions
3. **Phase 2: PRD Creation** - Creates comprehensive PRD document
4. **Phase 3: AI Handoff Generation** - Generates phase-by-phase implementation prompts

**Output**:
- `context/specs/{SCOPE}/PRD.md`
- `context/specs/{SCOPE}/ai-handoff.json`

### `/implement` - Execute Phase

Implements a plan step-by-step following best practices.

**File**: `implement.md`

**Usage**:
```bash
/implement context/specs/{SCOPE}/PRD.md
/implement "Inline plan description"
```

**Workflow**:
1. Read and analyze plan
2. Search for existing patterns
3. Clarify requirements
4. Write tests
5. Implement by architecture layer
6. Validate continuously

### `/execute` - Orchestrate Multi-Phase Execution

Orchestrates multi-phase execution by spawning fresh Claude sessions.

**File**: `execute.md`

**Usage**:
```bash
/execute scope-name
/execute offline-product-photos
```

**Features**:
- **Git Strategy Options**: Worktree, new branch, or current branch
- **Fresh Context**: New Claude session per phase
- **Parallel Execution**: Independent phases run in parallel
- **Heartbeat Monitoring**: 60-second progress updates
- **Automatic PR Creation**: Creates PR after successful execution

**Expected Duration**: 30-90 minutes

## Architecture Adaptation

### From Spectora Mobile (Flutter) to Momento Cake Web (Next.js)

**Changes Made**:

1. **Ticket → Scope Naming**:
   - Spectora: Linear ticket numbers (MOB-1234)
   - Momento Cake: Scope names (offline-product-photos)

2. **Architecture Layers**:
   - Spectora: Screens, Providers, ViewModels, Models, Repositories, Services, ObjectBox
   - Momento Cake: Pages, Components, Hooks, Services, Types, Firebase

3. **Tech Stack**:
   - Spectora: Flutter, Riverpod, ObjectBox, Freezed
   - Momento Cake: Next.js, React, Firebase, shadcn/ui, Zod

4. **Testing**:
   - Spectora: Widget tests, Unit tests, TDD workflow
   - Momento Cake: Playwright E2E, Unit tests, Component tests

5. **Git Strategy**:
   - Spectora: Always uses worktrees
   - Momento Cake: User chooses (worktree/new branch/current branch)

6. **Commands**:
   - Spectora: `make rebuild`, `make tests`, `make lint`
   - Momento Cake: `npm run build`, `npm run test`, `npm run lint`, `npx playwright test`

## Supporting Scripts

**Location**: `.claude/commands/scripts/`

### Python Scripts

**orchestrate_execution.py**:
- Orchestrates phase execution with proper process management
- Spawns Claude sessions with heartbeat monitoring
- Handles signal interrupts gracefully

**analyze_dependencies.py**:
- Analyzes phase dependencies from ai-handoff.json
- Generates execution plan with parallel grouping

### Bash Scripts

**validate_prerequisites.sh**:
- Validates environment and prerequisites
- Resolves scope paths
- Checks for required files

**cleanup_execution.sh**:
- Cleans up worktrees and temporary files
- Removes branches (with confirmation)
- Cleans execution logs

## PRD Template

**Location**: `.claude/commands/templates/PRD.md`

Comprehensive PRD template adapted for Next.js + Firebase web architecture with sections for:
- Metadata (scope, type, complexity)
- Problem & Solution statements
- Web Architecture (pages, components, hooks, services, Firebase)
- Types & Schemas (TypeScript, Zod)
- Implementation Tasks (organized by phases)
- Testing Strategy (unit, E2E, edge cases)
- Acceptance Criteria

## Directory Structure

```
.claude/commands/prd/
├── README.md              # This file
├── plan.md                # /plan command
├── implement.md           # /implement command
└── execute.md             # /execute command

.claude/commands/scripts/
├── orchestrate_execution.py    # Python orchestrator
├── analyze_dependencies.py     # Dependency analyzer
├── validate_prerequisites.sh   # Validation script
└── cleanup_execution.sh        # Cleanup script

.claude/commands/templates/
└── PRD.md                 # PRD template

context/specs/
├── {scope-1}/
│   ├── PRD.md
│   └── ai-handoff.json
├── {scope-2}/
│   ├── PRD.md
│   └── ai-handoff.json
└── ...
```

## Configuration

### Bash Timeout (Required for `/execute`)

Edit `~/.claude/settings.json`:
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "5400000",
    "BASH_MAX_TIMEOUT_MS": "7200000"
  }
}
```

Restart Claude Code after making changes.

## Usage Examples

### Example 1: Feature Development

```bash
# 1. Create PRD
/plan "user-profile-edit" "Allow users to edit their profile information including name, email, and avatar"

# 2. Review PRD
# - Check context/specs/user-profile-edit/PRD.md
# - Review ai-handoff.json phases

# 3. Execute all phases
/execute user-profile-edit
# Choose git strategy: Use worktree
# Enter branch name: user-profile-edit-feature
# Wait 30-90 minutes for completion
# PR created automatically

# 4. Review and merge PR
```

### Example 2: Bug Fix

```bash
# 1. Create PRD for bug
/plan "login-redirect-fix" "Fix login redirect not working after session expiry on mobile devices"

# 2. Review PRD
# - Phases likely: Reproduce → Write Test → Fix → Validate

# 3. Execute phases
/execute login-redirect-fix
# Choose: Use current branch (already on fix branch)
# Executes quickly (bug fixes typically 2-4 phases)

# 4. Commit and push
```

### Example 3: Single Phase Implementation

```bash
# Use /implement for simple changes or single phases
/implement "Add loading spinner to product list page using existing LoadingSpinner component"

# Or implement specific phase from PRD
/implement context/specs/product-export/PRD.md
```

## Best Practices

### Planning

1. **Always run `/plan` first** - Don't skip the planning phase
2. **Use descriptive scope names** - Make them URL-friendly and clear
3. **Answer clarifying questions thoroughly** - Better input → better PRD
4. **Review PRD before executing** - Ensure it matches your expectations

### Implementation

1. **Search for existing patterns first** - Never duplicate code
2. **Ask questions upfront** - Don't proceed with assumptions
3. **Write tests for new functionality** - Quality over speed
4. **Validate continuously** - Run tests after each change
5. **Self-review before completion** - Check for quality issues

### Execution

1. **Use worktrees for large features** - Keeps main codebase clean
2. **Use new branch for standard features** - Simpler than worktrees
3. **Use current branch for quick fixes** - When already on feature branch
4. **Keep session active** - Execution takes 30-90 minutes
5. **Monitor logs** - Check `logs/execution/` if issues occur

## Troubleshooting

### Bash Timeout

**Issue**: Command times out after a few minutes

**Solution**: Configure bash timeout in `~/.claude/settings.json` and restart Claude Code

### Missing Prerequisites

**Issue**: `/execute` fails with "AI handoff file not found"

**Solution**: Run `/plan` first to create PRD and ai-handoff.json

### Phase Failures

**Issue**: Phase fails during execution

**Solution**:
- Check logs in `logs/execution/phase-X.log`
- Fix issues in worktree/branch
- Commit fixes
- Continue or restart execution

### Worktree Cleanup

**Issue**: Old worktrees taking up space

**Solution**:
```bash
bash .claude/commands/scripts/cleanup_execution.sh branch-name
```

## Migrating from Spectora Patterns

If you're familiar with the Spectora mobile project commands:

| Spectora | Momento Cake | Notes |
|----------|--------------|-------|
| `/plan "MOB-1234" "desc"` | `/plan "scope-name" "desc"` | Use scope instead of ticket |
| Worktree only | User choice | Choose git strategy |
| `make rebuild` | `npm run build` | Next.js build |
| `make tests` | `npm run test` | Unit tests |
| `make lint` | `npm run lint` | ESLint |
| Widget tests | Playwright E2E | Different test framework |
| ObjectBox | Firebase Firestore | Different database |
| Freezed models | Zod schemas | Different validation |

## Credits

This PRD workflow is adapted from the Spectora mobile-flutter project's planning and execution system. Key adaptations were made for:
- Next.js + Firebase web architecture
- Scope-based naming (instead of tickets)
- Flexible git strategies
- Web-specific testing and validation

Original Spectora system designed for Flutter mobile development with Linear ticket integration.
