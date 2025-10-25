# Infrastructure Platform Bug Debugging

**IMPORTANT**: Infrastructure changes must be committed to `gango-infrastructure` repository, NOT this development repo.

## Infrastructure Debugging Tools
- GCP Console (Cloud Run, Cloud SQL, VPC, Secret Manager)
- Cloud Logging (application and infrastructure logs)
- Cloud Monitoring (metrics, alerts, dashboards)
- Terraform plan/apply output
- `gcloud` CLI for GCP resource inspection
- VPC flow logs for networking issues
- Cloud SQL query insights

## Steps to Reproduce (Infrastructure)

### Environment Setup
<Describe the infrastructure environment where bug occurs>

### Reproduction Steps
1. <GCP resource or service affected>
2. <Configuration or operation that triggers bug>
3. <Observed infrastructure behavior>

**Expected Result:** <What infrastructure should do>
**Actual Result:** <What actually happens>
**Error Message:** <Cloud Run logs, Cloud SQL errors, Terraform errors, etc.>

### Reproduction Frequency
- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)

## Infrastructure Environment Details
- **GCP Project**: gango-app-dev | gango-app-prod
- **Region**: southamerica-east1
- **Terraform version**: <version>
- **Affected Resources**: <Cloud Run, Cloud SQL, VPC, Secret Manager, etc.>
- **Environment**: dev | staging | prod

## Relevant Infrastructure Files (Reference Only)

**IMPORTANT**: Changes must be made in `gango-infrastructure` repository.

### Files to Modify
- `terraform/modules/<module>/<file>.tf:<line>` - <Infrastructure resource modification>
- `.github/workflows/<workflow>.yml:<line>` - <CI/CD pipeline modification>
- `terraform/environments/<env>/main.tf:<line>` - <Environment configuration>

### Files to Reference (Patterns)
- <List similar infrastructure patterns to follow>

### New Files (if any)
- <List new Terraform modules or workflow files needed>

## Infrastructure Fix Implementation Tasks

### Task 1: Reproduce Bug in Dev Environment
- [ ] Verify bug exists in dev environment
- [ ] Check GCP Console for affected resources
- [ ] Review Cloud Logging for error messages
- [ ] Check Cloud Monitoring for metrics anomalies
- [ ] Inspect Terraform state: `terraform state list`
- [ ] Review recent infrastructure changes
- [ ] Document exact conditions and error messages

### Task 2: Verify Root Cause
- [ ] Analyze Terraform configuration files
- [ ] Check GCP resource configurations in console
- [ ] Review VPC connectivity (if networking issue)
- [ ] Verify Secret Manager secrets are accessible
- [ ] Check Cloud SQL instance configuration
- [ ] Review Cloud Run service configuration
- [ ] Inspect IAM roles and permissions
- [ ] Document confirmation of root cause

### Task 3: Plan Infrastructure Fix
- [ ] Design minimal Terraform changes needed
- [ ] Consider backward compatibility
- [ ] Plan for zero-downtime deployment if possible
- [ ] Identify resources that will be modified/recreated
- [ ] Document rollback strategy
- [ ] Estimate impact on running services

### Task 4: Implement Minimal Infrastructure Fix
- [ ] Update Terraform configuration files
- [ ] Run `terraform fmt -recursive` for formatting
- [ ] Run `terraform validate` to check syntax
- [ ] Run `terraform plan` to review changes
- [ ] Review plan output carefully for unexpected changes
- [ ] DO NOT modify unrelated infrastructure
- [ ] DO NOT add unnecessary resources
- [ ] Verify fix addresses root cause

### Task 5: Test in Dev Environment
- [ ] Select dev workspace: `terraform workspace select dev`
- [ ] Apply changes to dev: `terraform apply`
- [ ] Verify resources are created/updated correctly
- [ ] Test connectivity (VPC, Cloud SQL, Cloud Run)
- [ ] Check application logs for errors
- [ ] Verify services are healthy
- [ ] Test end-to-end functionality
- [ ] Document successful dev deployment

### Task 6: Monitor and Verify Fix
- [ ] Check Cloud Logging for errors
- [ ] Monitor Cloud Monitoring dashboards
- [ ] Verify Cloud Run service is serving traffic
- [ ] Test database connectivity from Cloud Run
- [ ] Verify secrets are accessible
- [ ] Test API endpoints for correct behavior
- [ ] Monitor for 24 hours in dev environment

## Infrastructure Testing Strategy

### Terraform Validation
- Configuration syntax checking
- Resource dependency validation
- State consistency checks
- Plan output review

### Integration Testing
- VPC connectivity tests
- Cloud SQL accessibility from Cloud Run
- Secret Manager access validation
- IAM permission verification
- Cloud Run service health checks
- Database migration execution

### Edge Cases to Test
- [ ] High traffic scenarios (Cloud Run scaling)
- [ ] Database connection pool exhaustion
- [ ] VPC connector failure/restart
- [ ] Secret rotation
- [ ] Terraform state corruption recovery
- [ ] Resource quota limits
- [ ] Multi-region failover (if applicable)

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

# Plan changes (review carefully)
terraform plan

# Apply changes to dev environment
terraform apply

# Verify specific resource
gcloud run services describe gango-backend-dev --region=southamerica-east1

# Check Cloud SQL instance
gcloud sql instances describe gango-backend-dev-postgres --project=gango-app-dev

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gango-backend-dev" --limit 50

# Test database connectivity
gcloud sql connect gango-backend-dev-postgres --user=gango_app --database=gango
```

## Infrastructure Manual Testing Checklist
- [ ] Verify bug no longer occurs in dev environment
- [ ] Test VPC connectivity (Cloud Run → Cloud SQL)
- [ ] Verify Secret Manager secrets are accessible
- [ ] Test Cloud Run service scaling behavior
- [ ] Check database performance (query execution time)
- [ ] Verify IAM roles and permissions are correct
- [ ] Test CI/CD pipeline (GitHub Actions)
- [ ] Check backup and restore procedures
- [ ] Monitor Cloud Logging for errors
- [ ] Review Cloud Monitoring dashboards
- [ ] Verify cost impact of infrastructure changes
- [ ] Test rollback procedure

## Infrastructure Deployment Coordination

### Pre-Deployment Checklist
- [ ] Notify team of infrastructure changes
- [ ] Schedule maintenance window if downtime expected
- [ ] Prepare rollback plan
- [ ] Backup critical data (database, configurations)
- [ ] Review Terraform plan output thoroughly
- [ ] Verify all secrets are in Secret Manager
- [ ] Check resource quotas are sufficient

### Deployment to Production
- [ ] Select prod workspace: `terraform workspace select prod`
- [ ] Run `terraform plan` and review carefully
- [ ] Get approval from team lead
- [ ] Apply changes: `terraform apply`
- [ ] Monitor application logs closely
- [ ] Verify services are healthy
- [ ] Test critical user flows
- [ ] Monitor for 24-48 hours
- [ ] Document deployment in changelog

### Post-Deployment Monitoring
- [ ] Monitor Cloud Logging for errors
- [ ] Check Cloud Monitoring metrics
- [ ] Verify Cloud Run service health
- [ ] Monitor database performance
- [ ] Check API response times
- [ ] Verify user reports of bug decrease
- [ ] Monitor costs for unexpected increases
