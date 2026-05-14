# MenteCart Admin Web

A standalone admin web interface for MenteCart. It is separate from the mobile user app and is intended for admin login, service creation, and service review.

## Features

- Admin-only login against the existing backend
- Create new services
- View existing services
- Store JWT session in localStorage
- Keep the Flutter mobile app user-only

## Backend API Used

- `POST /auth/login`
- `GET /services`
- `POST /services`

## Setup

1. Make sure the backend is running.
2. Open `admin-web/index.html` in a browser, or serve the folder with any static file server.
3. Set the API base URL if your backend is not on `http://192.168.1.100:5001`.

## Notes

- This web app requires an admin account.
- If you log in with a normal user, the interface will reject the session.
- The mobile app has been reverted to user-only navigation with no admin UI.
