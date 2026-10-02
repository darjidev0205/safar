# SAFAR Database Architecture & Schema

SAFAR uses a single production PostgreSQL instance with strict tenant isolation.

## Data Isolation Hierarchy

```
Account (Tenant boundary)
  ├── AccountMembers (User + Role)
  ├── Vehicles & Drivers
  └── Events
        ├── EventCodes (e.g. ADW26X)
        ├── Places (Hotels, Venues, Airports with PostGIS Lat/Lng)
        ├── Functions (Ceremonies with timetables)
        ├── Guests (Manifest & Guest Groups)
        ├── Trips (State-machine managed runs)
        └── Bookings (Atomic seat reservation & 4-digit Boarding Codes)
```

## Relational Models

- **`users`**: Global identity linked to Firebase UID (`firebaseUid`, `email`, `phoneNumber`, `role`).
- **`accounts`**: Organizational tenant container.
- **`account_members`**: Membership mapping users to accounts.
- **`events`**: Event entities with dates, city, and join code.
- **`event_members`**: User participation in an event (Host, Guest, Driver).
- **`places`**: Geographic locations with latitude & longitude.
- **`functions`**: Event milestones (e.g. Sangeet, Wedding, Reception).
- **`vehicles`**: Fleet assets with category (Sedan, SUV, Tempo Traveller, Bus), capacity, and live ping coordinates.
- **`drivers`**: Driver license, current vehicle assignment, and duty status (`OFF_DUTY`, `AVAILABLE`, `ON_DUTY`, `ON_TRIP`, `BREAK`).
- **`trips`**: Vehicle runs with scheduled pickup times, actual timestamps, and strict status.
- **`bookings`**: Passenger reservations with atomic capacity validation and boarding codes.
- **`location_pings`**: GPS telemetry history for route audits and live tracking.
- **`trip_events`**: Immutable audit logs of trip status changes with actor and reason.
- **`notifications`** & **`audit_logs`**: Multi-channel alerts and administrative trace records.
