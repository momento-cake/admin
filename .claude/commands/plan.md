# Plan Work Item

Create a PRD for implementing features, fixing bugs, or completing chores.

## Variables

- `scope`: $ARGUMENT (optional: URL-friendly name like "user-auth-fix")
- `description`: $ARGUMENT (required: what needs to be done)

## Process

### Step 1: Get Scope Name
If not provided, ask for a URL-friendly scope name (lowercase, hyphens, max 40 chars).
Examples: `product-export`, `login-fix`, `update-deps`

### Step 2: Explore Codebase (Silent)
Search for related code to understand context:
- Use Glob to find related files
- Use Grep to search for similar patterns
- Identify files to modify and patterns to follow

### Step 3: Clarify (If Needed)
Only ask questions if truly unclear. Use AskUserQuestion with options:
- Work type? (Feature / Bug / Chore)
- Complexity? (Low: 1-2 files / Medium: 3-5 files / High: 6+ files)
- Any other critical clarifications

**Keep it brief** - don't ask obvious questions.

### Step 4: Create PRD
Create `context/specs/{SCOPE}/PRD.md` with:
- Summary (2-3 sentences)
- Problem & Solution
- Files to modify/create (from Step 2)
- Implementation tasks (1-3 phases, not always 5)
- Acceptance criteria

**Template reference**: `.claude/templates/PRD.md`

### Step 5: Create AI Handoff
Create `context/specs/{SCOPE}/ai-handoff.json`:

```json
{
  "scope": "{SCOPE}",
  "title": "Brief title",
  "prd_path": "context/specs/{SCOPE}/PRD.md",
  "phases": [
    {
      "number": 1,
      "name": "Phase Name",
      "prompt": "Implement X by doing Y. Reference pattern in Z. Run npm run build when done.",
      "dependencies": []
    }
  ]
}
```

### Step 6: Report
Return:
- PRD path: `context/specs/{SCOPE}/PRD.md`
- AI handoff path: `context/specs/{SCOPE}/ai-handoff.json`
- Summary of phases
- Ready to execute with `/execute {SCOPE}`

## Guidelines

**Keep it simple:**
- Small features = 1-2 phases
- Medium features = 2-3 phases
- Large features = 3-4 phases
- Don't create 5 phases for everything

**Be practical:**
- Focus on what changes, not boilerplate
- Reference existing patterns instead of explaining them
- Only include sections that are relevant

**Handoff prompts should be:**
- Self-contained (include file paths)
- Action-oriented (what to do, not theory)
- Testable (include validation commands)

## Platform Templates

For platform-specific guidance, reference templates in `.claude/templates/`:
- `web_feature.md`, `web_bug.md`, `web_chore.md` - Web (Next.js + Firebase)
- `base_feature.md`, `base_bug.md`, `base_chore.md` - Common patterns

## Example Usage

```bash
# Simple feature
/plan "product-export" "Add CSV export button to product list"

# Bug fix
/plan "login-redirect" "Fix redirect after login on mobile"

# Chore
/plan "deps-update" "Update Next.js to latest version"
```
