# SAFAR Authentication & RBAC

Identity in SAFAR is strictly managed via Firebase Authentication while authorization and permissions are computed server-side in PostgreSQL.

## Flow

1. **Client Authenticates with Firebase**:
   - Host: Google SSO or Email/Password.
   - Guest: Phone OTP or Email.
   - Driver: Phone OTP.
2. **ID Token Sent via HTTP**:
   - Every request includes `Authorization: Bearer <firebaseIdToken>`.
3. **Backend Firebase Admin Verification**:
   - Backend decodes and cryptographically validates the token.
   - Resolves or provisions the SAFAR user in PostgreSQL.
4. **Tenant & Role Derivation**:
   - Checks `account_members` and `event_members`.
   - Never trusts client-supplied `role`, `accountId`, or `driverId`.
5. **Route Protection**:
   - `@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)`.

## Role Matrix

| Role | Scope | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Global | System-wide access |
| `ACCOUNT_OWNER` | Account | Fleet, billing, drivers, events |
| `EVENT_ORGANIZER` | Event | Wizard setup, dispatch, guest invites |
| `DISPATCHER` | Event | Trip dispatch and live telemetry |
| `DRIVER` | Assigned Duties | Duty status, trip execution, verify passenger |
| `GUEST` | Joined Event | View event itinerary, book rides, view boarding pass |
