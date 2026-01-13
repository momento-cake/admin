# Implement

Execute implementation following a PRD or inline description.

## Variables

- `plan`: $ARGUMENTS (PRD path or inline description)

## Process

### 1. Understand
- Read the plan/PRD
- Identify files to modify
- Note patterns to follow

### 2. Search First
Before writing code, search for existing patterns:
```bash
rg "similar_pattern" --type ts
```
Never duplicate existing logic.

### 3. Clarify If Needed
Ask questions upfront if requirements are unclear. **Wait for answers** before proceeding.

### 4. Implement
Follow project patterns:
- **Types**: `src/types/`
- **Services**: `src/services/`
- **Hooks**: `src/hooks/`
- **Components**: `src/components/`
- **Pages**: `app/`

### 5. Validate
```bash
npm run build   # TypeScript check
npm run lint    # ESLint
npm run test    # Unit tests (if applicable)
npm run dev     # Manual testing
```

### 6. Report
Summarize:
- What was implemented
- Files changed
- Validation results
- Any issues or notes

## Guidelines

**Quality over speed:**
- Search for existing patterns first
- Ask questions if unclear
- Test as you go

**Follow existing patterns:**
- Look at similar files in the codebase
- Use shadcn/ui components
- Follow Firebase patterns in `src/lib/firebase/`

**Keep it simple:**
- Don't over-engineer
- Only add what's needed
- No unnecessary abstractions

## Example

```bash
# From PRD
/implement context/specs/product-export/PRD.md

# Inline
/implement "Add loading spinner to product list using existing Spinner component"
```
