import {
  RedisClientLike,
  RedisStore,
} from '@common/interfaces/redis.interfaces';
import { LoggerService } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { CacheConnectionReporter } from './cache.connection.reporter';

/**
 * The single place in the codebase that constructs a Redis-backed cache.
 *
 * Background — alkem-io/server#6330. `cache-manager-redis-store@2` creates a
 * `redis@3.1.2` client and never attaches an `error` listener. Node turns an
 * unlistened `'error'` emit into an uncaught exception, so any Redis blip
 * *terminated the process*. It was duplicated verbatim across `app.module.ts`
 * and `auth-reset.worker.module.ts`, so both the API and the auth-reset worker
 * died together.
 *
 * Both bootstraps now call this function instead. Keeping the construction in
 * one place is not tidiness: it is the requirement (spec FR-020) that a future
 * third cache cannot silently reintroduce the crash.
 *
 * Why the legacy store is kept rather than swapped for the `ioredis` this repo
 * already depends on: `src/` compiles against `@types/cache-manager@4` while the
 * runtime is `cache-manager@5`. Under v4 types `set`'s third argument is a
 * `{ ttl: seconds }` object; under v5 it is a bare millisecond number. All seven
 * write call sites use the v4 object form and work only because this store still
 * has the old four-argument signature. Any v5-native store would silently
 * reinterpret every TTL by 1000x, with no compile error and no test signal.
 * Full reasoning in `specs/108-redis-outage-resilience/research.md` R4/R5.
 */

/**
 * Per-operation ceiling.
 *
 * `enable_offline_queue: false` already makes a *known*-disconnected client
 * reject instantly, so this is not for the common case. It is for the nastier
 * one: a server that completes the TCP handshake and then goes silent, where
 * the client believes it is connected and nothing would otherwise time the
 * command out. Spec FR-009a.
 */
export const CACHE_OPERATION_TIMEOUT_MS = 1_000;

/** First reconnection attempt lands this long after the loss. */
const RETRY_BASE_DELAY_MS = 250;

/**
 * Upper bound on the reconnection interval. Chosen an order of magnitude inside
 * SC-003's 60-second recovery target so that target holds by construction
 * rather than by luck. Spec FR-012.
 */
const RETRY_MAX_DELAY_MS = 5_000;

/**
 * The retry budget, NOT a connect timeout — see the note in `clientOptions`.
 * ~24.8 days; the largest value Node's timers accept without overflowing.
 */
const RETRY_BUDGET_MS = 2_147_483_647;

export type RedisCacheConfig = {
  host: string;
  port: number;
  // NOTE: `storage.redis.timeout` is deliberately NOT consumed. See clientOptions().
};

/**
 * Growing backoff, capped, that never gives up.
 *
 * `redis@3.1.2` requires a **number** back. Returning anything else — including
 * an Error, which is the documented way to abort — makes it flush the command
 * queue with CONNECTION_BROKEN, call `end(false)` and emit a terminal `'error'`.
 * That is a permanent give-up, i.e. precisely the failure mode #6330 is about.
 * So: always a number, forever. Spec FR-012, FR-013.
 */
export const cacheRetryStrategy = (options: { attempt: number }): number =>
  Math.min(options.attempt * RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS);

const clientOptions = (config: RedisCacheConfig) => ({
  host: config.host,
  port: config.port,

  // `connect_timeout` is a trap. In redis@3.1.2 it is not only a connect
  // timeout: it is also the *total retry budget* (index.js:580 — once
  // `retry_totaltime >= connect_timeout` the client calls end(false) and emits a
  // terminal error). The config carries `timeout: 60` seconds, and wiring it up
  // here — which looks like an obvious bugfix, because the value is currently
  // passed under an ioredis key name that redis@3.1.2 ignores outright — would
  // make the client abandon Redis permanently after one minute of outage.
  // Hence: effectively unbounded. The per-operation ceiling that operators
  // actually care about lives in `failSoft` below, where it is testable.
  connect_timeout: RETRY_BUDGET_MS,

  // Do not park commands issued while disconnected. Queued commands are aborted
  // en masse on `connection_gone` (the AbortError/UNCERTAIN_STATE half of the
  // reported stack); refusing them outright instead makes a disconnected cache
  // return a miss in zero milliseconds, with no timer of our own. Spec FR-009.
  enable_offline_queue: false,

  retry_strategy: cacheRetryStrategy,
});

/**
 * Build the store factory that `CacheModule.registerAsync` should place on
 * `store`. `cache-manager@5` invokes it as `await factory(args)`.
 */
