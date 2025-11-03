/**
 * Firestore Security Rules for Packaging Collections
 *
 * This file documents the security rules that should be configured in the Firebase Console
 * for the packaging management feature.
 *
 * The rules implement role-based access control:
 * - Admins (role == 'admin'): Full read/write access
 * - Viewers (role == 'viewer'): Read-only access
 * - Non-authenticated: No access
 *
 * Collections affected:
 * - packaging: Main packaging items collection
 * - packaging_stock_history: Stock movement audit trail
 * - packaging_price_history: Price tracking history
 *
 * FIRESTORE SECURITY RULES (v2)
 * ============================
 *
 * Copy and paste the following rules into your Firebase Console:
 * Firestore Database → Rules tab
 *
 * ---BEGIN RULES---
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *
 *     // === PACKAGING COLLECTION ===
 *     // Main collection for packaging items
 *     match /packaging/{document=**} {
 *       // All authenticated users can read
 *       allow read: if request.auth != null;
 *
 *       // Only admins can write (create, update, delete)
 *       allow write: if request.auth != null && request.auth.token.admin == true;
 *     }
 *
 *     // === STOCK HISTORY COLLECTION ===
 *     // Audit trail for stock movements
 *     match /packaging_stock_history/{document=**} {
 *       // All authenticated users can read
 *       allow read: if request.auth != null;
 *
 *       // Only admins can create new entries (via updatePackagingStock function)
 *       allow create: if request.auth != null && request.auth.token.admin == true;
 *
 *       // Prevent updates and deletes to maintain audit trail integrity
 *       allow update, delete: if false;
 *     }
 *
 *     // === PRICE HISTORY COLLECTION ===
 *     // Audit trail for price records
 *     match /packaging_price_history/{document=**} {
 *       // All authenticated users can read
 *       allow read: if request.auth != null;
 *
 *       // Only admins can create new entries (via createPriceHistory function)
 *       allow create: if request.auth != null && request.auth.token.admin == true;
 *
 *       // Prevent updates and deletes to maintain audit trail integrity
 *       allow update, delete: if false;
 *     }
 *   }
 * }
 *
 * ---END RULES---
 *
 * DEPLOYMENT INSTRUCTIONS
 * =======================
 *
 * 1. Navigate to Firebase Console (console.firebase.google.com)
 * 2. Select your project: "Momento Cake"
 * 3. Go to Firestore Database → Rules tab
 * 4. Replace the current rules with the rules above
 * 5. Click "Publish"
 * 6. Wait for the rules to be deployed (usually 1-2 minutes)
 *
 * TESTING RULES
 * =============
 *
 * Firebase Console provides a Rules Simulator to test your rules:
 *
 * 1. In the Rules tab, click "Rules simulator" button
 * 2. Test read operations on /packaging documents
 * 3. Test write operations (should fail for non-admins)
 * 4. Test stock_history and price_history read/write access
 *
 * KEY SECURITY FEATURES
 * ====================
 *
 * 1. Authentication Required
 *    - All access requires an authenticated Firebase user
 *    - Unauthenticated requests are denied
 *
 * 2. Role-Based Access Control
 *    - Admins: Full read/write on all collections
 *    - Viewers: Read-only on packaging collection
 *    - No direct access to history collections (read via queries only)
 *
 * 3. Audit Trail Integrity
 *    - History entries cannot be modified or deleted
 *    - Ensures accurate record of all stock and price changes
 *    - Only new entries can be added (via create operation)
 *
 * 4. Admin Token Validation
 *    - Custom claim "admin" in Firebase Auth token
 *    - Set when admin user is created/promoted
 *    - Validated on every write operation
 *
 * INTEGRATION WITH CODE
 * ====================
 *
 * The Firebase integration functions in src/lib/packaging.ts:
 *
 * 1. Automatically include the current user (getCurrentUserId)
 *   - Stored in 'createdBy' field for audit trail
 *
 * 2. Enforce admin-only operations:
 *   - createPackaging() → requires admin
 *   - updatePackaging() → requires admin
 *   - deletePackaging() → requires admin
 *   - updatePackagingStock() → requires admin
 *   - createPriceHistory() → requires admin
 *
 * 3. Allow read operations for all authenticated users:
 *   - fetchPackaging()
 *   - fetchPackagingItem()
 *   - fetchStockHistory()
 *   - fetchPriceHistory()
 *
 * IMPORTANT NOTES
 * ===============
 *
 * 1. These rules assume custom claims are set in Firebase Auth
 *    - For development, use Firebase Admin SDK to set custom claims
 *    - For production, integrate with your user management system
 *
 * 2. The rules use 'admin' custom claim, not 'role' claim
 *    - Adjust if your custom claim structure is different
 *    - Current user model in app uses role.type (admin/viewer)
 *
 * 3. History collections are append-only (no updates/deletes)
 *    - This ensures data integrity and prevents tampering
 *    - Required by business logic for audit trails
 *
 * 4. Custom indexes may be needed for performance
 *    - See packaging-management-feature.md for index definitions
 *    - Firestore will prompt to create indexes as needed
 *
 * TROUBLESHOOTING
 * ===============
 *
 * If you get "PERMISSION_DENIED" errors:
 * 1. Verify user is authenticated (check Firebase Auth console)
 * 2. Check if user has 'admin' custom claim (for write operations)
 * 3. Run Rules Simulator to test specific scenario
 * 4. Check browser console for detailed error messages
 *
 * If indexes are needed:
 * 1. Firestore will show a "Create index" link in error
 * 2. Click the link to create the required composite index
 * 3. Wait for index to be built (1-5 minutes typical)
 * 4. Retry the operation
 *
 * RELATED FILES
 * =============
 *
 * - src/lib/packaging.ts: Firebase integration functions
 * - src/types/packaging.ts: Type definitions
 * - src/lib/validators/packaging.ts: Zod validation schemas
 * - context/specs/0_master/packaging-management-feature.md: Full feature specification
 * - context/specs/web/packaging-management-feature.md: Web implementation plan
 *
 * ADMIN CLAIM SETUP
 * =================
 *
 * To set the 'admin' custom claim for a user:
 *
 * 1. Using Firebase Admin SDK (Node.js):
 *    ```javascript
 *    const admin = require('firebase-admin');
 *    admin.auth().setCustomUserClaims(uid, { admin: true })
 *      .then(() => {
 *        console.log('Admin claim set for user:', uid);
 *      });
 *    ```
 *
 * 2. Using Firebase CLI:
 *    ```bash
 *    firebase auth:import users.json --hash-algo=bcrypt
 *    ```
 *
 * 3. Check current user claims:
 *    ```javascript
 *    const idTokenResult = await user.getIdTokenResult(true);
 *    console.log('Admin claim:', idTokenResult.claims.admin);
 *    ```
 */

// This file is for documentation only - no executable code
