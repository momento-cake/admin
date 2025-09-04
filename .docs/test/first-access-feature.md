# First Access Feature - Test Instructions

## Feature Overview
The "First Access" button allows invited users to complete their registration without receiving an email. Users must have a pending invitation created by an admin.

## Prerequisites
- Development server running at `http://localhost:3000`
- Access to Firebase Console or Firestore to create test invitations
- Two browser sessions (one for admin, one for new user)

---

## Test Scenario: Complete First Access Flow

### Step 1: Create an Invitation (Admin Side)
1. Login as admin user
2. Navigate to Users page (`/users`)
3. Click "Invite User" button
4. Fill in:
   - **Email**: `testuser@example.com`
   - **Name**: `Test User`
   - **Role**: `viewer` or `admin`
5. Submit invitation
6. Note: Email won't be sent, but invitation is created in database

### Step 2: Test First Access (New User Side)
1. Open new browser/incognito window
2. Go to `http://localhost:3000/login`
3. **Verify**: Login page shows "Primeiro Acesso" button below login form
4. Click **"Primeiro Acesso"** button

### Step 3: Email Validation
1. **Verify**: Form asks for email address
2. Enter: `testuser@example.com`
3. Click **"Verificar Convite"**
4. **Expected**: Form proceeds to registration step
5. **Verify**: Green success message shows "Convite válido para: testuser@example.com"

### Step 4: Complete Registration
1. **Verify**: Form is pre-filled with:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `testuser@example.com` (disabled field)
2. Fill in:
   - **Password**: `Test123!` (must have uppercase, lowercase, and number)
   - **Confirm Password**: `Test123!`
   - **Phone** (optional): `(11) 99999-9999`
3. Check **"Aceito os termos de uso"** checkbox
4. Click **"Criar Conta"**
5. **Expected**: Redirected to login page with success message

### Step 5: Verify Login Works
1. **Verify**: Success message shows "Conta criada com sucesso! Agora você pode fazer login."
2. Enter credentials:
   - Email: `testuser@example.com`
   - Password: `Test123!`
3. Click **"Entrar"**
4. **Expected**: Successfully logged in and redirected to dashboard

---

## Error Scenarios to Test

### Test 1: Invalid Email (No Invitation)
1. Click "Primeiro Acesso"
2. Enter email: `notinvited@example.com`
3. Click "Verificar Convite"
4. **Expected**: Error message "No pending invitation found for this email"

### Test 2: Expired Invitation
1. Create invitation with past expiration date (via database)
2. Try first access with that email
3. **Expected**: Error message "Invitation has expired"

### Test 3: Weak Password
1. Complete steps 1-3 of main flow
2. Enter weak password: `123456`
3. **Expected**: Error message "Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número"

### Test 4: Password Mismatch
1. Complete steps 1-3 of main flow
2. Enter different passwords in Password and Confirm Password
3. **Expected**: Error message "Senhas não coincidem"

### Test 5: Already Registered Email
1. Try first access with email that already has an account
2. **Expected**: Error during registration "An account with this email already exists"

---

## UI/UX Checks

### Navigation
- [ ] Back arrow returns to login form from email step
- [ ] Back arrow returns to email step from registration step
- [ ] Browser back button works correctly

### Visual Feedback
- [ ] Loading spinner shows during validation
- [ ] Password visibility toggle works (eye icon)
- [ ] Success messages are green
- [ ] Error messages are red
- [ ] Form fields show validation errors below inputs

### Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Test on tablet viewport (768px width)
- [ ] Test on desktop viewport (1920px width)
- [ ] All forms remain centered and readable

---

## Quick Test Data Setup

### Create Test Invitation via Firebase Console
1. Open Firebase Console → Firestore
2. Navigate to `invitations` collection
3. Add document with:
```json
{
  "email": "testuser@example.com",
  "name": "Test User",
  "role": "viewer",
  "status": "pending",
  "token": "test-token-123",
  "invitedBy": "admin-user-id",
  "invitedAt": "2024-01-30T10:00:00Z",
  "expiresAt": "2024-02-06T10:00:00Z",
  "metadata": {
    "department": "Sales"
  }
}
```

### Clean Up After Testing
1. Delete test user from Firebase Auth
2. Delete test user document from `users` collection
3. Update invitation status to `cancelled` or delete it

---

## Success Criteria
✅ User can access first access form from login page
✅ Email validation correctly identifies valid invitations
✅ Registration form pre-fills with invitation data
✅ Password requirements are enforced
✅ Account is created successfully
✅ User can login with new credentials
✅ Invitation status updates to "accepted"
✅ Error messages are clear and helpful
✅ Navigation between steps works smoothly
✅ Responsive on all device sizes