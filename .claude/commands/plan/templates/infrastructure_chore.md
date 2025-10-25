# Infrastructure Platform Chore

**IMPORTANT**: Infrastructure changes must be committed to `gango-infrastructure` repository, NOT this development repo.

## Infrastructure Files to Modify

- `terraform/<path>/<file>.tf` - <Why this file needs modification>
- `terraform/modules/<module>/<file>.tf` - <Module changes>
- `.github/workflows/<workflow>.yml` - <CI/CD pipeline changes>
- `terraform/environments/<env>/main.tf` - <Environment-specific configuration>
- `terraform/environments/<env>/variables.tf` - <Variable definitions>
- `terraform/environments/<env>/terraform.tfvars` - <Variable values>

## Infrastructure Step by Step Tasks

### Task: Make Infrastructure Changes
- [ ] Update Terraform configurations
- [ ] Run `terraform fmt -recursive` to format files
- [ ] Run `terraform validate` to check syntax
- [ ] Update CI/CD workflows (.github/workflows)
- [ ] Update environment configurations (dev, staging, prod)
- [ ] Update Terraform variables and tfvars files
- [ ] Add new GCP resources if needed
- [ ] Update Secret Manager secrets if needed
- [ ] Update VPC/networking configurations if needed
- [ ] Update Cloud Run service configurations
- [ ] Update Cloud SQL configurations
- [ ] Document infrastructure changes
- [ ] Test infrastructure changes in dev environment first
- [ ] Create Terraform plan for review: `terraform plan`
- [ ] Review plan output carefully for unexpected changes

## Infrastructure Testing Strategy

### Terraform Validation
- Configuration syntax checking: `terraform validate`
- Resource dependency validation
- State consistency checks
- Plan output review: `terraform plan`
- Format checking: `terraform fmt -check -recursive`

### Integration Testing
- Deploy to dev environment first
- Verify VPC connectivity
- Test Cloud SQL accessibility from Cloud Run
- Verify Secret Manager access
- Test IAM permission configurations
- Verify Cloud Run service health
- Test database migrations execute successfully
- Monitor Cloud Logging for errors

### Environment Testing
- Test changes in dev environment
- Verify zero-downtime deployment
- Test rollback procedure
- Monitor resource usage and costs
- Verify backup and restore procedures

## Infrastructure Validation Commands

```bash
# Navigate to infrastructure repository
cd gango-infrastructure

# Initialize Terraform
terraform init

# Select dev workspace
terraform workspace select dev

# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate

# Plan changes (review carefully)
terraform plan

# Apply changes to dev environment
terraform apply

# Verify specific resources
gcloud run services describe gango-backend-dev --region=southamerica-east1

# Check Cloud SQL instance
gcloud sql instances describe gango-backend-dev-postgres --project=gango-app-dev

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gango-backend-dev" --limit 50

# Test database connectivity
gcloud sql connect gango-backend-dev-postgres --user=gango_app --database=gango

# Check Terraform state
terraform state list

# Validate GitHub Actions workflow syntax
# (Use GitHub Actions workflow linter or push to test branch)
```

## Infrastructure Manual Testing Checklist
- [ ] Verify Terraform validation passes
- [ ] Review Terraform plan output thoroughly
- [ ] Test infrastructure changes in dev environment
- [ ] Verify Cloud Run service is healthy
- [ ] Test VPC connectivity (Cloud Run → Cloud SQL)
- [ ] Verify Secret Manager secrets are accessible
- [ ] Test database connectivity from Cloud Run
- [ ] Check Cloud Logging for errors
- [ ] Monitor Cloud Monitoring dashboards
- [ ] Verify IAM roles and permissions are correct
- [ ] Test CI/CD pipeline (GitHub Actions)
- [ ] Check backup and restore procedures
- [ ] Verify cost impact of infrastructure changes
- [ ] Test rollback procedure
- [ ] Monitor for 24 hours in dev environment

## Infrastructure Best Practices

**Terraform Updates:**
- Update Terraform version cautiously
- Check provider version compatibility
- Review breaking changes in new versions
- Test in dev environment first
- Update modules one at a time
- Keep Terraform state file secure

**Configuration Management:**
- Use workspaces for environment separation (dev, staging, prod)
- Store secrets in GCP Secret Manager, never in code
- Use variables for reusable values
- Document all infrastructure changes
- Version control all Terraform files
- Use modules for reusable infrastructure components

**Deployment Strategy:**
- Always apply changes to dev environment first
- Review `terraform plan` output carefully
- Verify no unexpected resource deletions/recreations
- Plan for zero-downtime deployments
- Have rollback plan ready
- Coordinate infrastructure changes with application deployments
- Monitor application after infrastructure changes

**Security:**
- Use VPC for database connectivity (no public IPs)
- Enable Cloud SQL automatic backups
- Implement proper IAM roles (principle of least privilege)
- Use private artifact registry
- Enable audit logging
- Rotate secrets regularly
- Enable Cloud SQL SSL connections

**Resource Management:**
- Tag resources for cost tracking
- Set up resource quotas
- Monitor resource usage
- Implement auto-scaling for Cloud Run
- Configure appropriate instance sizes
- Enable cost alerts
- Clean up unused resources

**CI/CD Pipeline:**
- Test GitHub Actions workflows in feature branches
- Use GitHub Environments for approval gates
- Implement proper secret management
- Add validation steps before deployment
- Enable workflow notifications
- Document pipeline changes
- Test rollback procedures
