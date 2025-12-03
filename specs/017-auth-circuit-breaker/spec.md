# Feature Specification: Auth Remote Evaluation Circuit Breaker

**Feature Branch**: `017-auth-circuit-breaker`
**Created**: 2025-11-27
**Status**: Draft
**Input**: User description: "Create a circuit breaker in the AuthRemoteEvaluationService for NATS server resilience"

## Problem Statement

The `AuthRemoteEvaluationService` communicates with an external authorization evaluation microservice via NATS messaging. This service has a single dependency on the NATS server and its subscribers. Currently, the service lacks resilience mechanisms to handle:

1. **NATS server unavailability** - The messaging infrastructure being down
2. **No subscribers listening** - The auth evaluation microservice not running or disconnected
3. **Slow responses** - Subscribers taking too long to respond, causing request backlog

Without a circuit breaker, repeated failures cascade through the system, causing:
- Thread/connection exhaustion from pending requests
- Increased latency for all downstream operations
- Poor user experience during partial outages
- Difficulty diagnosing the root cause of failures

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Graceful Degradation During NATS Outage (Priority: P1)

As a platform operator, when the NATS server or auth evaluation subscriber becomes unavailable, I want the system to fail fast and return a clear authorization denial rather than hanging indefinitely, so that users receive timely feedback and the system remains responsive.

**Why this priority**: Core functionality - prevents system-wide degradation during infrastructure failures. This is the primary use case for implementing a circuit breaker.

**Independent Test**: Can be tested by stopping the NATS server or auth microservice and verifying that authorization requests fail quickly with appropriate error messaging.

**Acceptance Scenarios**:

1. **Given** the NATS server is unreachable, **When** an authorization evaluation request is made, **Then** the request fails within the configured timeout (≤3 seconds) with a clear service unavailable error.
2. **Given** no subscribers are listening to the auth.evaluate pattern, **When** an authorization evaluation request is made, **Then** the circuit breaker detects the failure and fails fast on subsequent requests.
3. **Given** the circuit is open due to previous failures, **When** new authorization requests arrive, **Then** they receive an immediate authorization denial (allowed: false) with a service unavailability reason, without attempting the NATS call.

---

### User Story 2 - Automatic Recovery After Service Restoration (Priority: P2)

As a platform operator, when the NATS server or auth subscriber recovers, I want the circuit breaker to automatically detect this and resume normal operation, so that manual intervention is not required to restore authorization functionality.

**Why this priority**: Essential for autonomous operation - reduces operational burden and ensures self-healing behavior.

**Independent Test**: Can be tested by simulating a failure, waiting for the reset timeout, then restoring the service and verifying successful requests resume.

**Acceptance Scenarios**:

1. **Given** the circuit is open and the reset timeout has elapsed, **When** the circuit enters half-open state, **Then** a test request is allowed through to probe the service.
2. **Given** the circuit is half-open and a probe request succeeds, **When** the success threshold is met, **Then** the circuit closes and normal operation resumes.
3. **Given** the circuit is half-open and a probe request fails, **When** the failure is detected, **Then** the circuit immediately reopens and the reset timeout restarts.

---

### User Story 3 - Observability of Circuit Breaker State (Priority: P3)

As a platform operator, I want to observe the circuit breaker's state and failure metrics through logs, so that I can monitor system health and diagnose authorization issues.

**Why this priority**: Supports debugging and operational awareness - critical for production monitoring but not blocking core functionality.

**Independent Test**: Can be tested by triggering circuit state changes and verifying appropriate log entries are produced with correct context.

**Acceptance Scenarios**:

1. **Given** the circuit breaker changes state (closed→open, open→half-open, half-open→closed), **When** the state transition occurs, **Then** a structured log entry is emitted with the new state, reason, and relevant metrics.
2. **Given** a request times out or is rejected by the circuit, **When** the failure is recorded, **Then** the failure details are logged at the appropriate level with correlation context.
3. **Given** the circuit breaker rejects a request due to open state, **When** the rejection occurs, **Then** a rate-limited warning log is emitted once per circuit-open period (not per rejected request) to avoid log flooding.

---

### Edge Cases

