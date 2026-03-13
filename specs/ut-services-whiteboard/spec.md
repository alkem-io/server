# Spec: Unit Tests for `src/services/whiteboard-integration`

## Objective

Achieve >= 80% test coverage for the whiteboard-integration service area by adding comprehensive unit tests for the two testable files:

1. `whiteboard.integration.service.ts` -- business logic (partially covered by existing spec)
2. `whiteboard.integration.controller.ts` -- RMQ message/event handlers

## Scope

### In Scope

- `WhiteboardIntegrationService`: all public methods (`accessGranted`, `info`, `who`, `save`, `fetch`, `contribution`, `contentModified`) and private helpers exercised through them
- `WhiteboardIntegrationController`: all handler methods (`info`, `who`, `contribution`, `contentModified`, `health`, `save`, `fetch`)

### Out of Scope (excluded by convention)

- `*.entity.ts`, `*.interface.ts`, `*.module.ts`, `*.dto.ts`, `*.input.ts`, `*.enum.ts`, `*.type.ts`, `*.types.ts`, `*.constants.ts`, `index.ts`
- Integration/E2E tests
- Output data classes (trivial constructors, no logic)

## Existing Coverage

The existing `whiteboard.integration.service.spec.ts` covers guest-handling scenarios for `accessGranted` and `info`. It does NOT cover:
- `who()` method
- `save()` method (success + error paths)
- `fetch()` method (success + error paths)
- `contribution()` method
- `contentModified()` method
- Controller delegation and `ack()` calls

## Test Strategy

- Vitest 4.x globals
- Manual mock construction (matching existing spec pattern)
- Controller tests: mock `WhiteboardIntegrationService` + verify `ack()` is called and service methods are delegated to
