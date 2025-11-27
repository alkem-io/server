# Circuit Breaker Implementation Guide

## Overview

The Auth Remote Evaluation Service implements the **Circuit Breaker pattern** to provide resilience against downstream service failures. This pattern prevents cascade failures by detecting when a service is unhealthy and temporarily stopping requests to allow recovery.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AuthRemoteEvaluationService                       │
├─────────────────────────────────────────────────────────────────────────┤
│  evaluate()                                                              │
│      │                                                                   │
│      ▼                                                                   │
│  ┌─────────────────┐                                                    │
│  │ evaluateWithRetry│◄─── Retry Logic (outside circuit breaker)         │
│  └────────┬────────┘                                                    │
│           │                                                              │
│           ▼  (for each attempt)                                         │
│  ┌─────────────────┐                                                    │
│  │ Circuit Breaker │◄─── Tracks failures, manages state                 │
│  │   (opossum)     │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐                                                    │
│  │executeNatsRequest│◄─── Actual NATS call to auth service              │
│  └─────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Circuit Breaker States

```
        ┌──────────────────────────────────────────────┐
        │                                              │
        ▼                                              │
   ┌─────────┐     failure threshold     ┌──────┐     │
   │ CLOSED  │────────exceeded──────────►│ OPEN │     │
   │(normal) │                           │(reject)    │
   └────┬────┘                           └───┬───┘    │
        │                                    │        │
        │                          reset_timeout      │
   success                              expires       │
        │                                    │        │
        │              ┌───────────┐         │        │
        │              │ HALF-OPEN │◄────────┘        │
        │              │  (probe)  │                  │
        │              └─────┬─────┘                  │
        │                    │                        │
        │         ┌──────────┴──────────┐             │
        │         │                     │             │
        │      success               failure          │
        │         │                     │             │
        └─────────┘                     └─────────────┘
```

| State | Behavior | Transition |
|-------|----------|------------|
| **CLOSED** | Normal operation. Requests pass through. Failures counted. | Opens when failure threshold exceeded |
| **OPEN** | All requests rejected immediately with fallback response. | Transitions to half-open after `reset_timeout` |
| **HALF-OPEN** | Allows ONE probe request through. | Closes on success, reopens on failure |

---

## Configuration Parameters

### Circuit Breaker Settings

```yaml
circuit_breaker:
  enabled: true
  timeout: 3000
  failure_threshold: 15
  reset_timeout: 45000
  error_threshold_percentage: 50
  rolling_count_timeout: 60000
  rolling_count_buckets: 10
```

#### Parameter Details

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enabled` | `true` | Master switch. When `false`, requests bypass circuit breaker entirely. |
| `timeout` | `3000` | Request timeout in ms. Requests exceeding this are considered failures. |
| `failure_threshold` | `15` | Minimum requests (volume) before circuit can trip. Prevents opening on first failure. |
| `reset_timeout` | `45000` | Time in ms before transitioning from OPEN → HALF-OPEN. |
| `error_threshold_percentage` | `50` | Percentage of failures to trip circuit (after volume threshold met). |
| `rolling_count_timeout` | `60000` | Rolling window duration in ms for tracking success/failure rates. |
| `rolling_count_buckets` | `10` | Number of buckets in rolling window. Each bucket = `rolling_count_timeout / rolling_count_buckets` ms. |

### Retry Settings

```yaml
retry:
  max_attempts: 5
  base_delay: 500
  backoff_multiplier: 1.5
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_attempts` | `5` | Maximum retry attempts per request (including initial). |
| `base_delay` | `500` | Initial delay in ms before first retry. |
| `backoff_multiplier` | `1.5` | Exponential backoff factor. Delay = `base_delay × multiplier^(attempt-1)` |

---

## How Parameters Work Together

### Circuit Opening Conditions

The circuit opens when **BOTH** conditions are met within the rolling window:

```
Circuit Opens IF:
  1. total_fires >= failure_threshold (volumeThreshold)
  AND
  2. (failures / total_fires × 100) >= error_threshold_percentage
```

### Rolling Window Mechanism

```
rolling_count_timeout = 60000ms (60 seconds)
rolling_count_buckets = 10

Each bucket = 60000 / 10 = 6000ms (6 seconds)

Timeline:
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│  B1  │  B2  │  B3  │  B4  │  B5  │  B6  │  B7  │  B8  │  B9  │  B10 │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
│◄─────────────────── 60 second window ───────────────────────────────►│

As time progresses, oldest bucket (B1) drops off, new bucket added at end.
Only failures/successes within the window count toward thresholds.
```

### Retry with Exponential Backoff

```
base_delay = 500ms, backoff_multiplier = 1.5