- What happens when the circuit opens during a burst of concurrent requests? All pending requests should receive rejection responses rather than waiting.
- How does the circuit behave during rolling deployments when subscribers temporarily disconnect? The circuit should tolerate brief blips without immediately opening.
- What happens if the NATS connection is re-established but the subscriber is still unavailable? The circuit should remain open until a successful probe completes.
- How are in-flight requests handled when the circuit transitions to open? They should complete with timeout rather than being aborted mid-flight.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST implement the circuit breaker pattern with three states: Closed (normal operation), Open (failing fast), and Half-Open (probing recovery).
- **FR-002**: System MUST track consecutive failures and open the circuit after 15 consecutive failures (default), ensuring intermittent successes reset the failure count.
- **FR-003**: System MUST timeout individual requests that exceed the configured duration (default: 3 seconds) and count them as failures.
- **FR-004**: When the circuit is open, system MUST gracefully return an authorization denial response (allowed: false) with a reason indicating service unavailability, rather than throwing an exception.
- **FR-005**: System MUST automatically transition to half-open state after the reset timeout elapses (default: 45 seconds).
- **FR-006**: System MUST close the circuit when a probe request in half-open state succeeds.
- **FR-007**: System MUST reopen the circuit immediately if a probe request in half-open state fails.
- **FR-008**: System MUST emit structured log entries for all state transitions at verbose level (circuit close, half-open) except circuit open which uses warn level.
- **FR-009**: System MUST use a proven, well-maintained circuit breaker library (opossum) rather than implementing custom logic.
- **FR-010**: All circuit breaker and retry configuration MUST be extracted as part of the service's general configuration via NestJS ConfigService, allowing environment-based tuning without code changes.
- **FR-011**: System MUST preserve existing error handling for "no subscribers listening" scenario as a triggering failure condition.
- **FR-012**: System MUST integrate with the existing NestJS module structure and dependency injection patterns.
- **FR-013**: System MUST implement retry logic inside the circuit breaker scope, where each retry attempt counts toward the circuit's failure threshold.
- **FR-014**: System MUST retry failed requests with exponential backoff (default: up to 5 retries with base delay of 500ms).
- **FR-015**: System MUST stop retrying immediately when the circuit opens, preventing retry storms during sustained outages.
- **FR-016**: System MUST only retry on transient failures (timeouts, network/connection errors) and MUST NOT retry on "no subscribers listening" errors (indicates service not running).
- **FR-017**: System MUST log each retry attempt at verbose level, including attempt number, delay before retry, and error reason.
- **FR-018**: Configurable parameters MUST include: request timeout, consecutive failure threshold, reset timeout, max retry attempts, retry base delay, and retry backoff multiplier.
- **FR-019**: When circuit is open, system MUST log the denial reason at warn level but MUST rate-limit these logs to avoid flooding during high request volume (log once per circuit-open period, not per request).
- **FR-020**: The authorization response during circuit-open state MUST include: (a) allowed: false, (b) a structured reason field indicating service unavailability, (c) metadata about the issue (circuit state, failure count), and (d) a retryAfter field in milliseconds indicating when the circuit will attempt recovery (remaining reset timeout).

### Non-Functional Requirements

- **NFR-001**: Circuit breaker overhead MUST add less than 1ms latency to normal (closed state) requests.
- **NFR-002**: Circuit breaker MUST be thread-safe and handle concurrent requests correctly.
- **NFR-003**: Circuit breaker state MUST be local to the service instance (no distributed state required).

### Key Entities

- **CircuitBreakerState**: Enum representing the three circuit states (Closed, Open, HalfOpen).
- **CircuitBreakerConfig**: Configuration object containing timeout, errorThresholdPercentage, resetTimeout, and other tunable parameters.
- **AuthEvaluationCircuitBreaker**: Wrapped circuit breaker instance protecting the NATS client send operation.
- **CircuitOpenResponse**: Response structure for circuit-open denials containing: allowed (false), reason (string), metadata (circuitState, failureCount), and retryAfter (milliseconds until recovery attempt).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Authorization requests fail within 3 seconds when the NATS service is unavailable (vs. potential indefinite hang without circuit breaker).
- **SC-002**: System handles 100 concurrent authorization requests during circuit-open state without resource exhaustion.
- **SC-003**: Circuit breaker automatically recovers within 60 seconds of service restoration without manual intervention.
- **SC-004**: All circuit state transitions produce observable log entries that can be queried in production logging infrastructure.
- **SC-005**: Zero regression in authorization latency during normal operation (circuit closed).

## Clarifications

### Session 2025-11-27

- Q: Retry strategy - should retries be inside or outside the circuit breaker? → A: Retry inside breaker with generous retry count (retries count toward failure threshold, breaker stops retries when open)
- Q: Maximum retry attempts default? → A: 5 retries with exponential backoff (~30s max retry window)
- Q: Which errors should trigger retries? → A: Retry on timeout/connection errors only; "no subscribers listening" fails immediately (indicates service not running)
- Q: How should failure threshold work with retry amplification? → A: Require 15 consecutive failures before opening circuit (prevents premature opening when some requests succeed)
- Q: How should retry attempts be logged? → A: Log every retry attempt at verbose level (not debug or info), plus all circuit state transitions
- Q: Where should circuit breaker and retry configuration be defined? → A: All configuration extracted as part of the service's general configuration (via ConfigService)
- Q: What log level should be used for circuit breaker and retry logs? → A: Verbose level for all operational logs (retries, state transitions); warn level only for circuit open events
- Q: How should circuit-open rejections be handled? → A: Return authorization denial (allowed: false) with reason; rate-limit warn logs to once per circuit-open period to avoid flooding on many requests
- Q: What metadata should the circuit-open response include? → A: Include reason, circuit state, failure count metadata, and retryAfter field in milliseconds indicating when recovery will be attempted
- Q: Is 30s reset timeout sufficient given retry timing? → A: No, with 3s timeout and 5 retries, max failure window is ~30s. Reset timeout set to 45s to exceed this and allow adequate downstream recovery time

## Assumptions

- The existing `AuthRemoteEvaluationService` is the sole consumer of the auth evaluation NATS pattern.
- The NATS client (`ClientProxy`) from `@nestjs/microservices` is compatible with RxJS timeout operators and opossum circuit breaker wrapping.
- The service can tolerate denying authorization during circuit-open state (fail-closed security model).
- The opossum library (https://github.com/nodeshift/opossum) is suitable for production use based on its maturity (70k+ weekly downloads, Red Hat support).
- Configuration values will be provided via existing NestJS ConfigService patterns.

## Out of Scope

- Distributed circuit breaker state sharing across service instances
- Fallback to alternative authorization mechanisms during outage
- Health check endpoint exposing circuit breaker state
- Prometheus/OpenTelemetry metrics integration (can be added later)
