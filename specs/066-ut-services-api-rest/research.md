# Research: Unit Tests for src/services/api-rest

## Directory Structure
```
src/services/api-rest/
  calendar-event-ics/
    calendar-event-ics.controller.ts     # REST controller, GET /rest/calendar/event/:id/ics
    calendar-event-ics.module.ts          # NestJS module
    calendar-event-ics.redirect.filter.ts # Exception filter for auth redirects
    calendar-event-ics.service.ts         # ICS generation logic
    calendar-event-ics.redirect.filter.spec.ts  # 19 tests
    calendar-event-ics.service.spec.ts          # 11 tests
  identity-resolve/
    dto/
      identity-resolve.request.dto.ts     # { authenticationId: UUID }
      identity-resolve.response.dto.ts    # { userId: UUID, actorID: UUID }
    types/
      identity-resolve.request-meta.ts    # { ip?, userAgent? }
    identity-resolve.controller.ts        # POST /rest/internal/identity/resolve
    identity-resolve.module.ts            # NestJS module
    identity-resolve.service.ts           # User resolution + registration logic
    identity-resolve.service.spec.ts      # 7 tests
```

## Key Dependencies

### CalendarEventIcsController
- `CalendarEventIcsService` - generates ICS content
- `RestGuard` - auth guard (decorator, not injected)
- `CalendarEventIcsRedirectFilter` - exception filter (decorator, not injected)
- `ActorContext` via `@CurrentActor()` decorator

### IdentityResolveController
- `IdentityResolveService` - resolves user from authentication ID
- Winston logger

### IdentityResolveService (linkAuthenticationToExistingUser gap)
- `UserService.save` - persists user updates
- `UserLookupService.getUserByEmail` - finds user by email
- `UserLookupService.getUserByAuthenticationID` - checks auth ID conflicts
- `KratosService.getIdentityById` - checks if old Kratos identity still exists

## Test Conventions
- Vitest 4.x globals (`describe`, `it`, `expect`, `vi`)
- `@nestjs/testing` Test module
- `MockWinstonProvider` from `@test/mocks/winston.provider.mock`
- `defaultMockerFactory` from `@test/utils/default.mocker.factory`
- Co-located test files (`*.spec.ts` next to source)
