import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';

/**
 * Turns a stream of repeated cache-connection failures into a pair of events.
 *
 * A retrying `redis@3.1.2` client re-enters its `error` handler on every failed
 * reconnection attempt — with the backoff configured in `cache.store.factory.ts`
 * that is roughly one every 5 seconds, so ~720 per client per hour of outage,
 * multiplied by two processes and by every replica. Logging each one does not
 * make the outage more visible; it buries every other line in the system and
 * turns a degradation into a second incident.
 *
 * So we log *transitions*, not occurrences: exactly one record when the
 * connection is lost, exactly one when it comes back. See spec FR-015..FR-019.
 *
 * The whole thing is one boolean. That is deliberate — the client already owns
 * the authoritative connection state, and a second, richer copy of it would only
 * be something else to get out of sync.
 */
export class CacheConnectionReporter {
  /**
   * Whether the *current* outage has already been reported.
   *
   * Starts `false`, which is what makes a process that boots into an
   * already-dead Redis still report it once — it has no prior healthy state to
   * fall from, but the first failed connection attempt is still news.
   */
  private reportedDown = false;

  constructor(private readonly logger: LoggerService) {}

  /**
   * Call on every client `error` event.
   *
   * Registering *some* handler is what stops the process dying — an
   * `EventEmitter` that emits `'error'` with no listener throws it as an
   * uncaught exception, which is the entirety of alkem-io/server#6330. This
   * class is what makes that handler useful rather than merely present.
   */
  public reportError(error: unknown): void {
    if (this.reportedDown) {
      return;
    }
    this.reportedDown = true;

    // Only the message and code. Never the error object and never the
    // connection options: constitution §8 forbids logging credentials, and a
    // node_redis error can carry the failing command's arguments.
    this.logger.warn?.(
      `Cache connection lost; cache reads will miss through to the source of truth until it returns. ${describe(error)}`,
      LogContext.CACHE
    );
  }

  /** Call on every client `ready` event. Silent unless recovering an outage. */
  public reportReady(): void {
    if (!this.reportedDown) {
      // The ordinary startup connect. Every boot of every replica does this and
      // it is not worth a line.
      return;
    }
    this.reportedDown = false;

    this.logger.warn?.(
      'Cache connection re-established; caching has resumed.',
      LogContext.CACHE
    );
  }

  /**
   * True while the connection is known to be down.
   *
   * This is a *log-suppression* signal, and nothing else. Do not gate cache
   * operations on it: the client already refuses commands while disconnected
   * (`enable_offline_queue: false`), so gating here would add a second copy of
   * that state whose only possible contribution is to be stale — suppressing
   * operations against a Redis that had already recovered.
   *
   * Its one consumer is `TaskService`, which bypasses the store to reach the
   * client directly for server-side atomic counters and would otherwise log
   * once per failed counter operation (FR-010a).
   */
  public get isDown(): boolean {
    return this.reportedDown;
  }
}

/** Message and code only — see the note in `reportError`. */
const describe = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Reason: unknown.';
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code
    ? `Reason: ${error.message} (code: ${code}).`
    : `Reason: ${error.message}.`;
};
