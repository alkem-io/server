/**
 * Simple in-memory circuit breaker state machine.
 *
 * States:
 *   CLOSED    – requests pass through; failures counted.
 *   OPEN      – requests rejected until the reset window elapses.
 *   HALF_OPEN – one probe request is allowed through after the reset window.
 *               A success transitions to CLOSED; a failure reopens immediately
 *               (without needing to re-accumulate `failureThreshold` failures).
 *
 * Instance-local: each consumer owns its own state. This is suitable for
 * single-pod deployments. For multi-pod scaling, externalize state to a
 * shared store (e.g. Redis) — this class can be subclassed for that.
 */

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before the circuit opens. */
  failureThreshold: number;
  /** Time in milliseconds after which the circuit transitions to half-open. */
  resetTimeMs: number;
}

export type CircuitCheckResult =
  | { open: false }
  | { open: true; resetInMs: number };

type State = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private state: State = 'closed';
  private failureCount = 0;
  private circuitOpenedAt = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Returns whether the circuit is currently open. After the reset window
   * elapses, transitions OPEN → HALF_OPEN and allows exactly one probe
   * through. Concurrent calls while already HALF_OPEN are rejected so only
   * a single probe is in flight at a time.
   */
  check(): CircuitCheckResult {
    if (this.state === 'closed') {
      return { open: false };
    }
    if (this.state === 'half_open') {
      // A probe is already in flight; reject additional callers until it
      // resolves (onSuccess → CLOSED or onFailure → OPEN).
      return { open: true, resetInMs: 0 };
    }
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed < this.config.resetTimeMs) {
      return { open: true, resetInMs: this.config.resetTimeMs - elapsed };
    }
    // Reset window elapsed: allow exactly one probe by entering HALF_OPEN.
    this.state = 'half_open';
    return { open: false };
  }

  onSuccess(): void {
    this.state = 'closed';
    this.failureCount = 0;
  }

  /**
   * Records a failure. Returns whether the circuit just opened as a result
   * (useful for log-once semantics) and the total failure count.
   *
   * If called while HALF_OPEN, the probe failed and the circuit reopens
   * immediately without waiting to re-accumulate `failureThreshold` failures.
   */
  onFailure(): { opened: boolean; failureCount: number } {
    if (this.state === 'half_open') {
      this.state = 'open';
      this.circuitOpenedAt = Date.now();
      this.failureCount = this.config.failureThreshold;
      return { opened: true, failureCount: this.failureCount };
    }

    this.failureCount += 1;
    const justOpened =
      this.state === 'closed' &&
      this.failureCount >= this.config.failureThreshold;
    if (justOpened) {
      this.state = 'open';
      this.circuitOpenedAt = Date.now();
    }
    return { opened: justOpened, failureCount: this.failureCount };
  }
}
