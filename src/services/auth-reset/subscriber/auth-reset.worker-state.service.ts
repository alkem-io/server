import { Injectable } from '@nestjs/common';

/**
 * Tracks how many auth/license reset jobs are actively being processed by this
 * worker pod, so the SIGTERM handler in `main.worker.ts` can wait for the
 * in-flight reset to finish before closing the app.
 *
 * With `prefetchCount: 1` (see main.worker.ts) the count is only ever 0 or 1,
 * but a counter keeps the contract correct if prefetch is ever raised.
 */
@Injectable()
export class AuthResetWorkerState {
  private inFlight = 0;

  /** Call at the start of a reset handler (before any await). */
  public begin(): void {
    this.inFlight++;
  }

  /** Call once the reset has been acked/rejected, always in a `finally`. */
  public end(): void {
    if (this.inFlight > 0) {
      this.inFlight--;
    }
  }

  public get activeCount(): number {
    return this.inFlight;
  }

  /**
   * Resolves when no reset is in flight, or when `timeoutMs` elapses —
   * whichever comes first. Returns `true` if it drained cleanly, `false` on
   * timeout (caller then lets the broker requeue the unacked message on close).
   */
  public async waitForIdle(timeoutMs: number, pollMs = 100): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (this.inFlight > 0) {
      if (Date.now() >= deadline) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    return true;
  }
}
