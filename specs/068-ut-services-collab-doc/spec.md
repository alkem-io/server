# Specification: Unit Tests for collaborative-document-integration

## Overview

Add unit tests for the `src/services/collaborative-document-integration/` area to achieve at least 80% code coverage.

## Scope

### In Scope
- `collaborative-document-integration.controller.ts` -- RabbitMQ message handler delegating to the service
- `outputs/fetch.output.data.ts` -- `isFetchErrorData` type guard
- `outputs/save.output.data.ts` -- `isSaveErrorData` type guard

### Out of Scope (already tested or excluded by convention)
- `collaborative-document-integration.service.ts` -- already has comprehensive tests
- All `*.input.data.ts`, `*.enum.ts`, `*.types.ts`, `*.module.ts`, `index.ts` files

## Requirements

1. Controller test must verify each `@MessagePattern` handler:
   - Calls `ack(context)` on every message
   - Delegates to the correct service method with the payload
   - Returns the service result
2. Type guard tests must cover truthy and falsy branches.
3. All tests use Vitest 4.x globals, `@nestjs/testing`, `MockWinstonProvider`, and `defaultMockerFactory`.

## Acceptance Criteria
- `pnpm vitest run --coverage src/services/collaborative-document-integration` reports >= 80% line coverage
- `pnpm lint` passes
- `pnpm exec tsc --noEmit` passes
