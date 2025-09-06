# Firebase Deployment Guide

This guide provides step-by-step instructions for deploying the Momento Cake Admin application to Firebase Hosting with multi-environment support.

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 20+ installed
- [ ] Firebase CLI installed globally (`npm install -g firebase-tools`)
- [ ] Firebase project created (both dev and prod)
- [ ] GitHub repository set up with secrets configured

## Firebase Projects Setup

### Development Environment
- **Project ID**: `momentocake-admin-dev`
- **Domain**: `https://momentocake-admin-dev.web.app`
- **Firebase Config**:
```javascript
{
  apiKey: "AIzaSyAtj_dM0gsUaQiG9mnPKeQ5lp1Lcj7PY4s",
  authDomain: "momentocake-admin-dev.firebaseapp.com",
  projectId: "momentocake-admin-dev",
  storageBucket: "momentocake-admin-dev.firebasestorage.app",
  messagingSenderId: "847106871689",
  appId: "1:847106871689:web:e98fe63fd92acd846c9158"
}
```

### Production Environment (To be configured)
- **Project ID**: `momentocake-admin`
- **Domain**: `https://momentocake-admin.web.app`

## Local Development Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd admin
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```

4. **Start Firebase emulators** (optional):
```bash
npm run emulators
```

5. **Start development server**:
```bash
npm run dev
```

## Manual Deployment

### Deploy to Development
```bash
# Build and deploy to development
npm run deploy:dev

# Or step by step:
firebase use dev
npm run build:firebase
firebase deploy --only hosting --non-interactive
```

### Deploy to Production
```bash
# Build and deploy to production
npm run deploy:prod

# Or step by step:
firebase use prod
npm run build:firebase
firebase deploy --only hosting --non-interactive
```

### Deploy Security Rules
```bash
# Deploy Firestore and Storage rules
npm run deploy:rules

# Deploy Firestore indexes
npm run deploy:indexes

# Full deployment (hosting + rules + indexes)
npm run deploy
```

## CI/CD Deployment

### GitHub Actions Workflows

Two workflows are configured for automatic deployment:

#### Development Deployment (`.github/workflows/deploy-dev.yml`)
- **Triggers**: Push to `develop`, `dev`, `main` branches, PRs to `main`
- **Environment**: Development (`momentocake-admin-dev`)
- **Features**: 
  - Linting and type checking
  - Build verification
  - Rules deployment
  - Hosting deployment
  - PR comment with preview URL

#### Production Deployment (`.github/workflows/deploy-prod.yml`)
- **Triggers**: Push to `main`, version tags (`v*`), manual dispatch
- **Environment**: Production (`momentocake-admin`)
- **Features**:
  - Full test suite
  - Linting and type checking
  - Build verification
  - Rules and indexes deployment
  - Hosting deployment
  - Release creation (for tags)

### GitHub Secrets Configuration

Configure these secrets in your GitHub repository settings:

#### Development Secrets
```
FIREBASE_TOKEN=<your-firebase-ci-token>
FIREBASE_API_KEY_DEV=AIzaSyAtj_dM0gsUaQiG9mnPKeQ5lp1Lcj7PY4s
FIREBASE_AUTH_DOMAIN_DEV=momentocake-admin-dev.firebaseapp.com
FIREBASE_PROJECT_ID_DEV=momentocake-admin-dev
FIREBASE_STORAGE_BUCKET_DEV=momentocake-admin-dev.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID_DEV=847106871689
FIREBASE_APP_ID_DEV=1:847106871689:web:e98fe63fd92acd846c9158
FIREBASE_MEASUREMENT_ID_DEV=<optional-ga-measurement-id>
```

#### Production Secrets (To be configured)
```
FIREBASE_API_KEY_PROD=<your-prod-api-key>
FIREBASE_AUTH_DOMAIN_PROD=<your-prod-auth-domain>
FIREBASE_PROJECT_ID_PROD=momentocake-admin
FIREBASE_STORAGE_BUCKET_PROD=<your-prod-storage-bucket>
FIREBASE_MESSAGING_SENDER_ID_PROD=<your-prod-sender-id>
FIREBASE_APP_ID_PROD=<your-prod-app-id>
FIREBASE_MEASUREMENT_ID_PROD=<optional-prod-ga-id>
```

### Getting Firebase CI Token
```bash
firebase login:ci
# Copy the generated token and add it to GitHub Secrets as FIREBASE_TOKEN
```

## Initial Data Setup

### Create Admin User and Sample Data
```bash
# Set up initial admin user and sample data
npm run firebase:init

# Or with emulators:
npm run emulators:seed
```

**Admin Credentials** (Development):
- Email: `admin@momentocake.com`
- Password: `MomentoCake2024!`

## Firebase Configuration Files

### `firebase.json`
- **Hosting**: Configured for static export with proper caching headers
- **Firestore**: Rules and indexes configuration
- **Storage**: Rules configuration  
- **Emulators**: Local development configuration

### Security Rules
- **Firestore Rules** (`firestore.rules`): Role-based access control with admin/viewer/business user permissions
- **Storage Rules** (`storage.rules`): File upload security with user/business isolation

### Indexes (`firestore.indexes.json`)
- User queries by business and activity status
- Order queries by status and delivery date
- Invitation queries by email and status

## Environment Variables

### Required Environment Variables
- `NEXT_PUBLIC_ENVIRONMENT`: `dev` or `prod`
- Firebase configuration variables (see `.env.example`)

### Optional Environment Variables  
- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR`: Enable emulator connection
- `NEXT_PUBLIC_APP_URL`: Application base URL
- Analytics and monitoring variables

## Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Linting passes
- [ ] TypeScript compiles without errors
- [ ] Environment variables configured
- [ ] Firebase rules tested
- [ ] Security review completed

### Post-deployment
- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Database operations function
- [ ] File uploads work
- [ ] Performance is acceptable
- [ ] Error logging active

## Troubleshooting

### Common Issues

**Build Errors**:
```bash
# Clear Next.js cache
npm run clean
npm run build
```

**Firebase CLI Issues**:
```bash
# Re-authenticate
firebase logout
firebase login

# Check project configuration
firebase use --list
```

**Deployment Failures**:
```bash
# Check Firebase project access
firebase projects:list

# Verify authentication
firebase auth:list --project momentocake-admin-dev
```

**Environment Issues**:
```bash
# Verify environment variables
printenv | grep NEXT_PUBLIC_FIREBASE
```

### Performance Optimization

- Static assets cached for 1 year
- HTML files not cached for immediate updates
- Images optimized with `unoptimized: true` for static export
- Bundle analysis available via `npm run analyze`

### Security Considerations

1. **Firestore Rules**: Strict role-based access control
2. **Storage Rules**: File upload restrictions and user isolation
3. **Environment Variables**: Sensitive data in GitHub Secrets
4. **Authentication**: Firebase Auth with custom claims
5. **HTTPS**: Enforced by Firebase Hosting

## Monitoring and Maintenance

- Monitor deployment via GitHub Actions
- Check Firebase console for errors
- Review analytics and performance metrics
- Regular security updates
- Backup Firestore data periodically

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review Firebase console logs
3. Verify environment variables
4. Test locally with emulators
5. Contact development team