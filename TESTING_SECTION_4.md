# Section 4 Testing & Verification Guide

## Quick Start Testing

### 1. Cart Item Hold Expiration (15 minutes)

**Test Scenario**: Verify cart items expire after 15 minutes and free up capacity

**Steps**:
1. Create a service with capacity=2 (edit in admin web or via API)
2. Create 2 user accounts
3. User 1: Add same service+slot to cart (qty 1)
4. User 2: Try to add same service+slot (qty 1) → Should succeed (1 confirmed, 1 held)
5. User 3: Try to add same service+slot (qty 1) → Should fail with 409 (2 held, 0 available)
6. Wait 15+ minutes
7. User 3: Try again → Should succeed now (holds expired)

**Verification**:
- Check MongoDB: `db.cartexpirations.find({ released: false })` before expiry
- After sweep (60s): Should see `released: true`
- Check `db.slotcapacities` to verify held counts decrease

**API**:
```bash
# Add to cart (creates hold)
POST /cart/add
{ "serviceId": "...", "date": "2026-05-15", "timeSlot": "10:00 AM", "quantity": 1 }

# Check capacity (should include held items)
GET /services/availability?serviceId=...&date=2026-05-15&slot=10:00 AM
```

---

### 2. Daily Booking Limit (Max 3)

**Test Scenario**: User can book max 3 services per day

**Steps**:
1. Create 4 different services
2. User adds all 4 to cart
3. Try checkout → Should fail with 409 "Daily booking limit reached"
4. Remove 1 item, retry → Should succeed
5. Verify booking only contains 3 items

**Verification**:
- Check environment: `MAX_BOOKINGS_PER_DAY` (default 3)
- MongoDB: `db.bookings.find({ userId: "...", "items.date": "2026-05-15" }).count()` ≤ 3

---

### 3. Slot Capacity Atomicity

**Test Scenario**: No overbooking even with concurrent requests

**Steps**:
1. Create service with capacity=1
2. 2 users both try to book same slot simultaneously
3. One succeeds (409), one fails (409 Conflict)
4. Verify only 1 booking exists, capacity not exceeded

**Verification**:
```bash
# Query available capacity
db.slotcapacities.findOne({ 
  serviceId: ObjectId("..."), 
  date: "2026-05-15", 
  timeSlot: "10:00 AM" 
})
# Response: { totalCapacity: 1, confirmedCount: 1, heldCount: 0, availableCount: 0 }
```

---

### 4. Cancellation Releases Capacity

**Test Scenario**: Cancelled booking frees up slot for new bookings

**Steps**:
1. Service capacity = 2
2. User A books slot (confirmed) → 1/2 available
3. User B books same slot (confirmed) → 0/2 available
4. User C tries to book same slot → Fails 409
5. User A cancels booking
6. User C tries again → Should succeed

**Verification**:
- Before cancellation: `db.slotcapacities.findOne(...).confirmedCount` = 2
- After cancellation: `db.slotcapacities.findOne(...).confirmedCount` = 1

---

### 5. Paid vs Unpaid Bookings

**Test Scenario**: Card bookings pending until payment, cash immediate

**Steps**:
1. User A: Checkout with `paymentMethod: "cash"` → Status = "confirmed" immediately
2. User B: Checkout with `paymentMethod: "card"` → Status = "pending"
3. User B: Call `/pay` → Status = "confirmed", `paymentStatus: "paid"`

**Verification**:
```bash
# Cash booking
db.bookings.findOne({ paymentMethod: "cash" })
# Response: { status: "confirmed", paymentStatus: "unpaid" }

# Card booking before payment
db.bookings.findOne({ paymentMethod: "card", paymentStatus: "pending" })
# Response: { status: "pending", paymentStatus: "pending" }

# Card booking after payment
db.bookings.findOne({ paymentMethod: "card", paymentStatus: "paid" })
# Response: { status: "confirmed", paymentStatus: "paid" }
```

---

### 6. Auto-Lifecycle Transitions

**Test Scenario**: Bookings auto-fail/complete when time passes

**Steps**:
1. User books service for tomorrow at 2:00 PM with `paymentMethod: "card"` (stays pending)
2. Manually update `bookings[0].createdAt` to be 2 hours in past
3. Manually update current date to be after the service slot time
4. Wait for sweep (60s) or call any booking endpoint
5. Check booking status → Should be "completed" (cash) or "failed" (card unpaid)

