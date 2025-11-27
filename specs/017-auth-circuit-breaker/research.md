# Research: Auth Remote Evaluation Circuit Breaker

**Feature**: 017-auth-circuit-breaker
**Date**: 2025-11-27
**Status**: Complete

## Research Tasks

### 1. Circuit Breaker Library Selection

**Question**: Which circuit breaker library should we use for Node.js/NestJS?

**Decision**: **opossum** (nodeshift/opossum)

**Rationale**:
- Red Hat/Nodeshift maintained with active development
- 70k+ weekly npm downloads, proven production usage
- Native TypeScript support via `@types/opossum`
- Event-based API for state change notifications
- Configurable options: timeout, errorThresholdPercentage, resetTimeout, volumeThreshold
- Works with Promise-based async functions (compatible with RxJS `firstValueFrom`)

**Alternatives Considered**:
| Library | Reason Rejected |
|---------|-----------------|
| cockatiel | More complex API, less mature ecosystem |
| brakes | Unmaintained (last commit 2018) |
| circuit-breaker-js | Fewer features, smaller community |
| Custom implementation | FR-009 explicitly requires proven library |

**Source**: https://github.com/nodeshift/opossum - Context7 library docs

---

### 2. Opossum Configuration Options

**Question**: What configuration options does opossum provide and what defaults should we use?

**Decision**: Use the following configuration aligned with spec requirements:

| Option | Default | Our Value | Rationale |
|--------|---------|-----------|-----------|
| `timeout` | 10000ms | **3000ms** | FR-003: 3 second timeout for individual requests |
| `errorThresholdPercentage` | 50 | **N/A** | We use volumeThreshold instead |
| `volumeThreshold` | 5 | **15** | FR-002: Open after 15 consecutive failures |
| `resetTimeout` | 30000ms | **45000ms** | FR-005: 45 second reset timeout (exceeds max retry window of ~30s) |

**Rationale**:
- Spec requires **consecutive failures** (FR-002), not percentage-based threshold
- Opossum's `volumeThreshold` sets minimum fires before opening; we'll combine with percentage=0 to achieve "15 consecutive failures" behavior
- Alternative: Track consecutive failures manually and call `breaker.open()` explicitly

**Key Insight**: Opossum uses `errorThresholdPercentage` + `volumeThreshold` together. To achieve "15 consecutive failures":
- Set `volumeThreshold: 15` (minimum 15 calls before circuit can open)
- Set `errorThresholdPercentage: 100` (100% failure rate required)
- This ensures circuit opens only after 15/15 failures

---

### 3. Retry Strategy Integration

**Question**: How should retry logic integrate with the circuit breaker?

**Decision**: Implement retry logic **inside** the circuit breaker scope using a wrapper function.

**Implementation Approach**:
```typescript
// Each call to breaker.fire() executes this function
async function evaluateWithRetry(request: AuthEvaluationRequest): Promise<AuthEvaluationResponse> {
  let lastError: Error;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeNatsRequest(request);
    } catch (error) {
      if (isNoSubscribersError(error)) {
        throw error; // Don't retry - service not running (FR-016)
      }
      lastError = error;
      if (attempt < maxRetries) {
        await delay(calculateBackoff(attempt)); // Exponential backoff
        logger.verbose?.(`Retry attempt ${attempt}/${maxRetries}...`);
      }
    }
  }
  throw lastError;
}

const breaker = new CircuitBreaker(evaluateWithRetry, options);
```

**Rationale**:
- FR-013: Retries count toward circuit failure threshold
- FR-015: When circuit opens, no more retries attempted
- FR-016: "No subscribers" fails immediately (indicates service not running)

**Backoff Calculation**:
- Base delay: 500ms (FR-018)
- Multiplier: 2 (exponential)
- Max delay cap: 8000ms (prevent excessive wait)
- Formula: `min(baseDelay * (multiplier ^ (attempt - 1)), maxDelay)`

| Attempt | Delay |
|---------|-------|
| 1 | 500ms |
| 2 | 1000ms |
| 3 | 2000ms |
| 4 | 4000ms |
| 5 | 8000ms |

