# Specification: Unit Tests for src/services/api-rest

## Objective
Achieve >=80% unit test coverage for the `src/services/api-rest` area, covering two sub-modules:
- `calendar-event-ics`: ICS file generation and download for calendar events (controller, service, redirect filter)
- `identity-resolve`: Identity resolution endpoint for Kratos authentication (controller, service)

## Scope

### In Scope
- Unit tests for `CalendarEventIcsController` (new)
- Unit tests for `IdentityResolveController` (new)
- Additional coverage for `IdentityResolveService.linkAuthenticationToExistingUser` (existing test gap)
- All tests co-located with source files as `*.spec.ts`

### Out of Scope
- Module files (`*.module.ts`)
- DTO files (`*.dto.ts`)
- Interface/type files (`*.interface.ts`, `*.types.ts`)
- Integration or E2E tests

## Files Under Test

| File | Existing Test | New/Enhanced |
|------|--------------|--------------|
| `calendar-event-ics.controller.ts` | None | New |
| `calendar-event-ics.service.ts` | Yes (11 tests) | No changes needed |
| `calendar-event-ics.redirect.filter.ts` | Yes (19 tests) | No changes needed |
| `identity-resolve.controller.ts` | None | New |
| `identity-resolve.service.ts` | Yes (7 tests) | Enhanced (linkAuthenticationToExistingUser) |

## Test Strategy
- Vitest 4.x with globals
- NestJS `Test.createTestingModule` for DI
- `MockWinstonProvider` for logger
- `defaultMockerFactory` for auto-mocking dependencies
- Mock all external services; test logic in isolation
