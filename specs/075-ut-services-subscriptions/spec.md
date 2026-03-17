# Specification: Unit Tests for src/services/subscriptions

## Objective

Achieve >=80% test coverage for `src/services/subscriptions` area by adding unit tests for the `SubscriptionReadService`, which is the only testable service currently lacking coverage.

## Scope

### In Scope

- `subscription.read.service.ts` - 6 methods, each delegating to a typed PubSubEngine

### Out of Scope (excluded by convention)

- `*.dto.ts` / payload files - pure interfaces, no runtime logic
- `typed.pub.sub.engine.ts` - type-only file, no runtime behavior
- `subscription.service.module.ts` - NestJS module wiring
- `index.ts` - barrel exports

### Existing Coverage

- `subscription.publish.service.ts` - 100% covered by existing spec

## Success Criteria

- All tests pass via `npx vitest run src/services/subscriptions`
- Coverage >= 80% for statements and lines
- No lint or type-check errors
