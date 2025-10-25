# Backend Platform Bug Debugging

## Backend Debugging Tools
- Application logs: `gango-backend/logs/application.log`
- IntelliJ IDEA debugger with breakpoints
- Postman/curl for API testing
- PostgreSQL queries for database state
- Redis CLI for cache verification
- AWS/Firebase console for external service errors

## Steps to Reproduce (Backend)

### Environment Setup
<Describe the backend environment setup required>

### Reproduction Steps
1. <Specific API call or service invocation>
2. <Input data or state required>
3. <Action that triggers bug>

**Expected Result:** <What should happen>
**Actual Result:** <What actually happens>
**Error Message:** <Exact error message if any>

### Reproduction Frequency
- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)

## Backend Environment Details
- **Spring Boot version**: <version>
- **Java version**: <version>
- **Database**: PostgreSQL <version>
- **Redis**: <version if applicable>
- **AWS/GCP services**: <services involved>
- **Environment**: dev | staging | prod

## Relevant Backend Files

### Files to Modify
- `src/main/java/com/br/<package>/<File>.java:<line>` - <Why this file needs modification>
- `src/test/java/com/br/<package>/<Test>.java` - <Test to add/fix>

### Files to Reference (Patterns)
- <List files with similar patterns to follow for the fix>

### New Files (if any)
- <List new files needed, with purpose>

## Backend Fix Implementation Tasks

### Task 1: Reproduce Bug Locally
- [ ] Set up backend environment to match bug conditions
- [ ] Start Redis if needed: `redis-server`
- [ ] Start Spring Boot: `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
- [ ] Execute API call or service method that triggers bug
- [ ] Confirm bug exists and matches reported behavior
- [ ] Save logs and error messages as evidence

### Task 2: Verify Root Cause
- [ ] Add logging to suspected code locations
- [ ] Use debugger to step through problematic code path
- [ ] Query database to verify data state
- [ ] Check Redis cache for stale/corrupt data
- [ ] Verify external service responses (AWS, Firebase)
- [ ] Document confirmation of root cause

### Task 3: Write Failing Test
- [ ] Create unit test that reproduces bug (Service layer)
- [ ] Create integration test if API endpoint affected
- [ ] Test should fail with current code
- [ ] Add assertions for expected vs actual behavior
- [ ] Run test to confirm it fails: `./mvnw test -Dtest=<TestClass>#<testMethod>`

### Task 4: Implement Minimal Backend Fix
- [ ] Modify only the identified problematic code
- [ ] Add null checks, validation, or error handling as needed
- [ ] Update logging if helpful for future debugging
- [ ] Update database query if SQL issue
- [ ] Fix Redis caching logic if cache issue
- [ ] DO NOT refactor unrelated code
- [ ] DO NOT add new features
- [ ] Verify fix addresses root cause

### Task 5: Verify Test Now Passes
- [ ] Run the previously failing test
- [ ] Confirm test now passes
- [ ] Add edge case tests if needed
- [ ] Run full test suite: `./mvnw test`
- [ ] Fix any regressions

### Task 6: Manual Backend Verification
- [ ] Start backend locally: `./mvnw spring-boot:run`
- [ ] Reproduce original bug scenario via API
- [ ] Confirm bug no longer occurs
- [ ] Test with Postman/curl for different inputs
- [ ] Verify error responses are appropriate
- [ ] Check logs for proper logging
- [ ] Verify database state is correct
- [ ] Test performance (response time)

## Backend Testing Strategy

### Unit Tests
- Service layer business logic
- Repository data access
- Validation rules
- DTO mappers
- Error handling

### Integration Tests
- API endpoint behavior (request/response)
- Database operations (CRUD)
- External service integrations (AWS, Firebase)
- Authentication/authorization
- Error scenarios (400, 401, 404, 500)

### Edge Cases to Test
- [ ] Null/empty input values
- [ ] Invalid data formats
- [ ] Boundary values (min/max)
- [ ] Concurrent requests
- [ ] Large data volumes
- [ ] Database connection failures
- [ ] Redis unavailable
- [ ] External service timeouts
- [ ] Different user roles/permissions

## Backend Validation Commands

```bash
# Navigate to backend
cd gango-backend

# Compile code
./mvnw clean compile -DskipTests

# Run specific test for this bug
./mvnw test -Dtest=<TestClass>#<testMethod>

# Run full unit test suite
./mvnw test

# Run integration tests
./mvnw verify -Pintegration

# Check code quality
./mvnw checkstyle:check

# Start backend locally for manual testing
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## Backend Manual Testing Checklist
- [ ] Reproduce original bug scenario - verify it's fixed
- [ ] Test with different request payloads
- [ ] Test authentication/authorization flows
- [ ] Verify database queries are optimized
- [ ] Check Redis caching behavior
- [ ] Test external service integrations
- [ ] Verify error messages are user-friendly
- [ ] Check application logs for errors
- [ ] Test with production-like data volume
- [ ] Verify API documentation is accurate
