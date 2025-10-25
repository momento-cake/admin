# Firebase Setup Guide - Momento Cake Admin

This guide will help you set up a real Firebase project for the Momento Cake admin system.

## Prerequisites

- Google account
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "momento-cake-admin")
4. Enable Google Analytics (recommended)
5. Select or create Analytics account
6. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication" > "Sign-in method"
2. Click on "Email/Password" provider
3. Enable "Email/Password" 
4. Save the changes

## Step 3: Create Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Start in **production mode** (we have custom rules)
4. Choose a location close to your users
5. Click "Done"

## Step 4: Get Firebase Configuration

1. Go to "Project settings" (gear icon)
2. Scroll to "Your apps" section
3. Click "Web app" icon (`</>`)
4. Register app with name "Momento Cake Admin"
5. **Copy the Firebase configuration object**

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Replace the placeholder values with your Firebase config:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-actual-app-id
```

## Step 6: Deploy Firestore Security Rules

1. Initialize Firebase in your project:
```bash
firebase login
firebase init firestore
```

2. Select your Firebase project
3. Use the existing `firestore.rules` file
4. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

## Step 7: Create Initial Collections (Optional)

The application will automatically create collections as needed. However, you can create them manually:

### Users Collection
- Collection ID: `users`
- Documents will be created automatically when users sign up

### Businesses Collection  
- Collection ID: `businesses`
- Documents will be created when businesses are added

## Step 8: Test the Application

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:3001`
3. You should be redirected to `/setup` if no admin users exist
4. Create the first admin account
5. Login with the admin credentials

## Security Rules Overview

The `firestore.rules` file implements:

- **Admin-only access** to user management
- **Business isolation** - users can only access their business data
- **Role-based permissions** (admin, viewer, business users)
- **Account status checking** - disabled accounts cannot access data

## Troubleshooting

### Cannot connect to Firebase
- Check if environment variables are correctly set
- Verify Firebase project configuration in console
- Ensure your domain is added to authorized domains (for production)

### Permission denied errors
- Verify Firestore rules are deployed
- Check user roles in the `users` collection
- Ensure user account is active (`isActive: true`)

### Setup page not showing
- Clear browser storage/cookies
- Check if admin users already exist in Firestore
- Verify `checkIfAdminsExist` function is working

## Production Deployment

### Environment Variables
For production deployment, set these environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-production-app-id
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Considerations

1. **Authorized domains**: Add your production domain to Firebase Auth
2. **API key restrictions**: Restrict your API key to specific domains
3. **Backup strategy**: Set up automated Firestore backups
4. **Monitoring**: Enable Firebase monitoring and alerts

## Firebase CLI Commands

Useful Firebase CLI commands for management:

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy entire project
firebase deploy

# View project info
firebase projects:list

# Switch project
firebase use project-id

# Run local emulators
firebase emulators:start
```

## Support

For issues related to:
- **Firebase setup**: Check Firebase documentation
- **Authentication flow**: Review the auth hooks and components
- **Security rules**: Test with Firebase emulator
- **Environment config**: Verify all variables are set correctly