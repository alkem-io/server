# Plan: Unit Tests for src/services/subscriptions

## Current State

- `SubscriptionPublishService` has full test coverage (8 tests, 100%)
- `SubscriptionReadService` has a skipped test file with 0% coverage
- Overall area coverage: 71% statements, 70% lines

## Gap Analysis

The only testable gap is `SubscriptionReadService` (lines 17-61). While it is a pass-through service, testing it is necessary to reach the 80% threshold.

## Implementation Plan

1. Replace the skipped `subscription.read.service.spec.ts` with real tests
2. Use the `pubSubEngineMockFactory` from `@test/utils` to mock all 6 PubSubEngine tokens
3. Verify each of the 6 `subscribeTo*` methods calls `asyncIterableIterator` with the correct `SubscriptionType`
4. Run coverage and verify >= 80%

## Risk Assessment

- Low risk: tests are straightforward delegation verification
- No schema, migration, or contract changes
