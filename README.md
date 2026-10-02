# SAFAR — Event Transportation Platform

> **Seamless Rides. Unforgettable Events.**
> Production-ready end-to-end transportation platform for weddings, corporate events, and organized event logistics.

---

## 🌟 Overview & Experiences

SAFAR coordinates all transportation stakeholders through one unified ecosystem:

1. **Host Web Dashboard**: Desktop & tablet operations command center. Guided 9-step event setup wizard, live telemetry map, driver dispatch, and dynamic real-time database KPIs.
2. **Guest Web + Installable PWA**: Mobile-first responsive web app for attendees. Enter 6-char event code (e.g. `ADW26X`), book shuttles, view live vehicle route ETA, and present 4-digit boarding passes.
3. **Driver Mobile App**: React Native + Expo app built for one-handed mobile use. Strict trip progression stepper, 4-digit/QR boarding code verification, and emergency SOS alerts.

---

## 🧱 Monorepo Architecture

```
SAFAR/
├── apps/
│   ├── web/                    # Next.js App Router (Public landing, Host, Guest PWA)
│   └── driver/                 # React Native + Expo Driver mobile application
│
├── services/
│   └── api/                    # NestJS REST API + Socket.IO real-time tracking gateway
│
├── packages/
│   ├── types/                  # Shared TypeScript models, enums & interfaces
│   ├── validation/             # Zod validation schemas
│   ├── config/                 # Brand tokens, state machines & Firebase client configs
│   └── api-client/             # Strongly-typed HTTP/WebSocket client
│
├── prisma/
│   └── schema.prisma           # PostgreSQL + PostGIS schema with relational integrity
│
├── docs/                       # Architecture, DB, Auth, API, and Deployment documentation
└── infrastructure/             # Seed scripts, Docker, deployment configurations
```

---

## 🛠️ Technology Stack

- **Frontend (Host & Guest)**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Lucide icons, PWA Service Worker.
- **Mobile (Driver)**: React Native, Expo 51, TypeScript.
- **Backend API**: NestJS 10, TypeScript, Socket.IO WebSockets, Helmet, CORS.
- **Database & ORM**: PostgreSQL, PostGIS, Prisma ORM.
- **Authentication**: Firebase Authentication (Client) + Firebase Admin SDK (Backend token verification) + PostgreSQL RBAC & Tenant Isolation.

---

## 🚀 Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your PostgreSQL `DATABASE_URL` and Firebase Admin credentials if available.

### 3. Generate Database Client & Seed Demo Data
```bash
npm run db:generate
npm run db:seed
```

### 4. Run Development Servers
To run both backend API (port 4000) and Web app (port 3000) concurrently:
```bash
npm run dev
```

Or run individually:
```bash
npm run dev:api     # Starts NestJS on http://localhost:4000
npm run dev:web     # Starts Next.js on http://localhost:3000
npm run dev:driver  # Starts Expo bundler for React Native driver app
```

---

## 🧪 Testing & Quality Validation

Run the automated test suite verifying trip state machine transitions and capacity safety:
```bash
npm test
```

Run TypeScript compilation check across all packages:
```bash
npm run typecheck
```

---

## 🔒 Security & Tenant Isolation

- **Firebase UID Verification**: The backend derives user identity strictly from the verified Firebase ID token (`admin.auth().verifyIdToken()`).
- **No Client Trust**: Client-supplied `accountId`, `eventId`, `role`, or `driverId` are never trusted without server-side verification.
- **Tenant Scope Enforcement**: `TenantGuard` verifies that users can only access events and data belonging to their authorized account.
- **Capacity Race Condition Protection**: Booking creation runs inside an interactive database transaction (`prisma.$transaction`) with seat count validation to prevent overbooking.

---

## 📄 License
Private & Confidential — SAFAR Platform.
