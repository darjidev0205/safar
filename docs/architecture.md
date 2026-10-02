# SAFAR Architecture Overview

SAFAR is a production-ready, multi-tenant transportation coordination platform tailored for weddings, corporate summits, and high-coordination events.

## Monorepo Layout

```
SAFAR/
├── apps/
│   ├── web/                     # Next.js App Router (Public landing, Host Dashboard, Guest PWA)
│   └── driver/                  # React Native + Expo Driver mobile application
│
├── services/
│   └── api/                     # NestJS REST API + Socket.IO real-time tracking gateway
│
├── packages/
│   ├── types/                   # Shared TypeScript models, enums & interfaces
│   ├── validation/              # Zod validation schemas
│   ├── config/                  # Shared theme tokens, Firebase configs, and state machines
│   └── api-client/              # Strongly-typed HTTP/WebSocket client
│
├── prisma/
│   └── schema.prisma            # PostgreSQL + PostGIS schema with relational integrity
│
├── docs/                        # Architecture, DB, Auth, API, and Deployment documentation
└── infrastructure/              # Seed scripts, Docker, deployment configurations
```

## System Interaction Flow

```
[ GUEST PWA ]              [ HOST DASHBOARD ]              [ DRIVER MOBILE ]
      │                            │                               │
      │ Join Event (ADW26X)        │ Manage Fleet & Trips          │ On Duty / GPS Pings
      │ Book Shuttle               │ Monitor Telemetry             │ Boarding Code Verification
      ▼                            ▼                               ▼
 ════════════════════════════════════════════════════════════════════════════
                        SAFAR REST & WEBSOCKET BACKEND
                   (NestJS + Firebase Admin + PostGIS)
 ════════════════════════════════════════════════════════════════════════════
                                   │
                                   ▼
                      [ PostgreSQL Multi-Tenant DB ]
                    Tenant & Event Row-Level Isolation
```

## Core Principles

1. **Role-Specific Experiences**:
   - **Host**: Operations dashboard with full fleet dispatch, 9-step event setup wizard, and real-time live map.
   - **Guest**: Mobile-first installable PWA with 1-click booking, live vehicle route ETA, and 4-digit boarding passes.
   - **Driver**: React Native mobile app engineered for one-handed operation with strict state transitions.
2. **Zero Fake Metrics**:
   - Dashboards are strictly driven by real database counts.
   - A brand new user is greeted with a helpful onboarding flow instead of dummy statistics.
3. **Capacity Safety**:
   - Booking uses atomic interactive transactions (`tx.trip.findUnique` + passenger verification) to eliminate seat race conditions and overbooking.
