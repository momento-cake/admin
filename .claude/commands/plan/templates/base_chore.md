# Chore: <chore name>

## Metadata
issue_number: `{issue_number or 'N/A'}`
platform(s): `<backend | web | mobile | infrastructure | multi-platform>`
complexity: `<low | medium | high>`
estimated_effort: `<hours or story points>`

## Chore Description
<Describe the chore in detail, including what needs to be updated, refactored, or improved and why>

## Motivation
<Explain why this chore is necessary. What problem does it solve? What improvement does it provide?>

## Scope

Define what is included and what is excluded from this chore.

**Included:**
- <Item 1>
- <Item 2>

**Excluded (for future chores):**
- <Item 1>
- <Item 2>

## Relevant Files

### Files to Modify
<List files that need modification - platform-specific sections will be added from platform templates>

### New Files (if any)
- <path/to/new/file> - <purpose>

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Task 1: Research and Planning
- [ ] Review current state of code/configuration
- [ ] Identify all files that need changes
- [ ] Check for dependencies or related code
- [ ] Review existing patterns to follow
- [ ] Document breaking changes (if any)

### Task 2: Backup and Preparation
- [ ] Create feature branch for chore
- [ ] Ensure tests pass before making changes
- [ ] Document current behavior (if refactoring)
- [ ] Identify potential risks

<Platform-specific tasks will be inserted here from platform templates>

### Update Documentation
- [ ] Update README files with any changes
- [ ] Update inline code comments if logic changed
- [ ] Update API documentation if endpoints changed
- [ ] Add CHANGELOG entry if user-facing

### Testing
- [ ] Run unit tests for affected platforms
- [ ] Run integration tests
- [ ] Test manually if needed
- [ ] Verify no regressions introduced

### Code Review Preparation
- [ ] Self-review all changes
- [ ] Ensure consistent code style
- [ ] Remove debug code or console logs
- [ ] Verify all files are included

### Validation (Final Step)
- [ ] Execute all validation commands (see platform-specific sections)
- [ ] Verify zero regressions
- [ ] Confirm chore objectives are met
- [ ] Test on dev environment

## Testing Strategy

### Regression Tests
- Verify existing functionality still works
- Run full test suite for affected platforms
- Test integration points

### Specific Chore Tests
<List specific tests for this chore>
- Test 1: <Description>
- Test 2: <Description>

<Platform-specific testing strategies will be added from platform templates>

## Acceptance Criteria

Chore is complete when:
- [ ] All planned changes are implemented
- [ ] All tests pass (zero regressions)
- [ ] Code style is consistent
- [ ] Documentation is updated
- [ ] No breaking changes (or documented if necessary)
- [ ] Dependencies are updated and compatible
- [ ] Build succeeds on all platforms
- [ ] Code review is completed

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes documented below

**Breaking Changes (if applicable):**
<Describe breaking changes and migration path>

## Rollback Plan

If issues arise after deployment:
1. Revert commit: `git revert <commit-hash>`
2. Restore dependencies: Reinstall dependencies for affected platforms
3. Verify rollback: Run full test suite
4. Notify team

## Notes

### Best Practices for This Chore
<List best practices specific to this chore>

### Future Improvements
<Optional improvements to consider later>

### Related Chores
<Link to related chores or follow-up work>

### Dependencies
<List any dependencies on other work or external factors>
