# Requirements Checklist: src/apm Test Coverage

**Created**: 2026-03-12

## Functional Requirements

- [x] FR-001: copyMetadata - copies all metadata keys from source to destination
- [x] FR-002: copyMetadata - handles objects with no metadata
- [x] FR-003: instrumentMethod - creates span when transaction is active
- [x] FR-004: instrumentMethod - skips span creation when no active transaction
- [x] FR-005: instrumentMethod - skips span creation when startSpan returns null
- [x] FR-006: instrumentMethod - handles Promise return values (ends span after resolve)
- [x] FR-007: instrumentMethod - handles Function return values
- [x] FR-008: instrumentMethod - handles synchronous return values
- [x] FR-009: createInstrumentedClassDecorator - wraps eligible methods
- [x] FR-010: createInstrumentedClassDecorator - skips when enabled=false
- [x] FR-011: createInstrumentedClassDecorator - skips methods in skipMethods list
- [x] FR-012: createInstrumentedClassDecorator - skips constructor
- [x] FR-013: createInstrumentedClassDecorator - skips non-function properties
- [x] FR-014: createInstrumentedClassDecorator - filters by metadata key
- [x] FR-015: ApmApolloPlugin - sets transaction name on didResolveOperation
- [x] FR-016: ApmApolloPlugin - handles missing transaction in didResolveOperation
- [x] FR-017: ApmApolloPlugin - assignOperationType returns correct type for Query/Mutation/Subscription/field

## Non-Functional Requirements

- [x] NFR-001: No external APM agent dependency in tests
- [x] NFR-002: All mocks properly isolated
- [x] NFR-003: Tests use Vitest conventions (globals, vi)

## Coverage

- [x] COV-001: >=80% line coverage for src/apm
