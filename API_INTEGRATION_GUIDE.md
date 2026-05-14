# Section 4 - API & Integration Guide

## Overview

Section 4 implementations add capacity management and audit logging without changing any API endpoints or response formats. All enhancements are transparent to existing clients.

---

## Existing API (Unchanged)

All endpoints work exactly as before. The following enhancements happen automatically:

### Cart Endpoints

**POST /cart/add**
- **New**: Automatically creates 15-minute hold on slot capacity
- **Old Behavior**: Preserved
- **Response**: Same format (cart with items)
- **Error**: May return 409 if hold fails (but original cart add still succeeds as fallback)

```json
{
  "userId": "...",
  "items": [
    {
      "_id": "...",
      "serviceId": "...",
      "date": "2026-05-15",
      "timeSlot": "10:00 AM",
      "quantity": 1
    }
  ]
}
```

**DELETE /cart/items/:itemId**
- **New**: Automatically releases hold on that item
- **Old Behavior**: Preserved
- **Response**: Updated cart without the item
- **Side Effect**: Slot capacity freed immediately

**POST /cart/items/:itemId**
- **New**: None (updating item doesn't affect holds, just quantity)
- **Response**: Same format
- **Note**: Holds follow the original item; if you move to different slot, old hold expires naturally

---

### Booking Endpoints

**POST /bookings/checkout**
- **New**: Pre-validates capacity INCLUDING held items
- **Old**: Validated only confirmed bookings
- **Response**: Same format (booking with status)
- **Impact**: 409 will return if held items + confirmed items > capacity

```json
{
  "_id": "...",
  "userId": "...",
  "items": [...],
  "status": "pending" | "confirmed",
  "paymentMethod": "cash" | "card" | "pay_on_arrival",
  "paymentStatus": "unpaid" | "pending" | "paid" | "failed",
  "statusHistory": [
    { "status": "confirmed", "changedAt": "2026-05-14T10:00:00Z" }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**POST /bookings/:id/cancel**
- **New**: Releases confirmed slot capacity
- **Old Behavior**: Preserved
- **Response**: Cancelled booking
- **Side Effect**: Slot available for new bookings immediately

**POST /bookings/:id/pay**
- **New**: Creates audit log entry
- **Old Behavior**: Preserved
- **Response**: Confirmed booking (if card payment succeeds)

**POST /bookings/:id/complete**
- **New**: Creates audit log entry
- **Old Behavior**: Preserved
- **Response**: Completed booking

**POST /bookings/:id/fail**
- **New**: Releases confirmed capacity + creates audit log
- **Old Behavior**: Preserved
- **Response**: Failed booking

---

## New Features (Automatic)

### Feature 1: Slot Capacity Holds

**When It Happens**:
- Every time an item is added to cart
- Holds last 15 minutes
- Automatically expire and release capacity

**How to Observe**:
```bash
# In MongoDB
db.cartexpirations.find({ released: false })
# Shows all active holds waiting to expire
```

**What It Means**:
- User A adds item → slot capacity reserved for user A
- User B adds same slot → gets "held" status
- If User A doesn't checkout in 15 min → capacity freed
- User B's later attempt might then succeed

---

### Feature 2: Atomicity Guarantee

**When It Happens**:
- At checkout, capacity is double-checked before booking created
- If check fails, 409 Conflict returned
- Booking is NEVER created on overbook attempt

**How to Observe**:
```bash
# In MongoDB
db.slotcapacities.findOne({ serviceId: "...", date: "...", timeSlot: "..." })
# Shows: totalCapacity, confirmedCount, heldCount, availableCount
# If availableCount < 0 = system is broken (shouldn't happen)
```

**What It Means**:
- No overbooking possible
- Concurrent requests handled safely
- Users can trust "confirmed" means "guaranteed"

---

### Feature 3: Capacity Release

**When It Happens**:
- User cancels booking
- System auto-fails a pending booking (time expired)
- Cart hold expires (15 minutes)

**Result**:
- Capacity immediately available for new bookings
- No manual admin cleanup needed

**How to Observe**:
```bash
# Before cancellation
db.slotcapacities.findOne(...).confirmedCount  // = 2

# After cancellation
db.slotcapacities.findOne(...).confirmedCount  // = 1
```

---

### Feature 4: Audit Logging

**What Gets Logged**:
- ✅ Booking created
- ✅ Payment confirmed
- ✅ Booking completed
- ✅ Booking failed
- ✅ Booking cancelled

**Fields Recorded**:
- Who did it (user ID, role)
- What they did (action)
- When (timestamp)
- Why (reason)
- What changed (before/after)

**How to Access**:
```bash
# In MongoDB
db.auditlogs.find({ entityType: "booking" })
  .sort({ createdAt: -1 })
  .limit(10)

# Response
{
  "entityType": "booking",
  "entityId": ObjectId("..."),
  "action": "created",
  "actor": { "userId": ObjectId("..."), "role": "user" },
  "changes": { "paymentMethod": "cash", "status": "confirmed" },
  "reason": "Checkout completed",
  "createdAt": ISODate("2026-05-14T10:30:00Z")
}
```

---

## Integration Examples

### Example 1: User Books a Slot

```bash
# 1. User logs in (get token)
TOKEN=$(curl -s -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. User adds service to cart
# ✨ NEW: Automatically creates 15-minute hold
curl -X POST http://localhost:5000/cart/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "507f1f77bcf86cd799439011",
    "date": "2026-05-20",
    "timeSlot": "2:00 PM",
    "quantity": 1
  }'

# 3. User checks out
# ✨ NEW: Pre-validates including held items, then confirms holds
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}'
  