export const createRedisCacheStore =
  (config: RedisCacheConfig, logger: LoggerService) => (): RedisStore => {
    const reporter = new CacheConnectionReporter(logger);

    const store = (redisStore as unknown as RedisStoreConstructor).create(
      clientOptions(config)
    );

    // THE line. Everything else here is quality-of-degradation; this is what
    // stops the process dying. Registered before returning, with nothing
    // awaited in between, so there is no turn of the event loop in which an
    // emit could go unobserved. Spec FR-003.
    const client = store.getClient() as unknown as ObservableRedisClient;
    client.on('error', error => reporter.reportError(error));
    client.on('ready', () => reporter.reportReady());

    return failSoft(store, reporter);
  };

/**
 * Make cache failures look like cache misses.
 *
 * Attaching the error listener above stops the crash, but `cache-manager@5`
 * passes `get`/`set`/`del` straight through to the store unguarded — only
 * `wrap()` catches, and nothing in this codebase uses `wrap()`. Without this
 * wrapper the fix would merely convert "the process dies" into "every
 * cache-touching request 500s", which is a different outage, not a degradation.
 *
 * Errors are caught broadly and deliberately, not matched against a code
 * allow-list: the vocabulary already spans AbortError/NR_CLOSED,
 * AbortError/UNCERTAIN_STATE, CONNECTION_BROKEN, raw socket errors and JSON
 * parse failures on truncated replies. Guessing that list wrong costs a 500 on a
 * request the database could have answered. Spec FR-005..FR-008.
 */
const failSoft = (
  store: RedisStore,
  reporter: CacheConnectionReporter
): RedisStore => ({
  // Spread first so `name`, `getClient`, `isCacheableValue` and anything else
  // the store exposes survive untouched. TaskService reaches through
  // `getClient()` for server-side atomic counters and guards on its presence;
  // losing it would reintroduce the lost-update hang of #6310.
  ...store,

  // Published on the store for the same reason `getClient` is: TaskService
  // bypasses the cache interface to issue server-side atomic commands, and needs
  // to know when the connection is down so it can stop logging once per failed
  // counter operation. Read-only — a suppression signal, never a gate on whether
  // to attempt an operation (see the getter's own note). Spec FR-010a.
  connectionSignal: reporter,

  // A failed read is indistinguishable from a cold cache, which every consumer
  // already handles — that is the whole reason this is safe.
  get: <T>(...args: unknown[]): Promise<T | undefined> =>
    guard(() => store.get<T>(...args)),

  // The third argument is forwarded UNMODIFIED. It is a `{ ttl: seconds }`
  // object under the v4 types this repo compiles against, and reinterpreting it
  // is exactly the silent 1000x TTL bug that ruled out swapping the store.
  set: (...args: unknown[]): Promise<void> =>
    guard(() => store.set(...args)) as Promise<void>,

  del: (...args: unknown[]): Promise<void> =>
    guard(() => store.del?.(...args)) as Promise<void>,

  reset: (...args: unknown[]): Promise<void> =>
    guard(() => store.reset?.(...args)) as Promise<void>,
});

/**
 * Run a store operation; on any failure or overrun, yield `fallback`.
 *
 * Nothing is logged here. Per-operation logging during an outage is the flood
 * this feature exists to avoid — the reporter has already emitted exactly one
 * record for the connection loss, which is the signal that matters. Spec FR-017.
 */
const guard = async <T>(
  operation: () => Promise<T> | undefined
): Promise<T | undefined> => {
  let timer: NodeJS.Timeout | undefined;

  try {
    const timeout = new Promise<typeof TIMED_OUT>(resolve => {
      timer = setTimeout(() => resolve(TIMED_OUT), CACHE_OPERATION_TIMEOUT_MS);
      // Do not hold the event loop open for a cache read. Without this a
      // pending timer can delay process exit by up to the ceiling.
      timer.unref?.();
    });

    const result = await Promise.race([Promise.resolve(operation()), timeout]);

    return result === TIMED_OUT ? undefined : (result as T | undefined);
  } catch {
    return undefined;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const TIMED_OUT = Symbol('cache-operation-timed-out');

type ObservableRedisClient = RedisClientLike & {
  on(event: 'error', listener: (error: unknown) => void): void;
  on(event: 'ready', listener: () => void): void;
};

type RedisStoreConstructor = {
  create: (options: ReturnType<typeof clientOptions>) => RedisStore;
};
