import { LoggerService } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConnectionReporter } from './redis.connection.reporter';

/**
 * The single place in the codebase that constructs an `ioredis` client.
 *
 * Background — alkem-io/server#6332. Both session clients (`OIDC_REDIS_CLIENT`
 * and the express-session store's) were `new Redis({ host, port })`. ioredis
 * defaults then apply: `enableOfflineQueue: true`, so a command issued while
 * disconnected is QUEUED rather than rejected, and `maxRetriesPerRequest: 20`,
 * so it waits for the 21st reconnection boundary before failing — a period that
 * grows to ~42 seconds once the backoff saturates. During a Redis outage every
 * request therefore hung for tens of seconds and then failed.
 *
 * The knowledge to prevent that already existed in this repository twice over:
 * the health probe (`src/core/health/health.module.ts`) set exactly these
 * options with a comment explaining why, and #6331 introduced
 * `src/core/cache/cache.store.factory.ts` as the single construction point for
 * the cache client. Neither reached the two clients every request depends on.
 * #6330 was one UNSAFE bootstrap copy-pasted into two modules; #6332 was one
 * SAFE bootstrap that was never propagated. Same root cause — per-site client
 * construction with no shared seam — pointing in opposite directions.
 *
 * So this is not tidiness. It is the requirement (spec FR-007, SC-009) that a
 * future third `ioredis` client cannot silently reintroduce the hang.
 *
 * Deliberately NOT merged with `cache.store.factory.ts`: different library,
 * different event vocabulary, different failure modes. A common abstraction
 * over both would be an abstraction over a coincidence. See
 * `specs/109-redis-session-store-resilience/research.md` R12.
 */

/**
 * Reject a command issued while the connection is known to be down, instead of
 * parking it. THE load-bearing option: it is the queue, not the retry count,
 * that produced the 42-second hang. With this off, a disconnected client fails
 * in 0 ms for the whole outage. Spec FR-008.
 */
const ENABLE_OFFLINE_QUEUE = false;

/**
 * Per-command ceiling.
 *
 * The other three options all key off connection *state*, so none of them
 * covers a store that completes the TCP handshake and then goes silent — the
 * client believes it is connected and nothing times the command out. Without
 * this, fail-fast would cover only the refused-connection case and the hang
 * would return in a subtler form. Spec FR-009, research R3.
 *
 * 500 rather than 1000 ms because a single cookie-bearing request can issue two
 * sequential store reads (the session middleware, then the strategy) and
 * SC-002's budget is 1 s for the whole request — two 1 s ceilings would spend
 * the entire budget on the failure path alone. Research R5.
 */
const COMMAND_TIMEOUT_MS = 500;

/** Adopted verbatim from the health probe, which had it right all along. */
const CONNECT_TIMEOUT_MS = 500;

/**
 * Bound a command already in flight when the connection drops. With offline
 * queueing disabled nothing else can be waiting, so this is a small number
 * rather than ioredis's default 20. Spec FR-010.
 */
const MAX_RETRIES_PER_REQUEST = 1;

export type RedisClientPurpose = 'session' | 'oidc' | 'health';

export type RedisClientConfig = {
  host: string;
  port: number | string;
  // NOTE: `storage.redis.timeout` is deliberately NOT consumed — see below.
};

export interface RedisClientOptions {
  /** Which client this is. Used as the reporter label; appears in log records. */
  purpose: RedisClientPurpose;
  /**
   * Defer connecting until the first command. ONLY for the health probe.
   *
   * Combined with `enableOfflineQueue: false` this makes the FIRST command fail
   * unconditionally, because the client is still in `wait`/`connecting` when it
   * is issued. That is acceptable for a probe that re-runs on a schedule and
   * fatal on the request path, which is exactly why it is opt-in rather than a
   * shipped profile. Spec FR-014, research R2.
   */
  lazyConnect?: boolean;
}

/**
 * Build an `ioredis` client with the fail-fast options applied.
 *
 * On the absent timeout parameter: `storage.redis` also carries a `timeout`
 * field, and this factory does not accept it — for the same reason the cache
 * factory does not. A configurable timeout is a configurable way to reintroduce
 * the 42-second hang, and no deployment has a legitimate reason to want one.
 * Spec FR-015, Clarification Q8.
 *
 * Never throws and never blocks on a live connection: ioredis's constructor
 * starts connecting asynchronously and this function adds no `await`. A throw
 * here would propagate into Nest's module bootstrap (for `OIDC_REDIS_CLIENT`
 * and the probe) or the Express bootstrap (for the session client) and abort
 * process startup, so a Redis that is down at boot must not be able to prevent
 * the server from starting. Spec FR-013.
 */
export const createRedisClient = (
  config: RedisClientConfig,
  logger: LoggerService,
  options: RedisClientOptions
): Redis => {
  const reporter = new RedisConnectionReporter(logger, options.purpose);

  const client = new Redis({
    host: config.host,
    port: Number(config.port),

    enableOfflineQueue: ENABLE_OFFLINE_QUEUE,
    commandTimeout: COMMAND_TIMEOUT_MS,
    connectTimeout: CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
    lazyConnect: options.lazyConnect ?? false,

    // `retryStrategy` is deliberately NOT set: ioredis's default
    // (`times => Math.min(times * 50, 2000)`) is already correct here, and
    // always returns a number. Returning a NON-number is how ioredis is told to
    // stop trying — it then transitions to `end` and abandons the store
    // permanently, which would mean an outage that outlives the budget requires
    // a process restart to recover from. Restating the default in our own code
    // would create a place for a future edit to introduce exactly that.
    // Spec FR-012, data-model invariant I3.

    // `keyPrefix` is deliberately NOT set: the `alkemio:sid:` prefix is applied
    // by `connect-redis` and by `buildSessionStore`, so a client-level prefix
    // would double it and every key would miss.
  });

  // Registered before returning, with nothing awaited in between, so there is
  // no turn of the event loop in which an emit could go unobserved. Spec FR-027.
  client.on('error', error => reporter.reportError(error));

  // Not optional: without it there is no recovery record AND the reporter never
  // re-arms, so a second outage in the same process would go unreported for the
  // rest of its life. Spec FR-024.
  client.on('ready', () => reporter.reportReady());

  // Returned unwrapped — no proxy, no method interception. `session-index.redis.ts`
  // issues Lua `EVAL` for the atomic index top-up, and `connect-redis` sniffs the
  // client's shape (`"scanIterator" in client`) to decide whether it is talking to
  // `redis` or `ioredis`; a wrapper risks both. Translating a client rejection
  // into `SessionStoreUnavailableError` happens one level up, in the store
  // wrapper that knows a store call just failed.
  return client;
};
