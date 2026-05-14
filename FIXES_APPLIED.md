# Fixes Applied

## Issue 1: Roles Not Appearing in Login
**Problem**: After login, user roles weren't showing up in the app, preventing admin features from being visible.

**Root Cause**: The `ApiService.isAdmin()` check was relying on asynchronous token storage that hadn't completed yet when HomeScreen was first rendered.

**Solution**: 
- Modified `AuthSuccess` state in `auth_bloc.dart` to carry the user's role directly
- Updated `_onLogin()` and `_onSignup()` to extract and pass the role from the API response
- Modified `HomeScreen` to receive `userRole` parameter from `AuthWrapper`
- Changed admin check from `ApiService.isAdmin()` to direct `widget.userRole == 'admin'` check

**Files Changed**:
- `mobile/lib/bloc/auth_bloc.dart` - Added role to AuthSuccess state
- `mobile/lib/main.dart` - Updated HomeScreen to use role from state

---

## Issue 2: Admin Add Services Screen Not Visible
**Problem**: Admins couldn't see the "Admin" tab in the bottom navigation bar to add services.

**Root Cause**: Same as Issue 1 - `ApiService.isAdmin()` was unreliable at initialization time.

**Solution**: Now that the role is reliably passed through the AuthSuccess state, the admin tab shows correctly when `userRole == 'admin'`.

**Files Changed**:
- `mobile/lib/main.dart` - Bottom navigation bar now uses `isAdmin` variable derived from `widget.userRole`

---

## Testing
To test:
1. Create an admin account (manually set role in MongoDB or use `backend/update-role.js`)
2. Login with admin credentials
3. The "Admin" tab should appear in bottom navigation
4. The "Create Service" form should be accessible
5. Roles should now persist correctly after login/app restart

---

## Backend Status
✅ Backend is already correctly:
- Returning `role` in login/signup responses
- Including `role` in JWT token payload
- Protecting admin endpoints with `checkAdminRole` middleware
