# MenteCart API Testing Guide - Roles & Service Creation

## Quick Reference: Test Flow

### 1. **Signup a User**
```bash
curl -X POST http://localhost:5001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}'
```

**Response:**
```json
{
  "user": {
    "_id": "USER_ID_HERE",
    "email": "testuser@example.com",
    "role": "user"
  },
  "token": "JWT_TOKEN_HERE"
}
```

---

### 2. **Attempt Service Creation as Regular User (Should Fail 403)**
```bash
curl -X POST http://localhost:5001/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN_HERE" \
  -d '{
    "title": "Test Service",
    "description": "A test service",
    "price": 100,
    "duration": 60,
    "category": "wellness",
    "capacityPerSlot": 5
  }'
```

**Expected Response (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Admin role required",
  "errorCode": "FORBIDDEN"
}
```

---

### 3. **Promote User to Admin (Database Operation)**
**Using MongoDB shell:**
```bash
mongosh mentecart
# Inside mongosh:
db.users.updateOne({email: "testuser@example.com"}, {$set: {role: "admin"}})
```

**Or using Node.js script:**
```bash
cd backend
node -e "
const mongoose = require('mongoose');
const User = require('./src/models/User').default;
mongoose.connect('mongodb://localhost:27017/mentecart').then(() => {
  User.updateOne({email: 'testuser@example.com'}, {role: 'admin'})
    .then(r => { console.log('Updated'); process.exit(0); });
});
"
```

---

### 4. **Login Again to Get New Admin Token**
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}'
```

**Response now includes:**
```json
{
  "user": {
    "_id": "USER_ID_HERE",
    "email": "testuser@example.com",
    "role": "admin"
  },
  "token": "NEW_ADMIN_JWT_TOKEN_HERE"
}
```

---

### 5. **Create Service as Admin (Should Succeed 201)**
```bash
curl -X POST http://localhost:5001/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer NEW_ADMIN_JWT_TOKEN_HERE" \
  -d '{
    "title": "Premium Massage",
    "description": "90-minute therapeutic massage",
    "price": 150,
    "duration": 90,
    "category": "spa",
    "capacityPerSlot": 3
  }'
```

**Expected Response (201 Created):**
```json
{
  "_id": "SERVICE_ID",
  "title": "Premium Massage",
  "description": "90-minute therapeutic massage",
  "price": 150,
  "duration": 90,
  "category": "spa",
  "capacityPerSlot": 3,
  "createdAt": "2026-05-14T04:30:44.836Z",
  "updatedAt": "2026-05-14T04:30:44.836Z"
}
```

---

## Complete Full Booking Flow Test

### Prerequisites
- Backend running: `npm run dev` (port 5001)
- MongoDB running: `mongod` or MongoDB Community
- Update `192.168.1.100` to your actual backend IP if needed

### Step 1: Signup
```bash
SIGNUP=$(curl -s -X POST http://localhost:5001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"customer1@test.com","password":"pass123"}')

USER_TOKEN=$(echo $SIGNUP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

echo "Token: $USER_TOKEN"
echo "User ID: $USER_ID"
```

### Step 2: Browse Services (Public, No Auth Required)
```bash
curl -s -X GET "http://localhost:5001/services?page=1&limit=10" | jq .
```

**Response:**
```json
{
  "data": [
    {
      "_id": "SERVICE_ID",
      "title": "Premium Massage",
      "price": 150,
      "duration": 90,
      "category": "spa",
      "capacityPerSlot": 3
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "hasMore": false
}
```

### Step 3: Get Service by ID
```bash
curl -s -X GET "http://localhost:5001/services/SERVICE_ID" | jq .
```

### Step 4: Check Availability for a Date
```bash
curl -s -X GET "http://localhost:5001/services/SERVICE_ID/availability?date=2026-05-15" | jq .
```

**Response:**
```json
{
  "serviceId": "SERVICE_ID",
  "date": "2026-05-15",
  "slots": [
    {
      "time": "09:00 AM",
      "remainingCapacity": 3,
      "available": true
    },
    {
      "time": "11:00 AM",
      "remainingCapacity": 3,
      "available": true
    }
  ]
}
```

### Step 5: Add to Cart
```bash
curl -s -X POST http://localhost:5001/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "serviceId": "SERVICE_ID",
    "date": "2026-05-15",
    "timeSlot": "09:00 AM",
    "quantity": 1
  }' | jq .
```

### Step 6: View Cart
```bash
curl -s -X GET http://localhost:5001/cart \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

### Step 7: Checkout (Create Booking)
```bash
curl -s -X POST http://localhost:5001/bookings/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"paymentMethod": "cash"}' | jq .
```

**Response:**
```json
{
  "_id": "BOOKING_ID",
  "userId": "USER_ID",
  "items": [
    {
      "serviceId": "SERVICE_ID",
      "date": "2026-05-15",
      "timeSlot": "09:00 AM",
      "quantity": 1,
      "price": 150
    }
  ],
  "totalPrice": 150,
  "status": "confirmed",
  "paymentStatus": "paid",
  "paymentMethod": "cash",
  "createdAt": "2026-05-14T05:00:00.000Z"
}
```

### Step 8: Get Bookings
```bash
curl -s -X GET http://localhost:5001/bookings \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

### Step 9: Get Booking Details
```bash
curl -s -X GET "http://localhost:5001/bookings/BOOKING_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

### Step 10: Cancel Booking (if within cutoff window)
```bash
curl -s -X POST "http://localhost:5001/bookings/BOOKING_ID/cancel" \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

### Step 11: Pay for Pending Booking (if using card payment)
```bash
curl -s -X POST "http://localhost:5001/bookings/BOOKING_ID/pay" \
  -H "Authorization: Bearer $USER_TOKEN" | jq .
```

---

## Environment Variables (backend/.env)
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/mentecart
JWT_SECRET=your-secret-key-here
MAX_BOOKINGS_PER_DAY=3
BOOKING_CANCEL_CUTOFF_HOURS=24
```

---

## Key Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/signup` | No | - | Create user account |
| POST | `/auth/login` | No | - | Login user |
| GET | `/services` | No | - | List all services (paginated) |
| GET | `/services/:id` | No | - | Get service details |
| GET | `/services/:id/availability` | No | - | Check available slots for date |
| **POST** | **`/services`** | **Yes** | **Admin** | **Create new service** |
| GET | `/cart` | Yes | - | View cart |
| POST | `/cart/add` | Yes | - | Add item to cart |
| PATCH | `/cart/:itemId` | Yes | - | Update cart item |
| DELETE | `/cart/:itemId` | Yes | - | Remove cart item |
| POST | `/bookings/checkout` | Yes | - | Checkout cart → create bookings |
| GET | `/bookings` | Yes | - | List user's bookings |
| GET | `/bookings/:id` | Yes | - | Get booking details |
| POST | `/bookings/:id/cancel` | Yes | - | Cancel booking |
| POST | `/bookings/:id/pay` | Yes | - | Simulate card payment |

---

## Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Admin role required |
| 409 | Conflict | Capacity full / duplicate slot / email taken |
| 500 | Server Error | Database or server error |

