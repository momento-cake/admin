# Backend Platform Architecture

## API Endpoints
**Endpoints:**
- `POST /api/v1/<resource>` - <description>
- `GET /api/v1/<resource>/{id}` - <description>
- `PUT /api/v1/<resource>/{id}` - <description>
- `DELETE /api/v1/<resource>/{id}` - <description>

## Services
**Services:**
- `<ServiceName>Service` - <responsibility and key methods>

## Repositories
**Repositories:**
- `<RepositoryName>Repository` - <data access responsibility>

## Database Schema
**Tables:**
- <list new/modified tables>

**Flyway Migration:**
- `V<version>__<description>.sql`

**Indexes:**
- <required indexes for performance>

## AWS/GCP Services
**DynamoDB Tables:** <if applicable, specify partition/sort keys>
**S3 Buckets:** <if applicable, specify purpose>
**Cloud Run Services:** <if new service or configuration changes>
**Redis Caching:** <caching strategy and keys>

## Security
- Authentication requirements (JWT, Firebase tokens)
- Authorization rules (role-based access) - Check all Interceptor Configs
- Data validation requirements

## Relevant Backend Files
- `src/main/java/com/br/<package>/<File>.java` - <why relevant>
- `src/main/resources/db/migration/V<version>__<name>.sql` - <migration purpose>
- `src/test/java/com/br/<package>/<Test>.java` - <test coverage>
- `src/main/resources/application-dev.properties` - <configuration>

## Backend Implementation Tasks

### Database Design & Migration
- [ ] Design database schema (tables, columns, relationships)
- [ ] Plan indexes for query optimization
- [ ] Create Flyway migration script
- [ ] Test migration on local environment
- [ ] Verify migration rollback works
- [ ] Document schema changes

### Entity Models
- [ ] Create entity classes with JPA annotations
- [ ] Create DTO classes for API requests/responses
- [ ] Add validation annotations
- [ ] Implement mappers between entities and DTOs
- [ ] Write unit tests for mappers

### Repository Layer
- [ ] Create repository interfaces extending JpaRepository
- [ ] Add custom query methods if needed
- [ ] Implement repository tests with test database
- [ ] Verify query performance

### Service Layer
- [ ] Create service interfaces
- [ ] Implement business logic
- [ ] Add input validation
- [ ] Implement error handling
- [ ] Add Redis caching where appropriate
- [ ] Integrate external services (AWS, Firebase)
- [ ] Write comprehensive unit tests
- [ ] Mock external dependencies in tests

### REST Controllers
- [ ] Create controller classes
- [ ] Implement REST endpoints (GET, POST, PUT, DELETE)
- [ ] Add request validation (@Valid annotations)
- [ ] Implement authentication/authorization
- [ ] Add proper error responses
- [ ] Write integration tests for endpoints
- [ ] Update OpenAPI/Swagger documentation

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
- External service integrations
- Authentication/authorization
- Error scenarios

## Backend Validation Commands

```bash
# Navigate to backend directory
cd gango-backend

# Compile Java code
./mvnw clean compile -DskipTests

# Run unit tests
./mvnw test

# Run integration tests
./mvnw verify -Pintegration

# Check code quality
./mvnw checkstyle:check

# Start backend locally for manual testing
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
