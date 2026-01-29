# Implementation Plan: 5-Digit Numeric Error Code System

**Branch**: `001-error-codes` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-error-codes/spec.md`
**GitHub Issue**: [#5714](https://github.com/alkem-io/server/issues/5714)

## Summary

Implement a 5-digit numeric error code system that augments the existing `AlkemioErrorStatus` string-based error codes. The system adds a `numericCode` field to GraphQL error extensions while preserving backward compatibility with the existing `code` field. Error codes are categorized by first two digits (10=NotFound, 11=Authorization, 12=Validation, 13=Operations, 14=System, 99=Fallback), with 1000 codes available per category.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, GraphQL 16, Apollo Server 4, graphql library
**Storage**: N/A (no database changes - code mapping is compile-time constant)
**Testing**: Vitest 3.x (recently migrated from Jest)
**Target Platform**: Linux server (Docker containers)
**Project Type**: NestJS monolith server
**Performance Goals**: No measurable impact - error code lookup is O(1) Map access
**Constraints**: Zero breaking changes to existing API consumers
**Scale/Scope**: 71 existing error codes to map, ~50 exception classes to update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                 | Status | Notes                                                                        |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 1. Domain-Centric Design First            | PASS   | Error codes are cross-cutting infrastructure, appropriately in `src/common/` |
| 2. Modular NestJS Boundaries              | PASS   | Changes confined to `src/common/exceptions/` and `src/common/enums/`         |
| 3. GraphQL Schema as Stable Contract      | PASS   | Adding `numericCode` is additive, existing `code` unchanged                  |
| 4. Explicit Data & Event Flow             | N/A    | No state changes or events involved                                          |
| 5. Observability & Operational Readiness  | PASS   | Fallback code triggers warning log per FR-006                                |
| 6. Code Quality with Pragmatic Testing    | PASS   | Unit tests for mapping completeness and fallback behavior                    |
| 7. API Consistency & Evolution Discipline | PASS   | Follows existing error extension pattern                                     |
| 8. Secure-by-Design Integration           | PASS   | No new external inputs or security concerns                                  |
| 9. Container & Deployment Determinism     | PASS   | Error codes are compile-time constants                                       |
| 10. Simplicity & Incremental Hardening    | PASS   | Minimal change - single registry, no new abstractions                        |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/032-error-codes/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (GraphQL schema changes)
│   └── error-extensions.graphql
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── common/
│   ├── enums/
│   │   ├── alkemio.error.status.ts      # Existing - unchanged
│   │   └── error.category.ts            # NEW - category enum
│   ├── exceptions/
│   │   ├── base.exception.ts            # MODIFY - add numericCode/userMessage to extensions
│   │   ├── error.status.metadata.ts     # NEW - metadata mapping
│   │   ├── error.status.metadata.spec.ts # NEW - metadata tests
│   │   └── http/
│   │       └── base.http.exception.ts   # MODIFY - add numericCode support

docs/
└── error-codes.md                       # NEW - error code documentation for support/frontend
```

**Structure Decision**: Changes are localized to `src/common/` following the existing exception infrastructure pattern. The error code registry is a pure utility with no NestJS DI requirements, making it suitable for `src/common/` rather than a separate module.

## Complexity Tracking

> No violations - table not required.
