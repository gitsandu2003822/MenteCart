# Role-Based Login & Admin Features - Testing Guide

## What Was Fixed

### Issue 1: Roles Not Appearing on Login ✅
**Before:** After login, the user's role was not available in the mobile app, even though the backend was sending it.

**After:** The role is now:
- Extracted directly from the login/signup API response
- Passed through the AuthBloc state to the HomeScreen
- Available immediately after login

**Debug Info:** The AppBar subtitle now displays `Role: admin` or `Role: user` so you can verify it's working.

### Issue 2: Admin UI Not Showing ✅
**Before:** The "Admin" tab didn't appear in the bottom navigation, and there was no way to add services.

**After:** 
- The admin tab now appears in the bottom navigation when the user's role is "admin"
- The "Create Service" form is accessible from the Admin tab

---

## Step-by-Step Testing

### 1. Create a Test Account
**In the mobile app:**
- Open the app
- Click "Don't have account? Sign Up"
- Enter email: `admin@test.com`
- Enter password: `password123`
- Click "Sign Up"

**Result:** You'll see the role display as `Role: user` in the AppBar.

### 2. Promote the Account to Admin
**In terminal (from backend directory):**
```bash
cd backend
node promote-to-admin.js admin@test.com
```

**Expected output:**
```
Connecting to MongoDB...
Connected to MongoDB
Found user: admin@test.com (current role: user)
✓ User admin@test.com promoted to admin role
```

### 3. Test the Admin Features
**In the mobile app:**
- **Option A:** Logout and login again with the same credentials
  - Click the logout icon in AppBar
  - Enter `admin@test.com` and `password123`
  - Login

- **Option B:** Hot reload the app (if developing)
  - The app should automatically refresh the role

**Expected results:**
- ✅ AppBar subtitle shows `Role: admin`
- ✅ Bottom navigation now has 4 tabs: Services, Cart, Bookings, **Admin**
- ✅ Click "Admin" tab to access the service creation form

### 4. Test Adding a Service
**In the Admin tab:**
- Fill in the form:
  - Title: `Premium Massage`
  - Description: `90-minute therapeutic massage`
  - Price: `1500`
  - Duration: `90` (minutes)
  - Category: `spa`
  - Capacity per Slot: `3`
- Click "Create Service"

**Expected results:**
- ✅ Success message appears: "Service created successfully!"
- ✅ Form clears
- ✅ Services appear in the Services tab

---

## Troubleshooting

### "Admin" tab still not showing after promoting account

1. **Check the role promotion worked:**
   ```bash
   cd backend
   npm run dev
   # Then in another terminal, login with the account and check the console logs
   ```

2. **Check debug output:**
   - Look at Flutter console output (run `flutter run` with verbose logging)
   - Should see: `DEBUG: Login result:` with the user object containing `"role": "admin"`
   - Should see: `DEBUG HomeScreen: userRole=admin, isAdmin=true`

3. **Verify backend is returning role:**
   - Test with Postman/curl:
   ```bash
   curl -X POST http://localhost:5001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"password123"}'
   ```
   - Response should include: `"role":"admin"` in the user object

### Can't add service even though admin tab shows

- **Check you're actually logged in as admin** (verify role in AppBar)
- **Check backend is running** with admin role middleware enabled
- **Check network errors** - look at Flutter console for HTTP errors

---

## How It Works

1. **Backend** (`authService.ts`):
   - Returns user object with `role: "admin"` or `role: "user"` in login/signup response
   - Includes `role` in JWT token payload for future API calls

2. **Mobile App** (`auth_bloc.dart`):
   - Extracts role from `result['user']['role']` in the login/signup handler
   - Passes role to `AuthSuccess(user, role: userRole)` state
   - AuthWrapper passes role to HomeScreen as constructor parameter

3. **HomeScreen** (`main.dart`):
   - Receives `userRole` parameter
   - Sets `isAdmin = widget.userRole == 'admin'`
   - Shows/hides admin tab and routes based on isAdmin flag
   - Displays role in AppBar subtitle for debugging

---

## Files Modified

- `backend/promote-to-admin.js` - NEW: Script to promote users to admin
- `mobile/lib/bloc/auth_bloc.dart` - Added role extraction & debugging
- `mobile/lib/main.dart` - Added userRole parameter, role display, admin UI