**Total max retry window**: ~15.5 seconds (well under spec's ~30s guidance)

---

### 4. Circuit Open Response Structure

**Question**: What should the circuit-open denial response contain?

**Decision**: Per FR-020, return structured `CircuitOpenResponse`:

```typescript
interface CircuitOpenResponse {
  allowed: false;
  reason: string;          // Human-readable description
  metadata: {
    circuitState: 'open';
    failureCount: number;
  };
  retryAfter: number;      // Milliseconds until recovery attempt
}
```

**Implementation**:
- Use opossum's `fallback` function to return this response
- Calculate `retryAfter` from circuit's internal state (time since opened + resetTimeout)
- Rate-limit the warn log to once per circuit-open period

---

### 5. NestJS Integration Pattern

**Question**: How should opossum integrate with NestJS dependency injection?

**Decision**: Initialize circuit breaker in service constructor with ConfigService injection.

**Pattern**:
```typescript
@Injectable()
export class AuthRemoteEvaluationService implements OnModuleInit, OnModuleDestroy {
  private circuitBreaker: CircuitBreaker;

  constructor(
    @Inject(AUTH_REMOTE_EVALUATION_CLIENT) private client: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    const config = this.configService.get('microservices.auth_evaluation', { infer: true });
    this.circuitBreaker = this.createCircuitBreaker(config);
    this.attachEventHandlers();
  }
}
```

**Rationale**:
- Follows existing patterns in codebase (see `geoapify.service.ts`, `wingback.webhook.interceptor.ts`)
- Configuration via `ConfigService<AlkemioConfig>` for type safety
- Circuit breaker created once at startup, reused for all requests

---

### 6. Error Classification

**Question**: Which errors should trigger retries vs. immediate failure?

**Decision**:

| Error Type | Retry? | Rationale |
|------------|--------|-----------|
| Timeout | ✅ Yes | Transient network issue |
| Connection error | ✅ Yes | NATS may be temporarily unavailable |
| "no subscribers listening" | ❌ No | Service not running - retrying won't help |
| Other errors | ❌ No | Unknown errors fail fast for safety |

**Detection Logic**:
```typescript
function isRetryableError(error: Error): boolean {
  const message = error.message?.toLowerCase() ?? '';
  if (message.includes('no subscribers listening')) return false;
  if (message.includes('timeout') || message.includes('timed out')) return true;
  if (message.includes('connection') || message.includes('network')) return true;
  return false; // Default to non-retryable for unknown errors
}
```

---

### 7. Opossum Event Handling for Logging

**Question**: How should we handle opossum events for observability?

**Decision**: Attach event listeners for state transitions and failures.

**Events to Handle**:
| Event | Log Level | Content |
|-------|-----------|---------|
| `open` | warn | Circuit opened - include failure count |
| `halfOpen` | verbose | Circuit entering probe state |
| `close` | verbose | Circuit recovered |
| `reject` | *rate-limited* | Request rejected by open circuit |
| `timeout` | verbose | Individual request timeout |
| `success` | *none* | Don't log successes (too verbose) |

**Rate-Limiting for Rejects**:
```typescript
private lastRejectLogTime = 0;
private readonly REJECT_LOG_INTERVAL = 30000; // Log once per 30s

private onReject() {
  const now = Date.now();
  if (now - this.lastRejectLogTime > this.REJECT_LOG_INTERVAL) {
    this.logger.warn('Circuit breaker rejecting requests...', LogContext.AUTH_EVALUATION);
    this.lastRejectLogTime = now;
  }
}
```

---

### 8. Configuration Schema Extension

**Question**: How should circuit breaker config be added to AlkemioConfig?

**Decision**: Add under `microservices.auth_evaluation` namespace:

```yaml
# alkemio.yml
microservices:
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

**TypeScript Type**:
```typescript
// alkemio.config.ts addition
microservices: {
  // ... existing rabbitmq config
  auth_evaluation: {
    circuit_breaker: {
      enabled: boolean;
      timeout: number;
      failure_threshold: number;
      reset_timeout: number;
    };
    retry: {
      max_attempts: number;
      base_delay: number;
      backoff_multiplier: number;
    };
  };
};
```

---

## Summary of Decisions

1. **Library**: opossum (npm: `opossum`, types: `@types/opossum`)
2. **Circuit Breaker Config**: 3s timeout, 15 consecutive failures, 45s reset (exceeds max retry window)
3. **Retry Strategy**: Inside breaker, 5 attempts, exponential backoff (500ms base)
4. **Error Classification**: Retry timeouts/connections, fail-fast on "no subscribers"
5. **Response Structure**: `CircuitOpenResponse` with allowed, reason, metadata, retryAfter
6. **Integration**: Constructor injection via ConfigService
7. **Logging**: Winston at verbose/warn levels, rate-limited reject logs
8. **Configuration**: Under `microservices.auth_evaluation` namespace

## Open Items

None - all clarifications resolved in spec.