# Response includes:
# - status: "confirmed" (cash = immediate)
# - paymentStatus: "unpaid"
# - statusHistory: [{ status: "confirmed", changedAt: "..." }]

# 4. Behind the scenes:
# ✨ NEW: AuditLog entry created
# ✨ NEW: CartExpiration marked as consumed
# ✨ NEW: SlotCapacity.confirmedCount incremented
```

---

### Example 2: Overbooking Prevention

```bash
# Service capacity = 1 slot

# USER A: Adds to cart (creates hold)
curl -X POST http://localhost:5000/cart/add \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"...","date":"2026-05-20","timeSlot":"2:00 PM","quantity":1}'
# ✨ NEW: Hold created for User A

# USER B: Tries to add same slot (creates hold)
curl -X POST http://localhost:5000/cart/add \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"...","date":"2026-05-20","timeSlot":"2:00 PM","quantity":1}'
# ✨ NEW: Hold created for User B (still available because User A hasn't checked out)

# USER A: Checks out
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}'
# ✅ Success: Booking confirmed, hold → confirmed

# USER B: Tries to check out
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}'
# ❌ 409 Conflict: "Slot full for service"
# ✨ NEW: Pre-validation caught the overbooking attempt before booking created

# USER A: Cancels booking
curl -X POST http://localhost:5000/bookings/$BOOKING_ID_A/cancel \
  -H "Authorization: Bearer $TOKEN_A"
# ✨ NEW: Capacity released

# USER B: Tries to check out again
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"cash"}'
# ✅ Success: Capacity now available
```

---

### Example 3: Automatic Hold Expiration

```bash
# Timeline:
# 10:00 AM - User adds to cart (hold expires at 10:15 AM)
# 10:05 AM - Other user can see slot as "held"
# 10:15 AM - Sweep runs (every 60s), finds expired hold
# 10:16 AM - Hold released, slot available again
# 10:17 AM - Other user can now checkout for that slot

# Check hold before expiry:
db.cartexpirations.findOne({
  released: false,
  expiresAt: { $gt: new Date(Date.now() - 5*60*1000) }  // added in last 5 min
})
# Response: { cartItemId: "...", expiresAt: "10:15 AM", released: false }

# Check hold after expiry (same query):
db.cartexpirations.findOne({...})
# Response: { ..., released: true }  # Marked as released by sweep
```

---

### Example 4: Cancellation with Capacity Release

```bash
# USER A: Books a slot with capacity=2
# Capacity now: confirmed=1, available=1

# USER B: Books the same slot
# Capacity now: confirmed=2, available=0

# USER C: Tries to book same slot
curl -X POST http://localhost:5000/bookings/checkout ...
# ❌ 409 Conflict

# USER A: Cancels
curl -X POST http://localhost:5000/bookings/$BOOKING_ID_A/cancel \
  -H "Authorization: Bearer $TOKEN_A"
# ✨ NEW: Releases capacity

# Capacity now: confirmed=1, available=1

# USER C: Tries again
curl -X POST http://localhost:5000/bookings/checkout ...
# ✅ Success

