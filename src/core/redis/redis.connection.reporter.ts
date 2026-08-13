import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';

/**
 * Turns a stream of repeated `ioredis` connection failures into a pair of
 * events: exactly one record when a connection is lost, exactly one when it
 * returns.
 *
 * Background — alkem-io/server#6332. The two session `ioredis` clients had no
 * `error` listener at all. Unlike `redis@3.1.2` (whose unlistened `'error'`
 * killed the process — that was #6330), `ioredis` does not crash: it routes the
 * emit through `silentEmit` and writes `console.error("[ioredis] Unhandled
 * error event:", …)`. So the omission was not a crash, it was every
 * session-client failure bypassing Winston entirely and landing on stdout
 * unstructured and uncorrelated — a silent failure path under constitution §5.
 *
 * Retrying clients re-enter the error path on every failed reconnection
 * attempt: with ioredis's default backoff saturating at one attempt every 2
 * seconds, that is ~1800 per client per hour of outage, times every replica.
 * Logging each one does not make the outage more visible, it buries everything
 * else. So we log *transitions*. Spec FR-023..FR-027.
 *
 * ONE INSTANCE PER CLIENT. Sharing an instance across connections would make
 * the second connection's outage invisible whenever the first had already
 * reported, and would announce recovery when only one of the two had actually
 * recovered. Hence the `label`. Spec Clarification Q9, data-model invariant I5.
 *
 * The sibling of `CacheConnectionReporter`, deliberately not merged with it:
 * that class's central argument is that `redis@3.1.2` re-emits socket failures
 * as `reconnecting` rather than `error` when a `retry_strategy` is configured.
 * That is a `redis@3.1.2` quirk with no `ioredis` equivalent — ioredis emits
 * `error` for connection failures unconditionally — so generalising it would
 * mean carrying a workaround for a library this client does not use. See
 * `specs/109-redis-session-store-resilience/research.md` R12.
 */
export class RedisConnectionReporter {
  /**
   * Whether the *current* outage has already been reported.
   *
   * Starts `false`, which is what makes a process that boots into an
   * already-dead Redis still report it once: it has no prior healthy state to
   * fall from, but the first failed connection attempt is still news.
   *
   * This is a LOG-SUPPRESSION signal and nothing else. It is deliberately not
   * exposed: a one-off non-connection `error` (a reply error, a parser fault)
   * would latch it for the life of the process, because it is only cleared by a
   * `ready` event and a client that never disconnected never emits one again.
   * `CacheConnectionReporter` has to publish `isDown` and therefore has to warn
   * about that hazard; here nothing reads it, so the hazard is contained by
   * construction. Data-model invariant I6.
   */
  private reportedDown = false;

  constructor(
    private readonly logger: LoggerService,
    /** Which client this reports on — appears in every record. */
    private readonly label: string
  ) {}

  /** Call on every client `error` event. Silent after the first of an outage. */
  public reportError(error: unknown): void {
    if (this.reportedDown) {
      return;
    }
    this.reportedDown = true;

    // Message and code only. Never the error object, never the connection
    // options, never the failing command's arguments: constitution §8 forbids
    // logging credentials and an ioredis error can carry command arguments.
    this.logger.warn?.(
      `Redis connection lost (${this.label}); commands will fail fast until it returns. ${describe(error)}`,
      LogContext.AUTH
    );
  }

  /**
   * Call on every client `ready` event.
   *
   * Silent unless recovering an outage — every boot of every replica emits
   * `ready` once and it is not worth a line. Re-arms so a SECOND outage in the
   * same process is reported again (FR-024).
   */
  public reportReady(): void {
    if (!this.reportedDown) {
      return;
    }
    this.reportedDown = false;

    this.logger.warn?.(
      `Redis connection re-established (${this.label}).`,
      LogContext.AUTH
    );
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
