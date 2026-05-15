# MenteCart

MenteCart is a service booking app with a Flutter mobile client and a Node.js/Express/MongoDB backend. The current implementation covers the core service browsing flow, auth scaffolding, cart and booking endpoints, backend validation, and a Flutter BLoC-based services screen.

## Tech Stack

- Flutter 3.x / Dart 3.x
- BLoC for mobile state management
- Node.js + Express
- TypeScript
- MongoDB with Mongoose
- JWT authentication

## Project Structure

- `backend/` - Express API, Mongo models, controllers, services, validation
- `mobile/` - Flutter app with BLoC-based service browsing UI
- `admin-web/` - Static admin web console for admin login and service management

## Prerequisites

- Node.js 18+ and npm
- Flutter stable
- MongoDB running locally or a MongoDB connection string

## Environment Variables

Backend uses these values:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `MAX_BOOKINGS_PER_DAY`

See `backend/.env.example` for a sample.

## How to Run

### Backend

```bash
cd backend
npm install
npm run dev
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

## Current API Coverage

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /services`
- `GET /services/:id`
- `GET /cart`
- `POST /cart/add`
- `PATCH /cart/:itemId`
- `DELETE /cart/:itemId`
- `POST /bookings/checkout`
- `GET /bookings`
- `GET /bookings/:id`
- `POST /bookings/:id/cancel`

## Admin Web

The separate admin web console lives in `admin-web/`. It is kept outside the Flutter user app so admin login and service creation can be managed independently.

## Known Limitations

- Cart expiry/release timers are not implemented yet.
- Full Flutter BLoC coverage for auth/cart/bookings is not implemented yet; the current BLoC covers service browsing.
- Payment gateway integration and bonus infrastructure work are intentionally not included.
- The booking capacity model is enforced in application logic, but there is no dedicated slot collection yet.

## Notes

- The mobile app currently points to `http://192.168.1.100:5001`.
- The backend returns structured errors in the form `{ statusCode, message, errorCode? }`.
