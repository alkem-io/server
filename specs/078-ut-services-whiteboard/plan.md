# Plan: Unit Tests for `src/services/whiteboard-integration`

## Phase 1: Extend Service Tests

Extend the existing `whiteboard.integration.service.spec.ts` with new `describe` blocks for uncovered methods:

1. **`who()`** -- 3 tests: anonymous user returns empty string, guest user returns `guest-<uuid>`, authenticated user returns actorID
2. **`save()`** -- 2 tests: successful save returns SaveContentData, error returns SaveErrorData
3. **`fetch()`** -- 2 tests: successful fetch returns FetchContentData, error returns FetchErrorData
4. **`contribution()`** -- 1 test: resolves community, gets profile, calls reporter for each user
5. **`contentModified()`** -- 2 tests: delegates to activityAdapter, logs error on rejection

## Phase 2: New Controller Tests

Create `whiteboard.integration.controller.spec.ts` with:

1. Mock `WhiteboardIntegrationService` (all methods)
2. Mock `RmqContext` with `getChannelRef()` and `getMessage()`
3. Test each handler: verify `ack()` call + correct delegation

## Verification

- `pnpm vitest run --coverage src/services/whiteboard-integration`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
