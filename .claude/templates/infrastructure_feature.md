# Infrastructure Platform Architecture

**IMPORTANT**: Infrastructure changes must be committed to `gango-infrastructure` repository, NOT this development repo.

## Terraform Modules
**Modules:**
- `<module_name>` - <description and resources>

## GCP Resources

### Cloud SQL
- Schema changes
- User permissions
- Backup configurations

### Cloud Run
- Service configuration
- Environment variables
- Scaling parameters

### VPC/Networking
- Connectivity requirements
- VPC connectors
- Firewall rules

### Secret Manager
- New secrets to manage
- Access permissions
- Rotation policies

## CI/CD Changes

### GitHub Actions Workflows
- Workflow modifications
- New deployment steps
- Environment-specific triggers

### Deployment Coordination
- Deployment order (infrastructure → backend → web/mobile)
- Rollback strategy
- Testing in dev environment

## Relevant Infrastructure Files (Reference Only)
- `terraform/modules/<module>/<file>.tf` - <infrastructure resource>
- `.github/workflows/<workflow>.yml` - <CI/CD pipeline>

## Infrastructure Implementation Tasks

### Terraform Planning
- [ ] Design Terraform module structure
- [ ] Plan GCP resource configurations
- [ ] Define environment-specific variables
- [ ] Document state management approach

### Infrastructure Changes
- [ ] Update/create Terraform modules
- [ ] Configure Cloud SQL changes
- [ ] Update Cloud Run service configuration
- [ ] Manage VPC/networking updates
- [ ] Add secrets to Secret Manager

### CI/CD Updates
- [ ] Update GitHub Actions workflows
- [ ] Add deployment coordination logic
- [ ] Implement rollback procedures
- [ ] Test in dev environment

### Validation
- [ ] Run terraform plan in dev
- [ ] Apply changes to dev environment
- [ ] Verify connectivity and access
- [ ] Document infrastructure changes

## Infrastructure Testing Strategy

### Terraform Validation
- Terraform plan validation
- Resource configuration verification
- State consistency checks

### Integration Testing
- Service connectivity tests
- Database accessibility verification
- Secret access validation

## Infrastructure Validation Commands

```bash
# Navigate to infrastructure directory
cd gango-infrastructure

# Initialize Terraform
terraform init

# Select dev workspace
terraform workspace select dev

# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes (dev environment)
terraform apply -auto-approve
```

## Infrastructure Notes

### Deployment Coordination
- Coordinate database migrations across environments
- Plan deployment order (usually: infrastructure → backend → web/mobile)
- Test thoroughly in dev environment before production
- Monitor application after deployment
- Have incident response plan ready

### Security Considerations
- Use VPC for database connectivity (no public IPs)
- Enable Cloud SQL automatic backups
- Implement proper IAM roles and permissions
- Use private artifact registry for container images
- Enable audit logging for infrastructure changes
