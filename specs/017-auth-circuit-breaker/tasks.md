# Tasks: Auth Remote Evaluation Circuit Breaker

**Input**: Design documents from `/specs/017-auth-circuit-breaker/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit tests consolidated in final testing phase per Constitution Principle 6 - meaningful tests for circuit breaker behavior, retry logic, and state transitions. All implementation code written first to ensure complete understanding of requirements and standards compliance.

**Organization**: Implementation tasks grouped by user story, testing consolidated at the end to validate complete implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `test/` at repository root
- Paths follow existing NestJS project structure per plan.md

---

## Phase 1: Setup (Dependencies & Configuration)

**Purpose**: Install dependencies and extend configuration schema

- [ ] T001 Install opossum circuit breaker library: `pnpm add opossum`
- [ ] T002 Install opossum TypeScript types: `pnpm add -D @types/opossum`
- [ ] T003 [P] Add auth_evaluation configuration section to `alkemio.yml` under microservices namespace
- [ ] T004 [P] Extend AlkemioConfig type with auth_evaluation config in `src/types/alkemio.config.ts`

---

## Phase 2: Foundational (Type Definitions)

**Purpose**: Core types and interfaces that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create `src/services/external/auth-remote-evaluation/auth.remote.evaluation.types.ts` with:
  - AuthEvaluationCircuitBreakerConfig interface
  - AuthEvaluationRetryConfig interface
  - AuthEvaluationConfig interface
  - CircuitOpenDenialMetadata interface
  - CircuitOpenResponse interface
  - isCircuitOpenResponse type guard
  - AUTH_EVALUATION_CONFIG_DEFAULTS constant
- [ ] T006 Update `src/services/external/auth-remote-evaluation/index.ts` to export new types

**Checkpoint**: Foundation ready - type definitions in place for service implementation

---

## Phase 3: User Story 1 - Graceful Degradation During NATS Outage (Priority: P1) 🎯 MVP

**Goal**: Implement circuit breaker with timeout, retry logic, and fail-fast behavior when NATS is unavailable

**Independent Test**: Stop NATS server or auth microservice, verify authorization requests fail within 3 seconds with CircuitOpenResponse

- [ ] T007 [US1] Update `src/services/external/auth-remote-evaluation/auth.remote.evaluation.module.ts`:
  - Add ConfigModule import
  - Inject ConfigService into module providers
- [ ] T008 [US1] Refactor `src/services/external/auth-remote-evaluation/auth.remote.evaluation.service.ts`:
  - Add ConfigService injection to constructor
  - Add private circuitBreaker: CircuitBreaker property
  - Add private retryConfig property from ConfigService
  - Create private createCircuitBreaker() method with opossum options
  - Create private executeWithRetry() method implementing retry logic with exponential backoff
  - Create private isRetryableError() helper (retry timeouts/connections, not "no subscribers")
  - Create private delay() helper for backoff timing
  - Initialize circuit breaker in constructor
- [ ] T009 [US1] Implement circuit breaker wrapping in `auth.remote.evaluation.service.ts`:
  - Wrap NATS client.send() call inside circuit breaker
  - Add fallback function returning CircuitOpenResponse when circuit is open
  - Calculate retryAfter from circuit state and reset timeout
- [ ] T010 [US1] Implement retry logic in `auth.remote.evaluation.service.ts`:
  - Implement evaluateWithRetry() that wraps executeNatsRequest()
  - Add exponential backoff calculation: min(baseDelay * 2^(attempt-1), 8000)
  - Exit retry loop immediately on "no subscribers listening" error (FR-016)
  - Count all retry attempts toward circuit failure threshold (FR-013)

**Checkpoint**: User Story 1 implementation complete - circuit breaker core in place

---

## Phase 4: User Story 2 - Automatic Recovery After Service Restoration (Priority: P2)

**Goal**: Implement half-open probing and automatic recovery when NATS service is restored

**Independent Test**: Simulate failure until circuit opens, wait 45s, restore service, verify circuit closes automatically

- [ ] T011 [US2] Extend circuit breaker configuration in `auth.remote.evaluation.service.ts`:
  - Set resetTimeout from config (default: 45000ms)
  - Configure half-open behavior (single probe request)
- [ ] T012 [US2] Implement state transition handling in `auth.remote.evaluation.service.ts`:
  - Track circuit state for response metadata
  - Reset failure count on successful probe
  - Reopen circuit immediately on probe failure

**Checkpoint**: User Story 2 implementation complete - self-healing behavior in place

---

## Phase 5: User Story 3 - Observability of Circuit Breaker State (Priority: P3)

**Goal**: Implement structured logging for all circuit state transitions and retry attempts

**Independent Test**: Trigger circuit state changes, verify log entries with correct levels and context

- [ ] T013 [US3] Add opossum event handlers in `auth.remote.evaluation.service.ts`:
  - Create private attachEventHandlers() method called in constructor
  - Handle 'open' event: warn level log with failure count
  - Handle 'halfOpen' event: verbose level log
  - Handle 'close' event: verbose level log
  - Handle 'timeout' event: verbose level log
- [ ] T014 [US3] Implement rate-limited reject logging in `auth.remote.evaluation.service.ts`:
  - Add private lastRejectLogTime: number = 0 property
  - Add private REJECT_LOG_INTERVAL = 45000 constant (matches reset timeout)
  - Handle 'reject' event: rate-limited warn log (once per circuit-open period)
- [ ] T015 [US3] Add retry attempt logging in `auth.remote.evaluation.service.ts`:
  - Log each retry at verbose level with: attempt number, delay, error reason
  - Use LogContext.AUTH_EVALUATION for all logs

**Checkpoint**: All user story implementations complete - full functionality in place

---

## Phase 6: Unit Testing (All User Stories)

**Purpose**: Validate all implemented functionality with meaningful, risk-based tests per Constitution Principle 6

**⚠️ NOTE**: All implementation must be complete before starting this phase to ensure tests validate the actual behavior and code meets standards

### User Story 1 Tests - Circuit Breaker Core

- [ ] T016 [P] [US1] Create `src/services/external/auth-remote-evaluation/auth.remote.evaluation.service.spec.ts`:
  - Test: circuit breaker opens after 15 consecutive failures
  - Test: request timeout triggers failure count
  - Test: CircuitOpenResponse returned when circuit is open
  - Test: retryAfter field correctly calculated
- [ ] T017 [P] [US1] Add retry logic tests to `auth.remote.evaluation.service.spec.ts`:
  - Test: retry on timeout error with exponential backoff
  - Test: no retry on "no subscribers listening" error
  - Test: retry stops when circuit opens

### User Story 2 Tests - Recovery Behavior

- [ ] T018 [P] [US2] Add recovery tests to `auth.remote.evaluation.service.spec.ts`:
  - Test: circuit transitions to half-open after reset timeout
  - Test: successful probe closes circuit
  - Test: failed probe reopens circuit
  - Test: normal operation resumes after circuit closes

### User Story 3 Tests - Observability

- [ ] T019 [P] [US3] Add logging tests to `auth.remote.evaluation.service.spec.ts`:
  - Test: warn log emitted when circuit opens
  - Test: verbose log emitted on half-open and close
  - Test: retry attempts logged at verbose level
  - Test: reject logs are rate-limited (not per-request)

**Checkpoint**: All tests passing - complete validation of circuit breaker implementation

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and cleanup

- [ ] T020 [P] Verify lint passes: `pnpm lint`
- [ ] T021 [P] Verify all tests pass: `pnpm test:ci -- --testPathPattern="auth.remote.evaluation"`
- [ ] T022 [P] Update `specs/017-auth-circuit-breaker/quickstart.md` with actual test commands
- [ ] T023 Run quickstart.md validation (manual test with NATS down)
- [ ] T024 Code review: verify no dynamic data in exception messages per copilot-instructions.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories proceed in priority order (P1 → P2 → P3)
  - Each phase builds on the previous
- **Testing (Phase 6)**: Depends on ALL user story implementations being complete
- **Polish (Phase 7)**: Depends on testing phase completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core circuit breaker implementation
- **User Story 2 (P2)**: Builds on US1 circuit breaker - Adds recovery behavior
- **User Story 3 (P3)**: Builds on US1/US2 - Adds observability layer

### Testing Strategy

- All tests consolidated in Phase 6 after implementation is complete
- Tests validate actual implemented behavior, not hypothetical code
- Parallel execution possible within Phase 6 (all T016-T019 are independent)
- Implementation-first approach ensures complete understanding of requirements before writing tests

### Parallel Opportunities

- T003, T004 can run in parallel (different files)
- T016, T017, T018, T019 can ALL run in parallel (same test file, different test blocks)
- T020, T021, T022 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T006)
3. Complete Phase 3: User Story 1 (T007-T010)
4. Complete Phase 6 (partial): US1 tests only (T016-T017)
5. **STOP and VALIDATE**: Test with NATS down - requests should fail fast
6. Deploy/demo if ready - basic circuit breaker functional

### Full Implementation Flow

1. Setup + Foundational → Dependencies and types ready
2. User Story 1 → Fail-fast behavior implemented
3. User Story 2 → Auto-recovery implemented
4. User Story 3 → Logging implemented
5. Testing → All functionality validated
6. Polish → Clean and documented

### Single Developer Flow

1. T001 → T002 → T003 + T004 (parallel) → T005 → T006
2. T007 → T008 → T009 → T010
3. T011 → T012
4. T013 → T014 → T015
5. T016 + T017 + T018 + T019 (parallel)
6. T020 + T021 + T022 (parallel) → T023 → T024

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tasks** | 24 |
| **Setup Tasks** | 4 |
| **Foundational Tasks** | 2 |
| **User Story 1 Implementation** | 4 |
| **User Story 2 Implementation** | 2 |
| **User Story 3 Implementation** | 3 |
| **Testing Tasks** | 4 |
| **Polish Tasks** | 5 |
| **Parallel Opportunities** | 6 task groups |

**MVP Scope**: Tasks T001-T010 + T016-T017 (Setup + Foundational + US1 Implementation + US1 Tests)

---

## Notes

- All file paths are relative to repository root
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **Testing consolidated in Phase 6** - all implementation complete before tests
- Commit after each task or logical group
- Follow existing codebase patterns for ConfigService usage
- Use LogContext.AUTH_EVALUATION for all log entries
