# Parkify API Documentation

Base URL: `https://meko.tryasp.net`  
Swagger UI: `https://meko.tryasp.net/swagger/index.html`  
All request/response bodies are JSON with **snake_case** keys.  
All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Table of Contents

- [Authentication](#authentication)
  - [Register](#post-apiv1authregister)
  - [Login](#post-apiv1authlogin)
  - [Refresh Token](#post-apiv1authrefresh)
  - [Social Login](#post-apiv1authsocial)
  - [Forgot Password (Email)](#post-apiv1authforgot-passwordemail)
  - [Forgot Password (Phone)](#post-apiv1authforgot-passwordphone)
  - [Verify Code](#post-apiv1authverify-code)
  - [Resend Code](#post-apiv1authresend-code)
  - [Reset Password](#post-apiv1authreset-password)
- [Users](#users)
  - [Get Profile](#get-apiv1usersprofile)
  - [Update Profile](#put-apiv1usersprofile)
  - [Complete Profile](#post-apiv1usersprofilecomplete)
  - [Change Password](#put-apiv1userschange-password)
  - [List Cars](#get-apiv1userscars)
  - [Add Car](#post-apiv1userscars)
  - [Update Car](#put-apiv1userscarscarid)
  - [Delete Car](#delete-apiv1userscarscarid)
  - [Set Default Car](#put-apiv1userscarscariddefault)
  - [List Payment Methods](#get-apiv1userspayment-methods)
  - [Add Payment Method](#post-apiv1userspayment-methods)
  - [Delete Payment Method](#delete-apiv1userspayment-methodsmethodid)
  - [Set Default Payment Method](#put-apiv1userspayment-methodsmethodiddefault)
- [Parkings](#parkings)
  - [List All Parkings](#get-apiv1parkings)
  - [Search Nearby](#get-apiv1parkingssearch)
  - [Search by Name](#get-apiv1parkingssearch-by-name)
  - [Filter (Body)](#post-apiv1parkingsfilter)
  - [Filter (Query)](#get-apiv1parkingsfilter)
  - [Get Parking](#get-apiv1parkingsparkingid)
  - [Get All Slots](#get-apiv1parkingsparkingidslots)
  - [Get Available Slots](#get-apiv1parkingsparkingidslotsavailable)
  - [Watch Parking](#post-apiv1parkingsparkingidwatch)
  - [Unwatch Parking](#delete-apiv1parkingsparkingidwatch)
  - [Check Watch Status](#get-apiv1parkingsparkingidwatch)
- [Bookings](#bookings)
  - [Create Booking](#post-apiv1bookings)
  - [List Bookings](#get-apiv1bookings)
  - [Active Booking](#get-apiv1bookingsactive)
  - [Booking History](#get-apiv1bookingshistory)
  - [Get Booking](#get-apiv1bookingsbookingid)
  - [Get QR Code](#get-apiv1bookingsbookingidqr)
  - [Cancel Booking](#post-apiv1bookingsbookingidcancel)
  - [Check In](#post-apiv1bookingsbookingidcheck-in)
  - [Check Out](#post-apiv1bookingsbookingidcheck-out)
  - [Extend Booking](#post-apiv1bookingsbookingidextend)
- [Favorites](#favorites)
  - [List Favorites](#get-apiv1favorites)
  - [Add Favorite](#post-apiv1favoritesparkingid)
  - [Remove Favorite](#delete-apiv1favoritesparkingid)
  - [Check Favorite](#get-apiv1favoritesparkingidcheck)
- [Notifications](#notifications)
  - [List Notifications](#get-apiv1notifications)
  - [Unread Count](#get-apiv1notificationsunread-count)
  - [Mark as Read](#put-apiv1notificationsnotificationidread)
  - [Mark All as Read](#put-apiv1notificationsread-all)
  - [Delete Notification](#delete-apiv1notificationsnotificationid)
- [Support](#support)
  - [Create Ticket](#post-apiv1supporttickets)
  - [List My Tickets](#get-apiv1supporttickets)
  - [Get Ticket](#get-apiv1supportticketsticketid)
- [Admin](#admin)
  - [Dashboard](#get-apiv1admindashboard)
  - [Gate Control](#post-apiv1admingates)
  - [All Bookings](#get-apiv1adminbookings)
  - [All Users](#get-apiv1adminusers)
  - [Get User](#get-apiv1adminusersuserid)
  - [Suspend User](#put-apiv1adminusersuseridsuspend)
  - [Delete User](#delete-apiv1adminusersuserid)
  - [All Alerts](#get-apiv1adminalerts)
  - [Get Alert](#get-apiv1adminalertsalertid)
  - [Acknowledge Alert](#put-apiv1adminalertsalertidacknowledge)
  - [Resolve Alert](#put-apiv1adminalertsalertidresolve)
  - [Vehicle Logs](#get-apiv1adminvehicleslogs)
  - [Send Notification](#post-apiv1adminnotificationssend)
  - [All Support Tickets](#get-apiv1adminsupporttickets)
  - [Update Ticket Status](#put-apiv1adminsupportticketsticketidstatus)
  - [All Parkings (Admin)](#get-apiv1adminparkings)
  - [Create Parking](#post-apiv1adminparkings)
  - [Update Parking](#put-apiv1adminparkingsparkingid)
  - [Delete Parking](#delete-apiv1adminparkingsparkingid)
  - [Parking Slots (Admin)](#get-apiv1adminparkingsparkingidslots)
- [IoT (ESP32)](#iot-esp32)
  - [Parking Status](#get-apiv1iotparking-status)
  - [Plate Detect](#post-apiv1iotplate-detect)
  - [Fire Alert](#post-apiv1iotfire-alert)
  - [Theft Alert](#post-apiv1iottheft-alert)
  - [Slot Update](#post-apiv1iotslot-update)
  - [Gate Control](#post-apiv1iotgate-control)
- [ESP32 HTTPS Connection Guide](#esp32--iot--connecting-over-https)
- [WebSockets](#websockets)
- [Common Error Responses](#common-error-responses)
- [Booking Status Flow](#booking-status-flow)
- [Reference Tables](#parking-slot-status-values)

---

## Authentication

### POST `/api/v1/auth/register`
Register a new user.

**Request**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "Password123!",
  "phone": "+201000000000"
}
```

**Response `200`**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

---

### POST `/api/v1/auth/login`
Login with email and password.

**Request**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response `200`** — same as register  
**Response `401`** `{ "detail": "Invalid credentials" }`

---

### POST `/api/v1/auth/refresh`
Get a new access token using a refresh token.

**Request**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response `200`** — same as register  
**Response `401`** `{ "detail": "Invalid or expired refresh token" }`

---

### POST `/api/v1/auth/social`
Login or register via Google/Apple.

**Request**
```json
{
  "provider": "google",
  "token": "google-id-token",
  "name": "John Doe",
  "email": "user@example.com"
}
```

**Response `200`** — same as register

---

### POST `/api/v1/auth/forgot-password/email`
Send a password reset code to email.

**Request**
```json
{ "email": "user@example.com" }
```

**Response `200`**
```json
{ "success": true, "message": "Reset code sent to user@example.com", "code": "123456" }
```

---

### POST `/api/v1/auth/forgot-password/phone`
Send a password reset code to phone.

**Request**
```json
{ "phone": "+201000000000" }
```

**Response `200`**
```json
{ "success": true, "message": "Reset code sent to +201000000000", "code": "123456" }
```

---

### POST `/api/v1/auth/verify-code`
Verify a reset code.

**Request**
```json
{
  "email": "user@example.com",
  "phone": null,
  "code": "123456"
}
```

**Response `200`**
```json
{ "success": true, "verified": true, "message": "Code verified" }
```

---

### POST `/api/v1/auth/resend-code`
Resend the reset code.

**Request**
```json
{ "email": "user@example.com", "phone": null }
```

**Response `200`**
```json
{ "success": true, "message": "Code resent", "code": "123456" }
```

---

### POST `/api/v1/auth/reset-password`
Reset password using a verified code.

**Request**
```json
{
  "email": "user@example.com",
  "phone": null,
  "code": "123456",
  "new_password": "NewPassword123!"
}
```

**Response `200`**
```json
{ "success": true, "message": "Password reset successfully" }
```

---

## Users
> All endpoints require `Authorization` header.

### GET `/api/v1/users/profile`
Get the current user's profile.

**Response `200`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+201000000000",
  "gender": "male",
  "address": "123 Main St",
  "profile_photo": null,
  "role": "user",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### PUT `/api/v1/users/profile`
Update profile fields (all optional).

**Request**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+201000000000",
  "address": "123 Main St",
  "email": "newemail@example.com",
  "gender": "male"
}
```

**Response `200`** — same as GET profile

---

### POST `/api/v1/users/profile/complete`
Complete profile setup after social login (also adds first car).

**Request**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male",
  "phone": "+201000000000",
  "address": "123 Main St",
  "car_plate": "ABC-123",
  "car_model": "Toyota Corolla"
}
```

**Response `200`** — same as GET profile

---

### PUT `/api/v1/users/change-password`
Change password.

**Request**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Response `200`**
```json
{ "success": true, "message": "Password changed successfully" }
```

---

### GET `/api/v1/users/cars`
List all cars for the current user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "plate": "ABC-123",
    "make": "Toyota",
    "model": "Corolla",
    "year": 2022,
    "color": "White",
    "is_default": true
  }
]
```

---

### POST `/api/v1/users/cars`
Add a car.

**Request**
```json
{
  "plate": "ABC-123",
  "make": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "color": "White",
  "is_default": true
}
```

**Response `200`** — single car object (same shape as list item)

---

### PUT `/api/v1/users/cars/{carId}`
Update a car (all fields optional).

**Request**
```json
{
  "plate": "XYZ-999",
  "make": "Honda",
  "model": "Civic",
  "year": 2023,
  "color": "Black"
}
```

**Response `200`** — updated car object

---

### DELETE `/api/v1/users/cars/{carId}`
Delete a car.

**Response `200`**
```json
{ "success": true, "message": "Car removed successfully" }
```

---

### PUT `/api/v1/users/cars/{carId}/default`
Set a car as the default.

**Response `200`** — updated car object with `is_default: true`

---

### GET `/api/v1/users/payment-methods`
List all payment methods.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "card_type": "visa",
    "last_four": "1111",
    "card_holder_name": "John Doe",
    "expiry": "12/27",
    "is_default": true
  }
]
```

---

### POST `/api/v1/users/payment-methods`
Add a payment method.

**Request**
```json
{
  "card_type": "visa",
  "card_number": "4111111111111111",
  "card_holder_name": "John Doe",
  "expiry_month": 12,
  "expiry_year": 2027,
  "is_default": true
}
```

**Response `200`** — single payment method object

---

### DELETE `/api/v1/users/payment-methods/{methodId}`
Delete a payment method.

**Response `200`**
```json
{ "success": true, "message": "Payment method removed" }
```

---

### PUT `/api/v1/users/payment-methods/{methodId}/default`
Set a payment method as the default.

**Response `200`** — updated payment method object

---

## Parkings
> All endpoints require `Authorization` header.

### GET `/api/v1/parkings`
List all active parkings.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "name": "Downtown Parking",
    "description": "Central parking",
    "location": {
      "latitude": 30.0444,
      "longitude": 31.2357,
      "address": "123 Tahrir Square",
      "city": "Cairo",
      "country": "Egypt"
    },
    "parking_type": "covered",
    "total_slots": 50,
    "available_slots": 48,
    "occupied_slots": 2,
    "is_full": false,
    "rate_per_hour": 25.0,
    "currency": "EGP",
    "amenities": ["cctv", "lighting"],
    "images": [],
    "rating": 0,
    "review_count": 0,
    "is_24_7": true,
    "is_active": true,
    "distance_meters": null,
    "walking_time_minutes": null,
    "is_favorited": false
  }
]
```

---

### GET `/api/v1/parkings/search`
Search nearby parkings by coordinates.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `latitude` | float | required | User latitude |
| `longitude` | float | required | User longitude |
| `radius_km` | float | `10` | Search radius in km |
| `sort_by` | string | `distance` | `distance` or `rating` |

**Response `200`** — array of parking objects with `distance_meters` and `walking_time_minutes` filled

---

### GET `/api/v1/parkings/search-by-name`
Search parkings by name.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search term |

**Response `200`** — array of matching parking objects

---

### POST `/api/v1/parkings/filter`
Filter parkings with full criteria (body).

**Request**
```json
{
  "latitude": 30.0444,
  "longitude": 31.2357,
  "radius_km": 10,
  "min_price": 10,
  "max_price": 50,
  "parking_type": "covered",
  "sort_by": "distance",
  "amenities": ["cctv"],
  "available_only": true
}
```

**Response `200`** — filtered array of parking objects

---

### GET `/api/v1/parkings/filter`
Filter parkings via query string.

**Query Parameters**
| Param | Type | Default |
|-------|------|---------|
| `latitude` | float | optional |
| `longitude` | float | optional |
| `radius_km` | float | `10` |
| `min_price` | float | optional |
| `max_price` | float | optional |
| `parking_type` | string | optional |
| `sort_by` | string | `distance` |
| `available_only` | bool | `true` |

**Response `200`** — filtered array of parking objects

---

### GET `/api/v1/parkings/{parkingId}`
Get a single parking by ID.

**Response `200`** — single parking object  
**Response `404`** `{ "detail": "Parking not found" }`

---

### GET `/api/v1/parkings/{parkingId}/slots`
Get all slots for a parking.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "parking_id": "uuid",
    "slot_number": "01",
    "floor": 1,
    "section": null,
    "status": "available",
    "is_handicap": false,
    "is_ev_charging": false,
    "current_vehicle_plate": null
  }
]
```

---

### GET `/api/v1/parkings/{parkingId}/slots/available`
Get only available slots for a parking.

**Response `200`** — array of slot objects with `status: "available"`

---

### POST `/api/v1/parkings/{parkingId}/watch`
Subscribe to availability notifications for a parking.

**Response `200`**
```json
{ "success": true, "message": "You will be notified when a spot becomes available" }
```

---

### DELETE `/api/v1/parkings/{parkingId}/watch`
Unsubscribe from availability notifications.

**Response `200`**
```json
{ "success": true, "message": "Unsubscribed from availability notifications" }
```

---

### GET `/api/v1/parkings/{parkingId}/watch`
Check if the current user is watching a parking.

**Response `200`**
```json
{ "is_watching": true }
```

---

## Bookings
> All endpoints require `Authorization` header.

### POST `/api/v1/bookings`
Create a booking.

**Request**
```json
{
  "parking_id": "uuid",
  "slot_id": "uuid",
  "vehicle_plate": "ABC-123",
  "start_time": "2025-01-01T10:00:00Z",
  "duration_hours": 2,
  "payment_method": "card"
}
```

**Response `200`**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "parking_id": "uuid",
  "parking_name": "Downtown Parking",
  "parking_address": "123 Tahrir Square",
  "slot_id": "uuid",
  "slot_number": "01",
  "floor": 1,
  "section": null,
  "vehicle_plate": "ABC-123",
  "start_time": "2025-01-01T10:00:00Z",
  "end_time": "2025-01-01T12:00:00Z",
  "actual_exit_time": null,
  "status": "confirmed",
  "total_hours": 2.0,
  "amount": 50.0,
  "fees": 2.5,
  "total_amount": 52.5,
  "currency": "EGP",
  "payment_status": "completed",
  "payment_method": "card",
  "created_at": "2025-01-01T09:00:00Z"
}
```

> **Pricing:** `amount = rate_per_hour × hours`, `fees = amount × 5%`, `total = amount + fees`

---

### GET `/api/v1/bookings`
Get all bookings for the current user.

**Response `200`** — array of booking objects

---

### GET `/api/v1/bookings/active`
Get the current active booking (status = `confirmed` or `active`).

**Response `200`**
```json
{
  "id": "uuid",
  "parking_name": "Downtown Parking",
  "parking_address": "123 Tahrir Square",
  "slot_id": "uuid",
  "slot_number": "01",
  "floor": 1,
  "remaining_time_seconds": 3600,
  "start_time": "2025-01-01T10:00:00Z",
  "end_time": "2025-01-01T12:00:00Z"
}
```

---

### GET `/api/v1/bookings/history`
Get past bookings (status = `completed` or `cancelled`).

**Response `200`** — array of booking objects

---

### GET `/api/v1/bookings/{bookingId}`
Get a single booking by ID.

**Response `200`** — booking object  
**Response `404`** `{ "detail": "Booking not found" }`

---

### GET `/api/v1/bookings/{bookingId}/qr`
Get the QR code data for a booking.

**Response `200`**
```json
{
  "booking_id": "uuid",
  "qr_data": "base64-encoded-string",
  "parking_name": "Downtown Parking",
  "slot_number": "01",
  "start_time": "2025-01-01T10:00:00Z",
  "end_time": "2025-01-01T12:00:00Z",
  "vehicle_plate": "ABC-123"
}
```

---

### POST `/api/v1/bookings/{bookingId}/cancel`
Cancel a booking (must be `confirmed` status).

**Response `200`** — updated booking object with `status: "cancelled"`

---

### POST `/api/v1/bookings/{bookingId}/check-in`
Check in to a booking (status: `confirmed` → `active`).

**Response `200`** — updated booking object

---

### POST `/api/v1/bookings/{bookingId}/check-out`
Check out from a booking (status: `active` → `completed`). Recalculates total if overstay.

**Response `200`** — updated booking object

---

### POST `/api/v1/bookings/{bookingId}/extend`
Extend a booking's duration.

**Request**
```json
{ "additional_hours": 1.5 }
```

**Response `200`** — updated booking object with new `end_time` and recalculated totals

---

## Favorites
> All endpoints require `Authorization` header.

### GET `/api/v1/favorites`
List all favorited parkings.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "parking_id": "uuid",
    "parking_name": "Downtown Parking",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### POST `/api/v1/favorites/{parkingId}`
Add a parking to favorites (idempotent).

**Response `200`**
```json
{ "success": true, "message": "Added to favorites" }
```

---

### DELETE `/api/v1/favorites/{parkingId}`
Remove a parking from favorites.

**Response `200`**
```json
{ "success": true, "message": "Removed from favorites" }
```

---

### GET `/api/v1/favorites/{parkingId}/check`
Check if a parking is favorited.

**Response `200`**
```json
{ "is_favorited": true }
```

---

## Notifications
> All endpoints require `Authorization` header.

### GET `/api/v1/notifications`
Get all notifications for the current user.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Spot Available!",
    "message": "A spot just opened at Downtown Parking.",
    "notification_type": "booking",
    "is_read": false,
    "data": null,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### GET `/api/v1/notifications/unread-count`
Get the count of unread notifications.

**Response `200`**
```json
{ "count": 3 }
```

---

### PUT `/api/v1/notifications/{notificationId}/read`
Mark a single notification as read.

**Response `200`** — updated notification object

---

### PUT `/api/v1/notifications/read-all`
Mark all notifications as read.

**Response `200`**
```json
{ "success": true, "message": "3 notifications marked as read" }
```

---

### DELETE `/api/v1/notifications/{notificationId}`
Delete a notification.

**Response `200`**
```json
{ "success": true, "message": "Notification deleted" }
```

---

## Support
> All endpoints require `Authorization` header.

### POST `/api/v1/support/tickets`
Create a support ticket.

**Request**
```json
{
  "subject": "App issue",
  "message": "The map is not loading.",
  "category": "general"
}
```

**Response `200`**
```json
{
  "id": "uuid",
  "subject": "App issue",
  "message": "The map is not loading.",
  "category": "general",
  "status": "open",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### GET `/api/v1/support/tickets`
Get all support tickets for the current user.

**Response `200`** — array of ticket objects

---

### GET `/api/v1/support/tickets/{ticketId}`
Get a single ticket by ID.

**Response `200`** — single ticket object  
**Response `404`** `{ "detail": "Ticket not found" }`

---

## Admin
> All endpoints require `Authorization` header with **admin role**.

### GET `/api/v1/admin/dashboard`
Get dashboard statistics.

**Response `200`**
```json
{
  "total_parkings": 5,
  "total_slots": 250,
  "available_slots": 180,
  "occupied_slots": 70,
  "total_users": 120,
  "active_bookings": 15,
  "today_bookings": 30,
  "today_revenue": 1575.0,
  "pending_alerts": 2,
  "currency": "EGP"
}
```

---

### POST `/api/v1/admin/gates/{parkingId}/control`
Send a gate open/close command.

**Request**
```json
{
  "gate_type": "entry",
  "action": "open"
}
```

**Response `200`**
```json
{ "success": true, "message": "Gate entry open sent", "parking_id": "uuid" }
```

---

### GET `/api/v1/admin/bookings`
Get all bookings (optionally filter by status).

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Optional: `confirmed`, `active`, `completed`, `cancelled` |

**Response `200`** — array of booking objects

---

### GET `/api/v1/admin/users`
Get all users (no password hash).

**Response `200`**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+201000000000",
    "role": "user",
    "is_active": true,
    "gender": null,
    "address": null,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### GET `/api/v1/admin/users/{userId}`
Get a single user by ID.

**Response `200`** — single user object

---

### PUT `/api/v1/admin/users/{userId}/suspend`
Suspend or activate a user account.

**Request**
```json
{
  "is_active": false,
  "reason": "Terms of service violation"
}
```

**Response `200`**
```json
{ "success": true, "user_id": "uuid", "status": "suspended", "is_active": false }
```

---

### DELETE `/api/v1/admin/users/{userId}`
Permanently delete a user.

**Response `200`**
```json
{ "success": true, "message": "User uuid deleted" }
```

---

### GET `/api/v1/admin/alerts`
Get all alerts (optionally filter by status).

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Optional: `active`, `acknowledged`, `resolved` |

**Response `200`**
```json
[
  {
    "id": "uuid",
    "parking_id": "uuid",
    "parking_name": "Downtown Parking",
    "alert_type": "fire",
    "severity": "critical",
    "message": "Fire detected (confidence: 0.87)",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "resolved_at": null,
    "resolved_by": null
  }
]
```

---

### GET `/api/v1/admin/alerts/{alertId}`
Get a single alert.

**Response `200`** — single alert object

---

### PUT `/api/v1/admin/alerts/{alertId}/acknowledge`
Acknowledge an alert.

**Response `200`** — updated alert object with `status: "acknowledged"`

---

### PUT `/api/v1/admin/alerts/{alertId}/resolve`
Resolve an alert.

**Response `200`** — updated alert object with `status: "resolved"`

---

### GET `/api/v1/admin/vehicles/logs`
Get vehicle entry/exit logs.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `parking_id` | uuid | optional | Filter by parking |
| `action` | string | optional | `entry` or `exit` |
| `limit` | int | `50` | Max records |

**Response `200`**
```json
[
  {
    "id": "uuid",
    "parking_id": "uuid",
    "parking_name": "Downtown Parking",
    "vehicle_plate": "ABC-123",
    "action": "entry",
    "gate": "Gate A",
    "confidence": 0.95,
    "timestamp": "2025-01-01T10:00:00Z",
    "plate_image": null
  }
]
```

---

### POST `/api/v1/admin/notifications/send`
Send a notification to a single user or broadcast to all.

**Request (single user)**
```json
{
  "user_id": "uuid",
  "title": "Important Update",
  "message": "Your booking has been confirmed.",
  "notification_type": "booking"
}
```

**Request (broadcast — omit `user_id`)**
```json
{
  "title": "System Maintenance",
  "message": "The app will be down at midnight.",
  "notification_type": "general"
}
```

**Response `200`**
```json
{ "success": true, "message": "Notification sent" }
```

---

### GET `/api/v1/admin/support/tickets`
Get all support tickets from all users.

**Response `200`** — array of ticket objects

---

### PUT `/api/v1/admin/support/tickets/{ticketId}/status`
Update a support ticket status.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `open`, `in_progress`, `resolved`, `closed` |

**Response `200`** — updated ticket object

---

### GET `/api/v1/admin/parkings`
List all parkings (including inactive).

**Response `200`** — array of parking objects

---

### POST `/api/v1/admin/parkings`
Create a new parking (auto-generates slots).

**Request**
```json
{
  "name": "Downtown Parking",
  "description": "Central parking garage",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "address": "123 Tahrir Square",
  "city": "Cairo",
  "country": "Egypt",
  "parking_type": "covered",
  "total_slots": 50,
  "rate_per_hour": 25.0,
  "currency": "EGP",
  "amenities": ["cctv", "lighting"],
  "is_24_7": true,
  "device_key": "esp32_parking_key_1"
}
```

**Response `200`** — created parking object

---

### PUT `/api/v1/admin/parkings/{parkingId}`
Update a parking (all fields optional).

**Request**
```json
{
  "name": "Updated Name",
  "description": null,
  "rate_per_hour": 30.0,
  "is_active": true,
  "amenities": ["cctv", "lighting", "ev_charging"],
  "is_24_7": false,
  "device_key": "new_device_key"
}
```

**Response `200`** — updated parking object

---

### DELETE `/api/v1/admin/parkings/{parkingId}`
Soft-delete a parking (sets `is_active = false`).

**Response `200`**
```json
{ "success": true, "message": "Parking uuid deactivated" }
```

---

### GET `/api/v1/admin/parkings/{parkingId}/slots`
Get all slots for a specific parking.

**Response `200`** — array of slot objects

---

## IoT (ESP32)
> No JWT required. Authenticated via `device_key` query parameter.

### GET `/api/v1/iot/parking-status`
Get real-time slot counts for a parking.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `parking_id` | uuid | Parking ID |
| `device_key` | string | Device secret key |

**Response `200`**
```json
{
  "success": true,
  "parking_id": "uuid",
  "total_slots": 50,
  "occupied_slots": 2,
  "available_slots": 48,
  "is_full": false
}
```

---

### POST `/api/v1/iot/plate-detect`
Report a detected license plate (ALPR). Triggers auto check-in/check-out.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `parking_id` | uuid | required | |
| `plate` | string | required | Detected plate number |
| `action` | string | `entry` | `entry` or `exit` |
| `gate` | string | `Gate A` | Gate name |
| `confidence` | float | `0.95` | ALPR confidence score |
| `device_key` | string | required | |

**Response `200`**
```json
{
  "success": true,
  "verified": true,
  "log_id": "uuid",
  "plate": "ABC-123",
  "action": "entry",
  "gate_command": "open",
  "booking_id": "uuid",
  "message": "Vehicle verified. Booking uuid checked in."
}
```

---

### POST `/api/v1/iot/fire-alert`
Report a fire detection event.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `parking_id` | uuid | required | |
| `message` | string | `Fire detected` | Alert message |
| `confidence` | float | `0.87` | Detection confidence |
| `device_key` | string | required | |

**Response `200`**
```json
{ "success": true, "alert_id": "uuid" }
```

---

### POST `/api/v1/iot/theft-alert`
Report a suspicious activity / weapon detection event.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `parking_id` | uuid | required | |
| `message` | string | `Suspicious activity detected` | |
| `confidence` | float | `0.80` | |
| `weapon_type` | string | `unknown` | |
| `device_key` | string | required | |

**Response `200`**
```json
{ "success": true, "alert_id": "uuid" }
```

---

### POST `/api/v1/iot/slot-update`
Update a single slot's status from a sensor.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `parking_id` | uuid | |
| `slot_number` | string | e.g. `"01"` |
| `status` | string | `available` or `occupied` |
| `device_key` | string | |

**Response `200`**
```json
{
  "success": true,
  "slot_id": "uuid",
  "status": "occupied",
  "occupied_slots": 3,
  "available_slots": 47,
  "is_full": false
}
```

---

### POST `/api/v1/iot/gate-control`
Send a gate command from the device side.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `parking_id` | uuid | required | |
| `gate_type` | string | `entry` | `entry` or `exit` |
| `action` | string | `open` | `open` or `close` |
| `device_key` | string | required | |

**Response `200`**
```json
{ "success": true, "message": "Gate entry open command sent to uuid" }
```

---

## ESP32 / IoT — Connecting over HTTPS

All IoT HTTP endpoints use HTTPS. Use `WiFiClientSecure` in the firmware.

### HTTP Requests (REST endpoints)

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* BASE_URL   = "https://meko.tryasp.net";
const char* PARKING_ID = "your-parking-uuid";
const char* DEVICE_KEY = "your-device-key";

WiFiClientSecure client;
client.setInsecure(); // skip cert verification — fine for dev/graduation

// Example: report a detected plate
HTTPClient http;
String url = String(BASE_URL) + "/api/v1/iot/plate-detect"
           + "?parking_id=" + PARKING_ID
           + "&plate=ABC123"
           + "&action=entry"
           + "&device_key=" + DEVICE_KEY;
http.begin(client, url);
int statusCode = http.POST("");
String response = http.getString();
http.end();
```

### WebSocket (real-time gate channel)

```cpp
#include <WebSocketsClient.h>

WebSocketsClient ws;

void setup() {
    // WSS = WebSocket over HTTPS (port 443)
    ws.beginSSL(
        "meko.tryasp.net",          // host (no https://)
        443,                         // port
        "/ws/gate/YOUR_PARKING_UUID?device_key=YOUR_DEVICE_KEY"
    );
    ws.onEvent(onWsEvent);
    ws.setReconnectInterval(5000);
}

void loop() {
    ws.loop();
}

void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {
    if (type == WStype_TEXT) {
        // parse JSON payload
        // look for: { "type": "gate_command", "gate_type": "entry", "action": "open" }
    }
}
```

### Side effects the ESP32 should know about

| Event | What the backend does automatically |
|-------|-------------------------------------|
| `plate-detect` entry + valid booking | Checks in booking, sends `gate_command open` over WebSocket |
| `plate-detect` exit + active booking | Checks out booking, opens gate, notifies spot watchers |
| `plate-detect` exit + no booking | Opens gate anyway, no booking action |
| `plate-detect` entry + no booking | Creates security alert, does NOT open gate |
| `fire-alert` | Creates critical alert, broadcasts notification to ALL users |
| `theft-alert` | Creates high alert, broadcasts security notification to ALL users |
| `slot-update` available | Notifies all users watching that parking |

---

## WebSockets

> Production uses **WSS** (WebSocket Secure). Connect to `wss://meko.tryasp.net/ws/...`

### `WSS /ws/parking/{parkingId}`
Real-time slot updates for a parking.

**Server → Client on connect**
```json
{ "type": "connected", "parking_id": "uuid" }
```

**Client → Server (ping)**
```json
{ "type": "ping" }
```

**Server → Client (pong)**
```json
{ "type": "pong" }
```

**Server → Client (slot update)**
```json
{ "type": "slot_update", "parking_id": "uuid", "data": { ... } }
```

---

### `WSS /ws/admin`
Admin real-time feed (all events).

**Server → Client on connect**
```json
{ "type": "connected", "channel": "admin" }
```

**Events received:** `gate_update`, `slot_update`, `plate_detected`, `fire_alert`, `theft_alert`

---

### `WSS /ws/gate/{parkingId}?device_key=xxx`
ESP32 gate controller channel.

**Authentication:** `device_key` query param validated against DB.

**ESP32 → Server messages**
```json
{ "type": "ping" }
{ "type": "gate_status", "gate": "Gate A", "state": "open" }
{ "type": "slot_update", "slot": "01", "status": "occupied" }
{ "type": "plate_detected", "plate": "ABC-123", "action": "entry", "gate": "Gate A", "confidence": 0.95 }
{ "type": "fire_alert", "message": "Smoke detected in Zone B" }
{ "type": "theft_alert", "message": "Weapon detected", "weapon_type": "knife" }
```

**Server → ESP32 (gate command)**
```json
{ "type": "gate_command", "gate_type": "entry", "action": "open" }
```

---

## Common Error Responses

| Status | Body | Meaning |
|--------|------|---------|
| `400` | `{ "detail": "message" }` | Validation or business logic error |
| `401` | `{ "detail": "message" }` | Missing or invalid token |
| `403` | `{ "detail": "message" }` | Insufficient role / wrong device key |
| `404` | `{ "detail": "message" }` | Resource not found |

---

## Booking Status Flow

```
confirmed → active (check-in) → completed (check-out)
confirmed → cancelled
```

## Parking Slot Status Values
`available` · `reserved` · `occupied` · `maintenance`

## Alert Types & Severities
| Type | Severity |
|------|----------|
| `fire` | `critical` |
| `theft` | `high` |
| `security` | `medium` |

## Notification Types
`booking` · `alert` · `security` · `general`
