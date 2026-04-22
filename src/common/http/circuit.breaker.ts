/**
 * Simple in-memory circuit breaker state machine.
 *
 * States:
 *   CLOSED    – requests pass through; failures counted.
 *   OPEN      – requests rejected until the reset window elapses.
 *   HALF-OPEN – one probe request allowed after the window; the next call
 *               to `check()` returns `{ open: false }` and resets the counter.
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

export class CircuitBreaker {
  private failureCount = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  /**
   * Returns whether the circuit is currently open. When the reset window has
   * elapsed, transitions to half-open (closed) so the next request probes the
   * upstream service.
   */
  check(): CircuitCheckResult {
    if (!this.circuitOpen) return { open: false };
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed < this.config.resetTimeMs) {
      return { open: true, resetInMs: this.config.resetTimeMs - elapsed };
    }
    // Half-open: allow one request through.
    this.circuitOpen = false;
    this.failureCount = 0;
    return { open: false };
  }

  onSuccess(): void {
    this.failureCount = 0;
    this.circuitOpen = false;
  }

  /**
   * Records a failure. Returns whether the circuit just opened as a result
   * (useful for log-once semantics) and the total failure count.
   */
  onFailure(): { opened: boolean; failureCount: number } {
    this.failureCount += 1;
    const justOpened =
      !this.circuitOpen && this.failureCount >= this.config.failureThreshold;
    if (justOpened) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
    }
    return { opened: justOpened, failureCount: this.failureCount };
  }
}
