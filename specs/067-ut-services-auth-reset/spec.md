# Spec: Unit Tests for `src/services/auth-reset`

## Overview

Add comprehensive unit tests for the `auth-reset` service area, covering both the **publisher** (`AuthResetService`) and the **subscriber** (`AuthResetController`). The goal is to reach at least 80% line/branch coverage for these two source files.

## Scope

### In-scope files (testable logic)

| File | Role |
|------|------|
| `src/services/auth-reset/publisher/auth-reset.service.ts` | Publishes authorization and license reset events to RabbitMQ |
| `src/services/auth-reset/subscriber/auth-reset.controller.ts` | Consumes RabbitMQ events and applies authorization/license resets with retry logic |

### Out-of-scope files (excluded per conventions)

- `auth-reset.payload.interface.ts` (interface)
- `reset.event.type.ts` (enum)
- `auth-reset.module.ts` (module)
- `auth-reset.subscriber.module.ts` (module)

## Key behaviors to test

### AuthResetService (publisher)

1. `publishResetAll` - orchestrates all reset publish calls; creates task if none provided; wraps errors in `BaseException`
2. `publishAuthorizationResetAllAccounts` - fetches accounts, emits one event per account
3. `publishLicenseResetAllAccounts` - fetches accounts, emits license reset events
4. `publishLicenseResetAllOrganizations` - fetches organizations, emits license reset events
5. `publishAuthorizationResetAllUsers` - fetches users, emits auth reset events
6. `publishAuthorizationResetAllOrganizations` - fetches organizations, emits auth reset events
7. `publishAuthorizationResetPlatform` - emits platform auth + license reset (no task)
8. `publishAuthorizationResetAiServer` - emits AI server auth reset (no task)

### AuthResetController (subscriber)

Each handler follows the same pattern: fetch entity, apply policy, save, ack; on failure retry up to MAX_RETRIES=5.

1. `authResetAccount` - success path + retry + max-retries-rejection
2. `licenseResetAccount` - success path + retry + max-retries-rejection
3. `licenseResetOrganization` - success path + retry + max-retries-rejection
4. `authResetPlatform` - success + retry + max-retries
5. `licenseResetPlatform` - success + retry + max-retries
6. `authResetAiServer` - success + retry + max-retries
7. `authResetUser` - success + retry + max-retries
8. `authResetOrganization` - success + retry + max-retries

## Acceptance criteria

- All test files pass `pnpm vitest run`
- Combined coverage of the two source files >= 80%
- No TypeScript compiler errors
- No Biome lint violations