**Verification**:
- File: [backend/src/services/bookingService.ts](backend/src/services/bookingService.ts#L77) - `refreshBookingLifecycle()`
- Logs should show: "Booking lifecycle sweep"

---

### 7. Audit Logging

**Test Scenario**: All status changes logged

**Steps**:
1. Create booking (cash, auto-confirmed)
2. Cancel it
3. Check AuditLog collection

**Verification**:
```bash
db.auditlogs.find({ entityType: "booking", entityId: ObjectId("...") })
# Response should include:
# { action: "created", actor: { role: "user" }, ... }
# { action: "cancelled", actor: { role: "user" }, reason: "User cancelled booking" }
```

---

### 8. Status Guard Transitions

**Test Scenario**: Cannot transition backward from final states

**Steps**:
1. Create completed booking
2. Try to transition back to "pending" → Fails
3. Try to transition to "confirmed" → Fails
4. Try to mark as "completed" again → Succeeds (idempotent)

**Verification**:
- File: [backend/src/services/bookingService.ts](backend/src/services/bookingService.ts#L233) - Guard checks

---

## Manual API Testing

### Prerequisites
```bash
# Set test env vars
export MONGO_URI="mongodb://..."
export PORT=5000
export MAX_BOOKINGS_PER_DAY=3
export BOOKING_SWEEP_INTERVAL_MS=60000

# Start backend
cd backend
npm run dev
```

### Test Sequence

**Setup**:
```bash
TOKEN=$(curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

SERVICE_ID=$(curl -X GET http://localhost:5000/services?limit=1 | jq -r '.data[0]._id')
```

**Test Cart Hold**:
```bash
# Add to cart (creates 15-min hold)
curl -X POST http://localhost:5000/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "'$SERVICE_ID'",
    "date": "2026-05-15",
    "timeSlot": "10:00 AM",
    "quantity": 1
  }'

# Query cart
curl -X GET http://localhost:5000/cart \
  -H "Authorization: Bearer $TOKEN"
```

**Test Checkout**:
```bash
# Checkout
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}'

# Should return booking with status: "confirmed"
```

**Test Capacity Exceeded**:
```bash
# For same service/date/slot that's now full
curl -X POST http://localhost:5000/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "'$SERVICE_ID'",
    "date": "2026-05-15",
    "timeSlot": "10:00 AM",
    "quantity": 1
  }'

# Try checkout - should fail with 409 "Slot full for service"
```

---

## Database Verification Commands

```bash
# Connect to MongoDB
mongo $MONGO_URI

# Check slot capacity
db.slotcapacities.find({ date: "2026-05-15" }).pretty()

# Check cart holds
db.cartexpirations.find({ released: false }).pretty()

# Check audit logs
db.auditlogs.find({ entityType: "booking" }).sort({ createdAt: -1 }).limit(5).pretty()

# Check booking status history
db.bookings.findOne({ _id: ObjectId("...") }).statusHistory

# Count daily bookings per user
db.bookings.aggregate([
  { $match: { userId: ObjectId("..."), "items.date": "2026-05-15" } },
  { $group: { _id: null, count: { $sum: 1 } } }
])
```

---

## Troubleshooting

### Cart Items Not Expiring
- Check if `sweepExpiredCartHoldsService` is running: Look for logs "Cart hold expiration sweep" every 60s
- Verify `CartExpiration.expiresAt` is set to future time when item added
- Check MongoDB: `db.cartexpirations.find()`

### Capacity Still Available But 409 Returned
- May have held items: Check `db.slotcapacities.findOne({...}).heldCount`
- Held items from active carts prevent overbooking
- This is correct behavior - capacity is reserved

### Audit Log Not Recording
- Check if `AuditLog` collection exists: `db.collections()` should include it
- Verify service calls are using wrapper functions (capacityIntegrationService)
- Check server logs for "Failed to create audit log:" warnings

### Status Not Transitioning Automatically
- Lifecycle sweep runs every 60 seconds by default
- To trigger immediately, call any endpoint that calls `sweepBookingLifecycleService()`
- E.g., `GET /bookings` or `GET /bookings/admin`
- Check if booking time is actually in the past

