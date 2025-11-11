# Data Model – Kratos Authentication ID Linking

## User (existing aggregate)
- **Table:** `user`
- **New Field:** `authenticationID: char(36) | null`
  - Unique across all users when non-null
  - Represents the Ory Kratos identity UUID
  - Nullable to accommodate legacy users without identities or removed identities
- **Relationships (unchanged):**
  - `agent` (OneToOne) – used for credentials and authorization
  - `profile` (OneToOne) – user profile metadata
  - `settings` (OneToOne) – notification/communication preferences
- **State Transitions:**
  - `authenticationID` set on first successful login or REST-triggered creation
  - `authenticationID` cleared when platform-admin mutations remove the Kratos account

## Backfill Mutation Context
- **Module:** `platform-admin/domain/user/authentication-id-backfill`
- **Input:** none (admin trigger)
- **Process:**
  1. Retrieve users lacking `authenticationID` in paginated batches.
  2. Fetch Kratos identity by email via Admin API.
  3. Update user with returned UUID when present.
  4. Log missing identities; continue without failing batch.
- **Output:** operation status summary (processed, updated, skipped counts).

## Internal REST Endpoint
- **Module:** `services/api-rest/identity-resolve`
- **Route:** `POST /rest/internal/identity/resolve`
- **Request Body:** `{ "authenticationId": "<uuid>" }`
- **Behavior:**
  1. Validate the `authenticationId` payload and reject malformed UUIDs.
  2. Look up user by `authenticationId`.
  3. If not found, load identity from Kratos Admin API and pass through `UserAuthenticationLinkService` (via registration service) to create/link the user before returning the mapping.
  4. Emit structured `LogContext.AUTH` audit entries for each attempt.
  5. Return `{ "userId": "<alkemio-user-uuid>" }`.

## Migration Artifacts
- **TypeORM Migration:**
  - Adds `authenticationID` column (nullable, `char(36)`), plus unique index on non-null values.
  - Down migration drops column and index.
  - Requires pre-check ensuring no duplicate Kratos IDs in seed data.

## Logging & Audit Entities
- **Log Events:**
  - Backfill mutation: log batch metrics under `LogContext.AUTH`.
  - REST endpoint: log caller IP, `authenticationId`, outcome (found/created/linked) under `LogContext.AUTH`.
- **No new persistence entities** beyond updated `User` aggregate.

## Domain Services
- **UserAuthenticationLinkService**: centralizes lookup, conflict detection, and assignment of `authenticationID` across onboarding, REST identity resolve, and the admin backfill workflow. All write paths delegate to this service to ensure consistent logging and cache invalidation.
