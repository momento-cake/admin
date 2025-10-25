# Backend Platform Chore

## Backend Files to Modify

- `pom.xml` - <Why this file needs modification>
- `src/main/java/com/br/<package>/<File>.java` - <Why this file needs modification>
- `src/test/java/com/br/<package>/<Test>.java` - <Test updates needed>
- `src/main/resources/application.properties` - <Configuration changes>
- `src/main/resources/db/migration/<migration>.sql` - <Database migration if needed>

## Backend Step by Step Tasks

### Task: Make Backend Changes
- [ ] Update pom.xml dependencies (if dependency update)
- [ ] Run `./mvnw clean compile` to verify compilation
- [ ] Refactor backend code (if refactoring)
- [ ] Update imports and references
- [ ] Fix compilation errors
- [ ] Update configuration files (application.properties)
- [ ] Create database migrations if schema changes
- [ ] Update related unit tests
- [ ] Update integration tests
- [ ] Check for deprecated API usage
- [ ] Verify Redis caching still works (if cache-related)
- [ ] Verify AWS integrations still work (if AWS-related)

## Backend Testing Strategy

### Unit Tests
- Service layer business logic
- Repository data access methods
- Validation and error handling
- DTO mappers and transformations

### Integration Tests
- API endpoint functionality
- Database operations
- External service integrations (AWS, Firebase)
- Redis caching behavior
- Authentication and authorization

### Dependency Testing (for dependency updates)
- Verify all dependencies resolve correctly
- Check for version conflicts
- Test backwards compatibility
- Verify security updates don't break functionality

## Backend Validation Commands

```bash
# Navigate to backend
cd gango-backend

# Clean and compile
./mvnw clean compile -DskipTests

# Run unit tests
./mvnw test

# Run integration tests
./mvnw verify -Pintegration

# Check code quality
./mvnw checkstyle:check

# Verify no dependency conflicts
./mvnw dependency:tree

# Check for outdated dependencies
./mvnw versions:display-dependency-updates

# Start backend locally to verify
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## Backend Manual Testing Checklist
- [ ] Verify compilation succeeds
- [ ] Run all backend tests (unit + integration)
- [ ] Check for dependency conflicts
- [ ] Test API endpoints with Postman/curl
- [ ] Verify database migrations run successfully
- [ ] Check Redis caching behavior
- [ ] Verify external service integrations (AWS, Firebase)
- [ ] Check application logs for warnings/errors
- [ ] Test authentication and authorization
- [ ] Verify API documentation is still accurate

## Backend Best Practices

**Dependency Updates:**
- Update one major dependency at a time
- Test thoroughly after each major update
- Check Spring Boot compatibility matrix
- Verify AWS SDK compatibility
- Test Redis client compatibility

**Refactoring:**
- Follow existing Spring Boot patterns
- Maintain SOLID principles
- Keep service layer thin, logic in domain
- Use dependency injection consistently
- Update tests alongside code changes

**Configuration:**
- Keep dev/prod configurations separate
- Use environment variables for secrets
- Update both application-dev.properties and application-prod.properties
- Document configuration changes in CLAUDE.md

**Database Migrations:**
- Use Flyway for schema changes
- Never modify existing migrations
- Test migrations on clean database
- Document migration purpose in comments
