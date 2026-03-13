# Feature Specification: Unit Test Coverage for src/apm

**Feature Branch**: `ut-apm`
**Created**: 2026-03-12
**Status**: Complete

## User Scenarios & Testing

### User Story 1 - APM Module Test Coverage (Priority: P1)

The `src/apm` module provides Elastic APM integration for the Alkemio server, including method-level instrumentation via class decorators and an Apollo Server plugin for GraphQL operation tracing. Tests ensure that instrumentation logic correctly creates spans, copies metadata, and handles edge cases (no active transaction, disabled APM, skipped methods).

**Acceptance Scenarios**:

1. Given a class with methods, When the `createInstrumentedClassDecorator` is applied, Then each eligible method is wrapped in a Proxy that creates APM spans.
2. Given a method that returns a Promise, When instrumented and called, Then the span ends after the Promise resolves.
3. Given no active APM transaction, When an instrumented method is called, Then the original method executes without span creation.
4. Given a class decorator with `skipMethods`, When applied, Then listed methods are not instrumented.
5. Given a class decorator with `matchMethodsOnMetadataKey`, When applied, Then only methods with that metadata key are instrumented.
6. Given an object with reflect metadata, When `copyMetadata` is called, Then all metadata keys and values are transferred to the target.
7. Given the Apollo plugin, When a GraphQL operation resolves, Then the APM transaction is named with the operation type and name.
8. Given `enabled: false`, When the decorator is applied, Then no methods are instrumented.

## Requirements

### Functional Requirements

- FR-001: All APM utility functions (`copyMetadata`, `instrumentMethod`, `createInstrumentedClassDecorator`) MUST have >=80% line coverage
- FR-002: The Apollo plugin (`ApmApolloPlugin`) MUST have >=80% line coverage
- FR-003: Decorator factories (`InstrumentResolver`, `InstrumentService`) MUST be covered via integration with `createInstrumentedClassDecorator`
- FR-004: Edge cases (no transaction, no span, disabled decorator) MUST be tested

### Non-Functional Requirements

- NFR-001: Tests MUST NOT depend on a running Elastic APM agent
- NFR-002: Tests MUST mock the `apmAgent` module to avoid side effects
- NFR-003: Tests MUST use Vitest globals (describe, it, expect) with `vi` for mocking

## Success Criteria

- SC-001: Coverage report shows >=80% for src/apm (excluding index.ts files)
- SC-002: All tests pass via `pnpm vitest run src/apm`
- SC-003: TypeScript compilation succeeds with `pnpm exec tsc --noEmit`
- SC-004: Biome lint passes with `pnpm lint`
