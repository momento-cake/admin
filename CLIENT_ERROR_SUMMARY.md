# Client Form Error - Quick Summary

## The Problem
When clicking "Criar Cliente" (Create Client), the form shows error:
```
7 PERMISSION_DENIED: Missing or insufficient permissions.
```

## Root Cause
The admin user document is **missing or incomplete** in Firestore.

## The Fix (3 Steps)

### Step 1: Get the Firebase Auth UID
1. Open Firebase Console → Authentication
2. Find user: `admin@momentocake.com.br`
3. Copy the UID (looks like: `AbC123XyZ456...`)

### Step 2: Check/Create User Document
1. Open Firebase Console → Firestore Database
2. Go to `users` collection
3. Look for a document with ID = the UID from Step 1

### Step 3: Ensure Document Has Correct Structure
The document must have:
```json
{
  "uid": "the-firebase-auth-uid",
  "email": "admin@momentocake.com.br",
  "role": {
    "type": "admin"
  },
  "isActive": true
}
```

## After the Fix
1. Log out of the app
2. Log back in
3. Try creating a client again
4. It should work!

---

## Why This Happened

The Firestore security rules (in `firestore.rules`) check if the user is an admin before allowing write operations:

```javascript
// Line 130-134 in firestore.rules
match /clients/{clientId} {
  allow write: if isAdmin();  // This checks if user document exists with role.type == "admin"
}
```

The `isAdmin()` function tries to read the user document:
```javascript
// Line 9-14 in firestore.rules
function isAdmin() {
  return isAuthenticated() &&
         exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&  // ← FAILING HERE
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role.type == 'admin' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isActive == true;
}
```

If the user document doesn't exist or doesn't have the right structure, the security rule blocks the write operation.

---

## What's NOT the Problem

- ✅ Form is sending correct data
- ✅ API is working correctly
- ✅ Firebase connection is working
- ✅ Authentication is working (user can log in)
- ✅ The `relatedPersons` and `specialDates` fields are NOT causing the issue

---

## Test Evidence

**Screenshot**: `/Users/gabrielaraujo/projects/momentocake/admin/screenshots/05-after-submit.png`

Shows the error message displayed in the modal after form submission.

**Full Diagnostic Report**: `CLIENT_FORM_ERROR_DIAGNOSTIC_REPORT.md`

Contains complete technical analysis with API request/response details.

---

## Need Help?

If the issue persists after following these steps:

1. Check the Firebase Console for any error messages
2. Verify the user document structure matches exactly
3. Try logging out and back in (to refresh the auth token)
4. Check the browser console for additional error details