Attempt 1: immediate
Attempt 2: wait 500ms      (500 × 1.5^0)
Attempt 3: wait 750ms      (500 × 1.5^1)
Attempt 4: wait 1125ms     (500 × 1.5^2)
Attempt 5: wait 1687ms     (500 × 1.5^3)
                           ─────────────
Total max wait:            ~4062ms before final failure
```

### Failure Counting with Retries

**Important**: Each retry attempt counts as a separate "fire" to the circuit breaker:

```
1 request with 5 retries = 5 fires counted

If all fail:
- failures = 5
- fires = 5
- failure_rate = 100%

With failure_threshold=15:
- Request 1 (5 retries) → 5 failures, circuit CLOSED
- Request 2 (5 retries) → 10 failures, circuit CLOSED
- Request 3 (5 retries) → 15 failures, circuit OPENS (100% > 50%)
```

---

## Sequence Diagrams

### Successful Request (Circuit Closed)

```
Client      evaluate()   CircuitBreaker   NATS Service
  │             │              │               │
  │──request───►│              │               │
  │             │──fire()─────►│               │
  │             │              │──send()──────►│
  │             │              │◄──response────│
  │             │◄──success────│               │
  │◄──allowed───│              │               │
```

### Failed Request with Retries

```
Client      evaluate()   evaluateWithRetry   CircuitBreaker   NATS
  │             │              │                   │            │
  │──request───►│              │                   │            │
  │             │──call───────►│                   │            │
  │             │              │──fire()──────────►│            │
  │             │              │                   │──send()───►│
  │             │              │                   │◄──error────│
  │             │              │◄──throw error─────│            │
  │             │              │                   │            │
  │             │              │   [wait 500ms]    │            │
  │             │              │                   │            │
  │             │              │──fire() [retry]──►│            │
  │             │              │                   │──send()───►│
  │             │              │                   │◄──error────│
  │             │              │◄──throw error─────│            │
  │             │              │                   │            │
  │             │              │   [wait 750ms]    │            │
  │             │              │        ...        │            │
  │             │              │                   │            │
  │             │◄─catch error─│  [max retries]    │            │
  │◄─denial─────│              │                   │            │
     response   │              │                   │            │
```

### Circuit Opens After Threshold

```
               Circuit State: CLOSED
                     │
  Request 1 ────────►│ 5 failures (5 fires)
                     │ failure_rate=100%, but fires < 15
                     │
  Request 2 ────────►│ 10 failures (10 fires)
                     │ failure_rate=100%, but fires < 15
                     │
  Request 3 ────────►│ 15 failures (15 fires)
                     │ failure_rate=100% >= 50%
                     │ fires=15 >= threshold=15
                     │
                     ▼
               Circuit OPENS
                     │
  Request 4 ────────►│ Immediately rejected
                     │ Returns CircuitOpenResponse
                     │
              [45 seconds pass]
                     │
                     ▼
            Circuit HALF-OPEN
                     │
  Request 5 ────────►│ Probe request allowed
                     │
         ┌───────────┴───────────┐
         │                       │
      Success                 Failure
         │                       │
         ▼                       ▼
   Circuit CLOSES          Circuit REOPENS
```

### Circuit Open Response Flow

```
Client      evaluate()   CircuitBreaker(OPEN)
  │             │              │
  │──request───►│              │
  │             │──fire()─────►│
  │             │              │──[reject event]
  │             │◄─fallback()──│
  │             │   response   │
  │◄─CircuitOpenResponse───────│
  │  {                         │
  │    allowed: false,         │
  │    reason: "...unavailable"│
  │    metadata: {             │
  │      circuitState: "open", │
  │      failureCount: 15      │
  │    },                      │
  │    retryAfter: 45000       │
  │  }                         │
```

---

## Response Types

### Success Response

```typescript
{
  allowed: true,
  // ... authorization details
}
```

### Denial Response (Circuit Open)

```typescript
{
  allowed: false,
  reason: "Authorization evaluation service is temporarily unavailable",
  metadata: {
    circuitState: "open",
    failureCount: 15
  },
  retryAfter: 45000  // ms until circuit may close
}
```

### Denial Response (Service Unavailable, Circuit Closed)

```typescript
{
  allowed: false,
  reason: "Authorization evaluation service is not running",
  metadata: {
    circuitState: "closed",
    failureCount: 5,
    errorType: "no-subscribers"
  },
  retryAfter: 45000
}
```

---

## Configuration Examples

### Example 1: High Availability (Strict)

Fast failure detection, quick recovery attempts:

```yaml
circuit_breaker:
  enabled: true
  timeout: 2000              # 2s timeout
  failure_threshold: 5       # Open after 5 failures
  reset_timeout: 10000       # Try recovery after 10s
  error_threshold_percentage: 30  # Open at 30% failure rate
  rolling_count_timeout: 30000    # 30s window
  rolling_count_buckets: 10