# Verify in DB:
db.auditlogs.find({ 
  entityType: "booking", 
  action: { $in: ["created", "cancelled"] }
}).sort({ createdAt: -1 })
# Shows full timeline of who booked what and when
```

---

### Example 5: Card Payment Flow with Audit

```bash
# USER: Checks out with card payment
curl -X POST http://localhost:5000/bookings/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paymentMethod":"card"}'
# Response: status="pending", paymentStatus="pending"
# ✨ NEW: AuditLog entry: { action: "created", paymentMethod: "card" }

# USER: Simulates card payment success
curl -X POST http://localhost:5000/bookings/$BOOKING_ID/pay \
  -H "Authorization: Bearer $TOKEN"
# Response: status="confirmed", paymentStatus="paid"
# ✨ NEW: AuditLog entry: { action: "payment_confirmed" }

# Check audit trail:
db.auditlogs.find({ entityId: ObjectId("$BOOKING_ID") })
# Shows:
# 1. { action: "created", paymentMethod: "card" }
# 2. { action: "payment_confirmed", paymentStatus: "paid" }
```

---

## Error Responses

### 409 Conflict: Capacity Exceeded

```json
{
  "statusCode": 409,
  "message": "Slot full for service",
  "errorCode": "CAPACITY_EXCEEDED",
  "available": 0,
  "requested": 1
}
```

**When**: Checkout attempted when slot full (includes held items)

**Action**: 
- ✅ NO booking created
- ✅ Capacity unaffected
- ✅ User can retry after hold expires

---

### 409 Conflict: Daily Limit

```json
{
  "statusCode": 409,
  "message": "Daily booking limit reached",
  "errorCode": "DAILY_BOOKING_LIMIT"
}
```

**When**: User tries to checkout more bookings than `MAX_BOOKINGS_PER_DAY`

**Action**: 
- ✅ NO booking created
- ✅ Capacity unaffected

---

### 409 Conflict: Too Late to Cancel

```json
{
  "statusCode": 409,
  "message": "Cancellation window closed (24h cutoff)"
}
```

**When**: User tries to cancel booking too close to scheduled time

**Action**: 
- ✅ Booking NOT cancelled
- ✅ Capacity NOT released
- ✅ User stuck with booking (by design)

---

## Query Examples

### Query 1: Check Current Slot Status

```bash
# MongoDB
db.slotcapacities.findOne({
  serviceId: ObjectId("507f1f77bcf86cd799439011"),
  date: "2026-05-20",
  timeSlot: "2:00 PM"
})

# Response
{
  "serviceId": ObjectId("..."),
  "date": "2026-05-20",
  "timeSlot": "2:00 PM",
  "totalCapacity": 3,
  "confirmedCount": 2,
  "heldCount": 1,
  "availableCount": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Query 2: Check All Active Holds

```bash
# MongoDB
db.cartexpirations.find({
  released: false,
  expiresAt: { $gt: new Date() }
})

# Shows all cart items currently holding slot capacity
# When expiresAt < now AND released=false, the sweep will release it
```

---

### Query 3: Audit Trail for a Booking

```bash
# MongoDB
db.auditlogs.find({
  entityType: "booking",
  entityId: ObjectId("507f1f77bcf86cd799439012")
}).sort({ createdAt: 1 })

# Response
[
  { 
    "action": "created", 
    "actor": { "role": "user" }, 
    "changes": { "paymentMethod": "cash" },
    "createdAt": "2026-05-14T10:00:00Z"
  },
  { 
    "action": "cancelled", 
    "actor": { "role": "user" }, 
    "reason": "User cancelled booking",
    "createdAt": "2026-05-14T10:30:00Z"
  }
]
```

---

## Summary of New Behavior

| Scenario | Old Behavior | New Behavior |
|----------|--------------|--------------|
| Add to cart | Item added | Item added + 15-min hold created |
| Cart expires (15 min) | Hold stays | Hold auto-released by sweep |
| Remove from cart | Item removed | Item removed + hold released |
| Checkout with held items | Capacity unknown | Capacity includes holds, validated first |
| Overbooking attempt | Created booking | 409 Conflict, NO booking |
| Cancel booking | Capacity wasted | Capacity immediately released |
| Status change | No record | Audit log created |
| Time-based auto-transition | Happened silently | Logged to audit trail |

---

**All enhancements are automatic and transparent to the API consumer.** ✅
