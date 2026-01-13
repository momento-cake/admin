# Bug: <bug name>

## Metadata
issue_number: `{issue_number or 'N/A'}`
platform(s): `<backend | web | mobile | infrastructure | multi-platform>`
severity: `<critical | high | medium | low>`
priority: `<p0 | p1 | p2 | p3>`
affected_environments: `<dev | staging | prod>`

## Bug Description

**Symptom:**
<What the user sees or experiences when the bug occurs>

**Expected Behavior:**
<What should happen in the correct scenario>

**Actual Behavior:**
<What actually happens when the bug occurs>

**Impact:**
<Who is affected and how severely? Include data on frequency, user impact, workarounds available>

## Problem Statement
<Clearly define the specific problem that needs to be solved. What is broken and why does it matter?>

## Solution Statement
<Describe the proposed solution approach. How will this fix address the root cause? Why is this the minimal viable fix?>

## Root Cause Analysis

### Investigation Steps
1. <What was examined first>
2. <What was discovered>
3. <What led to identifying root cause>

### Root Cause
<Detailed technical explanation of WHY the bug occurs. Include the exact mechanism of failure.>

**Technical Details:**
- **File**: `<full path to file>`
- **Function/Method**: `<function name>`
- **Line Number**: `<line number>`
- **Code Issue**: <Specific code problem - null pointer, race condition, incorrect logic, etc.>
- **Why It Fails**: <Explain the logical or technical reason for failure>

### Impact Analysis
- **Users Affected**: <Number, percentage, or user segments>
- **Frequency**: <How often does it occur>
- **Workaround Available**: Yes/No - <Describe workaround if available>
- **Data Loss Risk**: Yes/No - <Describe risk>
- **Security Implications**: Yes/No - <Describe security concern>
- **Performance Impact**: Yes/No - <Describe performance degradation>

## Fix Strategy

### Minimal Change Approach
<Describe the SMALLEST code change that will fix the root cause. Avoid refactoring, feature additions, or scope creep.>

**Specific Changes:**
1. File: `<path>:<line>` - Change: <Exact modification>
2. File: `<path>:<line>` - Change: <Exact modification>

### Backward Compatibility
- [ ] No breaking changes required
- [ ] Breaking changes required (document migration path below)

**Migration Path (if breaking changes):**
<Describe how existing code/data will be migrated>

### Database Changes
- [ ] No database changes required
- [ ] Flyway migration required: `V<version>__fix_<description>.sql`
- [ ] Data migration required: <Describe>

**Database Migration Details (if applicable):**
<Describe schema changes, data transformations, rollback strategy>

### Configuration Changes
- [ ] No configuration changes
- [ ] Environment variables changed: <List variables>
- [ ] Application properties changed: <List properties>

## Rollback Plan

### If Fix Causes New Issues
1. **Immediate Rollback**:
   - Revert commit: `git revert <commit-hash>`
   - Redeploy previous version
   - Notify affected users if necessary

2. **Data Restoration** (if applicable):
   - Run rollback migration: `V<version>__rollback_<description>.sql`
   - Restore from backup if needed
   - Verify data integrity

3. **Communication**:
   - Update issue tracker with rollback details
   - Notify team of rollback
   - Plan for alternative fix approach

### Monitoring After Deployment
- [ ] Monitor application logs for errors
- [ ] Check error tracking service (Sentry, etc.)
- [ ] Monitor performance metrics
- [ ] Verify user reports of bug decrease
- [ ] Monitor database performance
- [ ] Check API response times
- [ ] Verify no new error patterns emerge

## Notes

### Prevention Strategies
<How can we prevent this type of bug in the future?>
- Add linting rules
- Add validation at earlier stage
- Improve error handling patterns
- Add monitoring/alerting
- Update documentation
- Improve test coverage

### Related Issues
<List related bugs or issues that might need similar fixes>

### Technical Debt Identified
<Any technical debt discovered during bug investigation>

### Future Improvements
<Optional improvements that could be made later (not part of this fix)>

### Lessons Learned
<What did we learn from this bug? How can we improve?>