retry:
  max_attempts: 2            # Only 2 retries
  base_delay: 200            # Fast initial retry
  backoff_multiplier: 2
```

**Behavior**: Opens quickly (5 failures), recovers quickly (10s). Best for systems where the downstream service usually recovers fast.

### Example 2: Resilient (Lenient)

Tolerant of transient failures, slower to open:

```yaml
circuit_breaker:
  enabled: true
  timeout: 5000              # 5s timeout
  failure_threshold: 20      # Open after 20 failures
  reset_timeout: 60000       # Try recovery after 60s
  error_threshold_percentage: 60  # Open at 60% failure rate
  rolling_count_timeout: 120000   # 2 minute window
  rolling_count_buckets: 12
retry:
  max_attempts: 5            # 5 retries
  base_delay: 1000           # 1s initial delay
  backoff_multiplier: 1.5
```

**Behavior**: Tolerates more failures before opening. Good for services with occasional blips but generally stable.

### Example 3: Development/Testing

Quick feedback for debugging:

```yaml
circuit_breaker:
  enabled: true
  timeout: 1000              # 1s timeout
  failure_threshold: 3       # Open after just 3 failures
  reset_timeout: 5000        # Recover after 5s
  error_threshold_percentage: 50
  rolling_count_timeout: 10000    # 10s window
  rolling_count_buckets: 5
retry:
  max_attempts: 2
  base_delay: 100
  backoff_multiplier: 2
```

**Behavior**: Opens very quickly for fast iteration. Not suitable for production.

---

## Monitoring & Observability

### Log Contexts

All circuit breaker logs use `LogContext.AUTH_EVALUATION`. Key log messages:

| Level | Message | Meaning |
|-------|---------|---------|
| `log` | "Circuit breaker initialized" | Startup with config |
| `warn` | "Circuit breaker OPENED" | Circuit tripped |
| `warn` | "Circuit breaker HALF-OPEN" | Testing recovery |
| `warn` | "Circuit breaker CLOSED" | Service recovered |
| `warn` | "Circuit breaker REJECTING requests" | Requests being blocked |
| `verbose` | "Evaluating auth request" | Each request with stats |
| `verbose` | "Auth evaluation attempt failed" | Individual retry failure |
| `verbose` | "Retrying auth evaluation request" | Retry with delay |

### Key Metrics in Logs

```typescript
stats: {
  failures: number,   // Total failures in window
  successes: number,  // Total successes in window
  rejects: number,    // Requests rejected (circuit open)
  fires: number       // Total requests attempted
}
```

---

## Troubleshooting

### Circuit Not Opening

**Symptoms**: Many failures but circuit stays closed.

**Check**:
1. Are total fires >= `failure_threshold`?
2. Is failure percentage >= `error_threshold_percentage`?
3. Are failures within the rolling window (`rolling_count_timeout`)?

### Circuit Opening Too Fast

**Symptoms**: Circuit opens on minor blips.

**Solution**: Increase `failure_threshold` and/or `error_threshold_percentage`.

### Retries Not Working

**Symptoms**: Request fails immediately without retries.

**Check**:
1. Is the error retryable? (timeout, connection, network errors)
2. "No subscribers listening" errors are NOT retried by design
3. Is `max_attempts` > 1?

### Circuit Never Closes

**Symptoms**: Circuit stays open, never tries recovery.

**Check**:
1. Wait for `reset_timeout` to elapse
2. Make a request to trigger half-open probe
3. Ensure downstream service is actually healthy

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_EVAL_CIRCUIT_BREAKER_ENABLED` | `true` | Enable/disable circuit breaker |
| `AUTH_EVAL_TIMEOUT` | `3000` | Request timeout (ms) |
| `AUTH_EVAL_FAILURE_THRESHOLD` | `15` | Volume threshold |
| `AUTH_EVAL_RESET_TIMEOUT` | `45000` | Open → half-open time (ms) |
| `AUTH_EVAL_ERROR_THRESHOLD_PCT` | `50` | Failure percentage to trip |
| `AUTH_EVAL_ROLLING_COUNT_TIMEOUT` | `60000` | Rolling window (ms) |
| `AUTH_EVAL_ROLLING_COUNT_BUCKETS` | `10` | Buckets in window |
| `AUTH_EVAL_MAX_RETRIES` | `5` | Max retry attempts |
| `AUTH_EVAL_RETRY_BASE_DELAY` | `500` | Initial retry delay (ms) |
| `AUTH_EVAL_RETRY_BACKOFF` | `1.5` | Backoff multiplier |
