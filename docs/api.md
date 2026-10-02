# SAFAR REST & WebSocket API Specification

All REST endpoints follow standard versioning at `/api/v1/`.

## Uniform Response Contract

### Success (200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error (4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "EVENT_NOT_FOUND",
    "message": "Event could not be found."
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Key REST Endpoints

### Identity
- `GET /api/v1/me` — Retrieve current user profile and event memberships.
- `POST /api/v1/auth/sync` — Sync user name and role.

### Events
- `GET /api/v1/events` — List user's events.
- `GET /api/v1/events/:id` — Event details.
- `GET /api/v1/events/:id/stats` — Real-time database metrics (totalGuests, totalBookings, activeTrips, vehiclesOnDuty).
- `POST /api/v1/events` — Create event (supports 9-step wizard payload).
- `GET /api/v1/events/code/:code` — Event preview by 6-char code.
- `POST /api/v1/events/join` — Join event using code.

### Fleet & Duties
- `GET /api/v1/vehicles` — List vehicles in account.
- `POST /api/v1/vehicles` — Register vehicle.
- `GET /api/v1/drivers` — List drivers.
- `POST /api/v1/drivers/invite` — Invite driver.
- `PATCH /api/v1/drivers/:id/duty` — Toggle driver duty status (`ON_DUTY`, `OFF_DUTY`, `BREAK`).

### Trips & State Machine
- `GET /api/v1/trips?eventId=:id` — List trips for dispatch board.
- `POST /api/v1/trips?eventId=:id` — Schedule a new trip.
- `PATCH /api/v1/trips/:id/status` — Advance trip status through strict state machine.
- `POST /api/v1/trips/:id/verify-boarding` — Verify guest 4-digit code and board.
- `GET /api/v1/trips/driver/current` — Current active trip assigned to driver.

### Bookings
- `GET /api/v1/bookings?eventId=:id` — Event bookings.
- `GET /api/v1/bookings/my` — Authenticated guest bookings.
- `POST /api/v1/bookings?eventId=:id` — Atomic capacity-safe booking.

### Live Telemetry
- `POST /api/v1/tracking/ping` — Ingest driver GPS coordinates.
- `GET /api/v1/tracking/fleet?eventId=:id` — Current coordinates of active fleet.
- `POST /api/v1/tracking/sos` — Broadcast emergency alert.

## WebSocket Channels

Clients subscribe to channel rooms:
- `event:{eventId}` — Live location pings, trip updates, SOS alerts.
- `trip:{tripId}` — Passenger specific vehicle location and progress.
