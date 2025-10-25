# Momento Cake Admin - First Admin User Setup

## 🔐 **Admin Account Credentials**

**Email**: `momentocake@gmail.com`
**Password**: `i4uWyF9JD1B$`

⚠️ **IMPORTANT**: Save these credentials securely and change the password after first login.

---

## 🚀 **Quick Setup Steps**

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Project name: `momento-cake-admin`
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules later)
4. Select your preferred location
5. Click **Done**

### Step 4: Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web app** icon (`</>`)
4. App name: `Momento Cake Admin`
5. Click **Register app**
6. Copy the configuration object

### Step 5: Update Environment Variables

Replace the content of `.env.local` with your Firebase config:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=momento-cake-admin.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=momento-cake-admin
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=momento-cake-admin.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Step 6: Deploy Security Rules

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init firestore`
4. Deploy rules: `firebase deploy --only firestore:rules`

### Step 7: Create First Admin User

1. Restart your development server: `npm run dev`
2. Go to `http://localhost:3001`
3. You should be redirected to `/setup`
4. Fill in the form:
   - **Nome completo**: `Administrador Momento Cake`
   - **Email**: `momentocake@gmail.com`
   - **Senha**: `i4uWyF9JD1B$`
   - **Confirmar senha**: `i4uWyF9JD1B$`
5. Click **Criar conta de administrador**

---

## 🔒 **Security Notes**

1. **Change Password**: After first login, go to profile settings and change the password
2. **Two-Factor Auth**: Consider enabling 2FA in Firebase Console
3. **Access Control**: The system uses role-based access control with admin privileges
4. **Environment Variables**: Never commit `.env.local` to version control

---

## 🛠️ **Troubleshooting**

### Common Issues:

**"Firebase config not found"**
- Verify all environment variables are set correctly
- Restart the development server after updating `.env.local`

**"Permission denied"**
- Make sure Firestore security rules are deployed
- Check that Authentication is enabled in Firebase Console

**"User already exists"**
- If you need to reset, delete the user from Firebase Auth console
- Clear the users collection in Firestore

**"Network error"**
- Check your Firebase project is active
- Verify API keys are correct and not restricted

---

## 📱 **After Setup**

Once the admin user is created:

1. **Login**: Use `momentocake@gmail.com` / `i4uWyF9JD1B$`
2. **Dashboard**: You'll have access to the full admin panel
3. **User Management**: You can create additional admin or viewer accounts
4. **Business Management**: Manage multiple cake businesses through the platform

---

## 🌐 **Production Deployment**

When ready for production:

1. Update `NEXT_PUBLIC_APP_URL` to your production domain
2. Configure Firebase Auth authorized domains
3. Review and strengthen Firestore security rules
4. Set up Firebase hosting or deploy to your preferred platform

---

**Support**: If you encounter any issues, check the comprehensive setup guide in `FIREBASE_SETUP.md`