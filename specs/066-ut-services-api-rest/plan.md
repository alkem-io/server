# Plan: Unit Tests for src/services/api-rest

## Phase 1: Analysis (Complete)
- Identified 5 testable source files in `src/services/api-rest/`
- 3 files already have tests; 2 controllers lack tests
- `IdentityResolveService` has a gap: `linkAuthenticationToExistingUser` private method untested

## Phase 2: Controller Test Implementation

### CalendarEventIcsController (new test file)
- Test `downloadIcs` method:
  - Redirects to login when actorContext is missing
  - Redirects to login when actorID is null
  - Calls service.generateIcs with correct parameters on success
  - Sets correct response headers (Content-Type, Content-Disposition, Cache-Control)
  - Sends ICS content in response body
  - Uses `req.originalUrl` for redirect, falls back to `req.url`, then `/`

### IdentityResolveController (new test file)
- Test `resolveIdentity` method:
  - Calls service.resolveUser with authenticationId and request metadata
  - Returns correct DTO shape (userId, actorID)
  - Passes IP and user-agent from request

## Phase 3: Service Gap Coverage

### IdentityResolveService (enhance existing)
- Test `linkAuthenticationToExistingUser` via `resolveUser`:
  - Returns existing user when already linked to same auth ID
  - Links auth ID to user with no existing authentication
  - Allows relinking when old Kratos identity no longer exists
  - Throws when user linked to a different still-valid Kratos identity
  - Throws when new auth ID already claimed by another user
  - Rethrows unexpected errors from registration

## Phase 4: Verification
- Run `pnpm vitest run --coverage src/services/api-rest`
- Confirm >=80% coverage
- Run `pnpm lint` and `pnpm exec tsc --noEmit`
