# Tasks: Unit Tests for src/services/api-rest

## Task 1: Create CalendarEventIcsController test
- **File**: `src/services/api-rest/calendar-event-ics/calendar-event-ics.controller.spec.ts`
- **Tests**:
  - [x] Controller is defined
  - [x] Redirects to /login when actorContext is missing
  - [x] Redirects to /login when actorID is null/undefined
  - [x] Uses req.originalUrl for redirect URL
  - [x] Falls back to req.url when originalUrl is absent
  - [x] Falls back to "/" when neither URL is available
  - [x] Calls service.generateIcs with correct id and actorContext
  - [x] Sets Content-Type header to text/calendar
  - [x] Sets Content-Disposition with correct filename
  - [x] Sets Cache-Control to no-store
  - [x] Sends ICS content via res.send

## Task 2: Create IdentityResolveController test
- **File**: `src/services/api-rest/identity-resolve/identity-resolve.controller.spec.ts`
- **Tests**:
  - [x] Controller is defined
  - [x] Calls resolveUser with authenticationId and meta
  - [x] Returns correct response DTO shape
  - [x] Passes IP from request
  - [x] Passes user-agent from request headers

## Task 3: Enhance IdentityResolveService test
- **File**: `src/services/api-rest/identity-resolve/identity-resolve.service.spec.ts`
- **Tests** (linkAuthenticationToExistingUser flow):
  - [x] Returns existing user already linked to same auth ID
  - [x] Links auth ID to user with no existing authenticationID
  - [x] Allows relinking when old Kratos identity no longer exists
  - [x] Throws when user linked to different still-valid Kratos identity
  - [x] Throws when new auth ID already claimed by another user
  - [x] Rethrows unexpected errors from registration

## Task 4: Verify coverage >= 80%
- [x] Run `pnpm vitest run --coverage src/services/api-rest`
- [x] Run `pnpm lint`
- [x] Run `pnpm exec tsc --noEmit`
