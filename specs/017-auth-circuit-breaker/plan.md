# Implementation Plan: Auth Remote Evaluation Circuit Breaker

**Branch**: `017-auth-circuit-breaker` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-auth-circuit-breaker/spec.md`

## Summary

Implement a circuit breaker pattern in the `AuthRemoteEvaluationService` to protect against NATS server failures, using the opossum library. The circuit breaker will fail fast during outages, automatically recover when services restore, and provide observability through structured logging. Includes retry logic with exponential backoff for transient failures.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20.15.1 (Volta-pinned)
**Primary Dependencies**: NestJS 10.x, @nestjs/microservices (NATS transport), opossum (circuit breaker), @types/opossum, RxJS 7.x
**Storage**: N/A - no persistence required (circuit state is local to service instance)
**Testing**: Jest with NestJS testing utilities, existing mock patterns in `test/mocks/`
**Target Platform**: Linux server (Docker/Kubernetes deployment)
**Project Type**: Single NestJS project (existing structure)
**Performance Goals**: <1ms circuit breaker overhead, <3s timeout for individual requests, <60s recovery after service restoration
**Constraints**: Thread-safe concurrent request handling, fail-closed security model (deny on circuit open)
**Scale/Scope**: Single service modification (~200-300 LOC), configuration extension, unit tests

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Principle 1: Domain-Centric Design First
✅ **PASS** - The circuit breaker is an infrastructure resilience pattern implemented in the adapter layer (`src/services/external/auth-remote-evaluation/`). No business rules are embedded; the service remains an orchestration layer for external authorization calls. The authorization domain logic in `src/core/authorization/` is unchanged.

### Principle 5: Observability & Operational Readiness
✅ **PASS** - Observability signals:
- **Logs**: Structured log entries via existing Winston logger for:
  - Circuit state transitions (closed→open: warn, open→half-open: verbose, half-open→closed: verbose)
  - Retry attempts (verbose level with attempt number, delay, error reason)
  - Circuit open rejections (rate-limited warn, once per open period)
- No new Prometheus metrics or dashboards (per constitution: instrument only what we consume)
- Uses existing `LogContext.AUTH_EVALUATION` context for log correlation

### Principle 6: Code Quality with Pragmatic Testing
✅ **PASS** - Meaningful automated tests planned:
- Unit tests for circuit breaker configuration validation
- Unit tests for retry logic behavior (retry on timeout, no retry on "no subscribers")
- Unit tests for circuit state transitions and logging
- Integration test simulating circuit open/close cycle
- No snapshot tests; no trivial pass-through coverage

## Project Structure

### Documentation (this feature)

```text
specs/017-auth-circuit-breaker/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (interfaces and types)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── services/external/auth-remote-evaluation/
│   ├── auth.remote.evaluation.module.ts   # Updated: inject ConfigService
│   ├── auth.remote.evaluation.service.ts  # Updated: circuit breaker + retry
│   ├── auth.remote.evaluation.types.ts    # New: CircuitOpenResponse, config types
│   └── index.ts                           # Updated: export new types

├── types/
│   └── alkemio.config.ts                  # Updated: add circuit breaker config type

config/
└── alkemio.yml                            # Updated: add circuit breaker defaults

test/
└── mocks/
    └── (existing patterns reused)
```

**Structure Decision**: Extend existing `src/services/external/auth-remote-evaluation/` module. This aligns with the existing architecture where external service adapters live in `src/services/external/`. Configuration follows established patterns using `ConfigService<AlkemioConfig>`.

## Complexity Tracking

> No constitution violations. Feature follows established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
