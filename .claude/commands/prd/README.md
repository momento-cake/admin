# PRD Workflow

Simple planning and autonomous execution for Momento Cake Admin.

## Commands

### `/plan` - Create PRD
```bash
/plan "scope-name" "Description of what to build"
```

Creates:
- `context/specs/{SCOPE}/PRD.md` - Requirements document
- `context/specs/{SCOPE}/ai-handoff.json` - Phase prompts for execution

### `/implement` - Execute Single Phase
```bash
/implement context/specs/product-export/PRD.md
/implement "Add loading spinner to product list"
```

### `/execute` - Autonomous Multi-Phase Execution
```bash
/execute product-export
```

Spawns fresh Claude sessions for each phase defined in ai-handoff.json.

## AI Handoff Format

The `ai-handoff.json` file drives autonomous execution:

```json
{
  "scope": "product-export",
  "title": "Add CSV export to product list",
  "prd_path": "context/specs/product-export/PRD.md",
  "phases": [
    {
      "number": 1,
      "name": "Export Service",
      "prompt": "Create a CSV export service in src/services/exportService.ts. Follow the pattern in src/services/productService.ts. The service should take an array of products and return a CSV string. Run npm run build when done.",
      "dependencies": []
    },
    {
      "number": 2,
      "name": "Export Button",
      "prompt": "Add an 'Export CSV' button to app/products/page.tsx. Use the Button component from shadcn/ui. Wire it to the exportService from Phase 1. Follow the existing button patterns on the page. Run npm run build && npm run lint when done.",
      "dependencies": [1]
    }
  ]
}
```

**Key points for handoff prompts:**
- Self-contained (include file paths)
- Reference existing patterns
- Include validation commands
- Specify dependencies between phases

## Workflow

```
1. /plan "scope" "description"
   ↓
   Creates PRD.md + ai-handoff.json

2. Review the PRD and ai-handoff.json

3. /execute scope
   ↓
   - Asks for git strategy
   - Spawns Claude per phase
   - Runs 30-90 minutes
   - Creates PR automatically
```

## Configuration

For `/execute` to work, configure bash timeout:

**~/.claude/settings.json**:
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "5400000",
    "BASH_MAX_TIMEOUT_MS": "7200000"
  }
}
```

Restart Claude Code after changes.

## Files

```
.claude/commands/prd/
├── plan.md          # /plan command
├── implement.md     # /implement command
├── execute.md       # /execute command
└── README.md        # This file

.claude/commands/scripts/
├── orchestrate_execution.py   # Phase executor
├── analyze_dependencies.py    # Dependency analyzer
├── validate_prerequisites.sh  # Validation
└── cleanup_execution.sh       # Cleanup

.claude/commands/templates/
└── PRD.md           # PRD template

context/specs/
└── {scope}/
    ├── PRD.md
    └── ai-handoff.json
```

## Examples

### Simple Feature
```bash
/plan "product-export" "Add CSV export button to product list"
# Review PRD
/execute product-export
```

### Bug Fix
```bash
/plan "login-fix" "Fix redirect after login on mobile"
# Review PRD
/execute login-fix
```

### Quick Implementation (no autonomous execution)
```bash
/implement "Add loading state to customer list"
```
