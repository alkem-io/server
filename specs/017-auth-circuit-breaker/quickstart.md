# Quickstart: Auth Remote Evaluation Circuit Breaker

**Feature**: 017-auth-circuit-breaker
**Date**: 2025-11-27

## Prerequisites

- Node.js 20.x (via Volta)
- pnpm 10.17.1+
- Running NATS server (for integration testing)
- Existing dev environment setup per `docs/Developing.md`

## Installation

```bash
# Add opossum circuit breaker library
pnpm add opossum

# Add TypeScript types
pnpm add -D @types/opossum
```

## Configuration

Add to `alkemio.yml`:

```yaml
microservices:
  # ... existing rabbitmq config
  auth_evaluation:
    circuit_breaker:
      enabled: ${AUTH_EVAL_CIRCUIT_BREAKER_ENABLED}:true
      timeout: ${AUTH_EVAL_TIMEOUT}:3000
      failure_threshold: ${AUTH_EVAL_FAILURE_THRESHOLD}:15
      reset_timeout: ${AUTH_EVAL_RESET_TIMEOUT}:45000
    retry:
      max_attempts: ${AUTH_EVAL_MAX_RETRIES}:5
      base_delay: ${AUTH_EVAL_RETRY_BASE_DELAY}:500
      backoff_multiplier: ${AUTH_EVAL_RETRY_BACKOFF}:2
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_EVAL_CIRCUIT_BREAKER_ENABLED` | `true` | Enable/disable circuit breaker |
| `AUTH_EVAL_TIMEOUT` | `3000` | Request timeout (ms) |
| `AUTH_EVAL_FAILURE_THRESHOLD` | `15` | Consecutive failures to open circuit |
| `AUTH_EVAL_RESET_TIMEOUT` | `45000` | Time before half-open state (ms) |
| `AUTH_EVAL_MAX_RETRIES` | `5` | Max retry attempts |
| `AUTH_EVAL_RETRY_BASE_DELAY` | `500` | Base delay for retries (ms) |
| `AUTH_EVAL_RETRY_BACKOFF` | `2` | Exponential backoff multiplier |

## Testing the Circuit Breaker

### 1. Manual Testing

Start the server without the auth evaluation microservice:

```bash
# Terminal 1: Start server
pnpm start:dev

# Terminal 2: Watch logs for circuit breaker activity
# Look for LogContext.AUTH_EVALUATION entries
```

Trigger an authorization request that uses remote evaluation. After 15 consecutive failures, the circuit will open and subsequent requests will fail fast.

### 2. Simulating Recovery

1. Start the auth evaluation microservice
2. Wait 45 seconds for circuit to transition to half-open
3. The next request will probe the service
4. If successful, circuit closes and normal operation resumes

### 3. Unit Tests

```bash
# Run all auth evaluation tests
pnpm test:ci -- --testPathPattern="auth.remote.evaluation"

# Run specific circuit breaker tests
pnpm test:ci -- --testPathPattern="circuit-breaker"
```

## Observability

### Log Messages to Watch

| Level | Pattern | Meaning |
|-------|---------|---------|
| `warn` | "Circuit breaker opened" | Service unavailable, failing fast |
| `verbose` | "Circuit breaker half-open" | Probing for recovery |
| `verbose` | "Circuit breaker closed" | Service recovered |
| `verbose` | "Retry attempt N/5" | Transient failure, retrying |
| `warn` | "Circuit breaker rejecting" | Requests being denied (rate-limited) |

### Sample Log Output

```
[Nest] 12345  - 2025-11-27 10:00:00  WARN [AUTH_EVALUATION] Circuit breaker opened after 15 consecutive failures
[Nest] 12345  - 2025-11-27 10:00:45  VERBOSE [AUTH_EVALUATION] Circuit breaker entering half-open state
[Nest] 12345  - 2025-11-27 10:00:46  VERBOSE [AUTH_EVALUATION] Circuit breaker closed - service recovered
```

## Troubleshooting

### Circuit stays open

**Symptom**: Circuit opens but never recovers

**Causes**:
1. Auth evaluation microservice is not running
2. NATS server is unreachable
3. Network partition between services

**Resolution**:
1. Check auth evaluation service status: `docker ps | grep auth`
2. Verify NATS connectivity: `nats pub test hello`
3. Check reset_timeout configuration

### Requests timing out

**Symptom**: Requests take 5+ seconds before failing

**Causes**:
1. NATS server accepting connections but subscriber unresponsive
2. Timeout configured too high

**Resolution**:
1. Reduce `AUTH_EVAL_TIMEOUT` if faster failure is acceptable
2. Check auth evaluation microservice logs for processing delays

### Retry storm

**Symptom**: Many retry logs during outage

**Causes**:
1. High request volume during outage
2. Circuit not opening fast enough

**Resolution**:
1. Reduce `failure_threshold` for faster circuit opening
2. Consider reducing `max_attempts` if circuit should open sooner

## Files Changed

| File | Change |
|------|--------|
| `src/services/external/auth-remote-evaluation/auth.remote.evaluation.service.ts` | Circuit breaker + retry logic |
| `src/services/external/auth-remote-evaluation/auth.remote.evaluation.types.ts` | New type definitions |
| `src/services/external/auth-remote-evaluation/auth.remote.evaluation.module.ts` | ConfigService injection |
| `src/services/external/auth-remote-evaluation/index.ts` | Export new types |
| `src/types/alkemio.config.ts` | Configuration type extension |
| `alkemio.yml` | Default configuration values |
| `package.json` | opossum dependency |

## Next Steps

After implementation:
1. Run `pnpm lint` to verify no TypeScript errors
2. Run `pnpm test:ci` to verify all tests pass
3. Test with services down to verify circuit opens
4. Test recovery by starting services
5. Submit PR with `[017]` reference
