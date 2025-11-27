# Data Model: Auth Remote Evaluation Circuit Breaker

**Feature**: 017-auth-circuit-breaker
**Date**: 2025-11-27
**Status**: Complete

## Overview

This feature introduces no new database entities. All state is ephemeral and local to the service instance. This document describes the in-memory data structures and TypeScript types used by the circuit breaker implementation.

## Type Definitions

### Configuration Types

```typescript
/**
 * Circuit breaker configuration options.
 * Extracted to alkemio.yml and accessed via ConfigService.
 */
export interface AuthEvaluationCircuitBreakerConfig {
  /** Whether circuit breaker is enabled (default: true) */
  enabled: boolean;

  /** Request timeout in milliseconds (default: 3000) */
  timeout: number;

  /** Number of consecutive failures before opening circuit (default: 15) */
  failure_threshold: number;

  /** Time in ms before circuit transitions to half-open (default: 45000) */
  reset_timeout: number;
}

/**
 * Retry configuration for transient failures.
 */
export interface AuthEvaluationRetryConfig {
  /** Maximum retry attempts (default: 5) */
  max_attempts: number;

  /** Base delay in ms for first retry (default: 500) */
  base_delay: number;

  /** Multiplier for exponential backoff (default: 2) */
  backoff_multiplier: number;
}

/**
 * Combined configuration for auth evaluation service.
 */
export interface AuthEvaluationConfig {
  circuit_breaker: AuthEvaluationCircuitBreakerConfig;
  retry: AuthEvaluationRetryConfig;
}
```

### Response Types

```typescript
/**
 * Existing interface - no changes required.
 * Returned on successful authorization evaluation.
 */
export interface AuthEvaluationResponse {
  allowed: boolean;
  reason: string;
}

/**
 * Extended response for circuit-open scenarios.
 * Satisfies FR-020 requirements.
 */
export interface CircuitOpenDenialMetadata {
  /** Current circuit state */
  circuitState: 'open';

  /** Number of failures that caused circuit to open */
  failureCount: number;
}

/**
 * Response returned when circuit breaker is open.
 * Implements fail-closed security model per spec.
 */
export interface CircuitOpenResponse extends AuthEvaluationResponse {
  allowed: false;
  reason: string;
  metadata: CircuitOpenDenialMetadata;

  /** Milliseconds until circuit will attempt recovery (probe request) */
  retryAfter: number;
}

/**
 * Type guard to distinguish circuit-open responses.
 */
export function isCircuitOpenResponse(
  response: AuthEvaluationResponse
): response is CircuitOpenResponse {
  return (
    response.allowed === false &&
    'metadata' in response &&
    (response as CircuitOpenResponse).metadata?.circuitState === 'open'
  );
}
```

### Internal State Types

```typescript
/**
 * Circuit breaker states (mirrors opossum internal states).
 */
export type CircuitState = 'closed' | 'open' | 'halfOpen';

/**
 * Metrics tracked for observability.
 * Not persisted - used for logging context only.
 */
export interface CircuitBreakerMetrics {
  /** Total successful requests since last reset */
  successes: number;

  /** Total failed requests since last reset */
  failures: number;

  /** Total rejected requests (while circuit open) */
  rejects: number;

  /** Total timeout events */
  timeouts: number;

  /** Current consecutive failure count */
  consecutiveFailures: number;
}
```

## State Transitions

```
                    ┌─────────────────┐
                    │     CLOSED      │
                    │ (Normal State)  │
                    └────────┬────────┘
                             │
                             │ 15 consecutive failures
                             │
                             ▼
                    ┌─────────────────┐
           ┌───────│      OPEN       │◄───────┐
           │       │ (Failing Fast)  │        │
           │       └────────┬────────┘        │
           │                │                 │
           │                │ 45s elapsed     │ Probe fails
           │                │                 │
           │                ▼                 │
           │       ┌─────────────────┐        │
           │       │   HALF-OPEN     │────────┘
           │       │ (Probing)       │
           │       └────────┬────────┘
           │                │
           │                │ Probe succeeds
           │                │
           └────────────────┘
```

### State Behaviors

| State | Behavior |
|-------|----------|
| **Closed** | All requests pass through to NATS. Failures tracked. |
| **Open** | All requests immediately rejected with `CircuitOpenResponse`. Timer running toward half-open. |
| **Half-Open** | Single probe request allowed through. Success → Closed. Failure → Open. |

## Configuration Defaults

```yaml
# alkemio.yml (to be added)
microservices:
  auth_evaluation:
    circuit_breaker:
      enabled: true
      timeout: 3000         # 3 seconds
      failure_threshold: 15 # consecutive failures
      reset_timeout: 45000  # 45 seconds (exceeds max retry window)
    retry:
      max_attempts: 5
      base_delay: 500       # milliseconds
      backoff_multiplier: 2
```

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                  AuthRemoteEvaluationService                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  CircuitBreaker │───▶│   ClientProxy   │───▶ NATS Server     │
│  │    (opossum)    │    │    (NestJS)     │                     │
│  └────────┬────────┘    └─────────────────┘                     │
│           │                                                      │
│           │ events                                               │
│           ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  Event Handlers │───▶│  Winston Logger │                     │
│  │  (state change) │    │                 │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │  ConfigService  │◀─── alkemio.yml                            │
│  │  <AlkemioConfig>│                                            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Rules

1. **Configuration Validation**:
   - `timeout` > 0 (positive integer, milliseconds)
   - `failure_threshold` >= 1 (at least one failure required)
   - `reset_timeout` > 0 (positive integer, milliseconds)
   - `max_attempts` >= 1 (at least one attempt)
   - `base_delay` >= 0 (can be 0 for no delay)
   - `backoff_multiplier` >= 1 (at least 1x, no decrease)

2. **Runtime Invariants**:
   - Circuit breaker instance created once at module init
   - State transitions are atomic (opossum guarantees this)
   - Metrics reset on circuit close
   - No persistence of circuit state across restarts

## Migration Notes

No database migrations required. This feature is purely in-memory.

## Testing Considerations

- Mock opossum circuit breaker for unit tests
- Use `breaker.open()` / `breaker.close()` to simulate state transitions in tests
- Verify `CircuitOpenResponse` structure matches spec
- Test retry backoff timing with mock timers
