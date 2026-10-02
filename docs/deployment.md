# SAFAR Production Deployment Guide

## Infrastructure Topology

```
[ Vercel CDN ]           [ Persistent Server / Container ]         [ Managed DB ]
   apps/web                    services/api                         PostgreSQL
(Next.js + PWA)       (NestJS REST API + WebSocket Server)           + PostGIS
      │                                    │                              │
      └────────────────────────────────────┴──────────────────────────────┘
```

> **Important**: Do NOT attempt to run NestJS WebSockets inside a serverless Vercel function. Vercel functions are stateless and terminate after execution. Deploy `services/api` on Render, Railway, Fly.io, or AWS ECS/Fargate where persistent TCP connections and WebSockets can run 24/7.

## 1. Web Application (Vercel)
1. Import repository on Vercel.
2. Root Directory: `apps/web`.
3. Framework Preset: Next.js.
4. Set Environment Variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_API_URL` (Points to your live NestJS API URL)
   - `NEXT_PUBLIC_WS_URL` (Points to your live WebSocket URL)
5. Deploy.

## 2. API Backend (Render / Railway / Fly.io / Docker)
1. Deploy from `services/api`.
2. Configure persistent container runtime with Node.js 20+.
3. Set Environment Variables:
   - `DATABASE_URL` (PostgreSQL connection string with SSL)
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `PORT=4000`
4. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```

## 3. Driver App (Expo EAS Build)
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Navigate to `apps/driver` and run:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```
