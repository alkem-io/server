import {
  CacheConnectionSignal,
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

const clientOptions = (config: RedisCacheConfig, defaultTtl?: number) => ({
  host: config.host,
  port: config.port,

  // `cache-manager-redis-store` reads its fallback TTL straight off the client
  // options (`redisCache.options.ttl`) and applies it to any `set` made without
  // an explicit one. cache-manager passes its configured default into the store
  // factory, so it is forwarded here: dropping it silently turns such a write
  // into a key with NO expiry, in the same Redis database the OIDC session
  // store lives in, evictable only by a FLUSHDB.
  ...(defaultTtl === undefined ? {} : { ttl: defaultTtl }),

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
  (config: RedisCacheConfig, logger: LoggerService) =>
  (args?: { ttl?: number }): RedisStore => {
    const reporter = new CacheConnectionReporter(logger);

    const store = (redisStore as unknown as RedisStoreConstructor).create(
      clientOptions(config, args?.ttl)
    );

    // THE line. Everything else here is quality-of-degradation; this is what
    // stops the process dying. Registered before returning, with nothing
    // awaited in between, so there is no turn of the event loop in which an
    // emit could go unobserved. Spec FR-003.
    const client = store.getClient() as unknown as ObservableRedisClient;
    client.on('error', error => reporter.reportError(error));

    // NOT redundant with the line above. `redis@3.1.2` re-emits a socket
    // failure as `'error'` only when no `retry_strategy` is configured
    // (index.js:341) — and we configure one. So the ordinary outage
    // (ECONNREFUSED, peer close, `docker stop redis`) produces `reconnecting`
    // events and no `error` event at all: without this listener the loss would
    // never be logged and `isDown` would never flip, which is exactly the
    // signal FR-015..FR-019 and FR-010a are built on.
    client.on('reconnecting', params => reporter.reportError(params?.error));
    client.on('ready', () => reporter.reportReady());

    return failSoft(store, reporter, connectionSignal(client, reporter));
  };

/**
 * The live connection state, taken from the client wherever possible.
 *
 * `redis@3.1.2` maintains `ready` as the authoritative flag, so prefer it: the
 * reporter's boolean is a report of the last *transition seen*, and a one-off
 * non-connection `'error'` would latch it down for the life of the process
 * (see the note on `CacheConnectionReporter.isDown`). The reporter remains the
 * fallback for clients that do not expose `ready`, including test doubles.
 */
const connectionSignal = (
  client: ObservableRedisClient,
  reporter: CacheConnectionReporter
): CacheConnectionSignal => ({
  get isDown(): boolean {
    return typeof client.ready === 'boolean' ? !client.ready : reporter.isDown;
  },
});

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
  reporter: CacheConnectionReporter,
  signal: CacheConnectionSignal
): RedisStore => {
  // A mutation that quietly failed against a REACHABLE Redis is the one case
  // the single transition record cannot cover: the entry survives, subsequent
  // reads succeed, and the caller is handed data it believes it just
  // invalidated — a stale ActorContext or role set is served for the rest of
  // its TTL. Gated on the live signal, so a real outage stays at one record.
  const onMutationFailure =
    (operation: string) =>
    (error: unknown): void => {
      if (signal.isDown) {
        return;
      }
      reporter.reportOperationFailure(operation, error);
    };

  return {
    // Spread first so `name`, `getClient`, `isCacheableValue` and anything else
    // the store exposes survive untouched. TaskService reaches through
    // `getClient()` for server-side atomic counters and guards on its presence;
    // losing it would reintroduce the lost-update hang of #6310.
    ...store,

    // Published on the store for the same reason `getClient` is: TaskService
    // bypasses the cache interface to issue server-side atomic commands, and
    // needs to know when the connection is down so it can stop logging once per
    // failed counter operation. A narrow read-only view rather than the
    // reporter itself, so a consumer cannot call `reportReady()` and corrupt
    // the shared outage state. Spec FR-010a.
    connectionSignal: signal,

    // A failed read is indistinguishable from a cold cache, which every consumer
    // already handles — that is the whole reason this is safe.
    get: <T>(...args: unknown[]): Promise<T | undefined> =>
      guard(() => store.get<T>(...args), signal),

    // The third argument is forwarded UNMODIFIED. It is a `{ ttl: seconds }`
    // object under the v4 types this repo compiles against, and reinterpreting it
    // is exactly the silent 1000x TTL bug that ruled out swapping the store.
    set: (...args: unknown[]): Promise<void> =>
      guard(
        () => store.set(...args),
        signal,
        onMutationFailure('write')
      ) as Promise<void>,

    del: (...args: unknown[]): Promise<void> =>
      guard(
        () => store.del?.(...args),
        signal,
        onMutationFailure('invalidation')
      ) as Promise<void>,

    reset: (...args: unknown[]): Promise<void> =>
      guard(
        () => store.reset?.(...args),
        signal,
        onMutationFailure('reset')
      ) as Promise<void>,

    // The multi-key and introspection methods are NOT covered by the spread
    // alone: `RoleSetCacheService` calls `store.mget` directly on every batched
    // membership lookup, so leaving it unwrapped means that path keeps its old
    // behaviour — a rejection per request during an outage, and no ceiling at
    // all against a connected-but-silent server.
    mget: (...args: unknown[]): Promise<unknown[]> =>
      guard(() => store.mget?.(...args), signal).then(result =>
        // Shape-preserving fallback: callers index the result positionally, so
        // a bare `undefined` would turn a cache miss into a TypeError.
        Array.isArray(result) ? result : args.map(() => undefined)
      ),

    mset: (...args: unknown[]): Promise<void> =>
      guard(
        () => store.mset?.(...args),
        signal,
        onMutationFailure('write')
      ) as Promise<void>,

    keys: (...args: unknown[]): Promise<string[]> =>
      guard(() => store.keys?.(...args), signal).then(result =>
        Array.isArray(result) ? result : []
      ),

    ttl: (...args: unknown[]): Promise<number> =>
      guard(() => store.ttl?.(...args), signal).then(result =>
        // -1 is node_redis' "no expiry known", the safest thing to claim about
        // a key we could not reach.
        typeof result === 'number' ? result : -1
      ),
  } as RedisStore;
};

/**
 * Run a store operation; on any failure or overrun, yield `undefined`.
 *
 * `onUnexpectedFailure` is invoked only for mutations, and its caller gates it
 * on the connection being up — per-operation logging during an outage is the
 * flood this feature exists to avoid, and the reporter has already emitted
 * exactly one record for the connection loss. Spec FR-017.
 */
const guard = async <T>(
  operation: () => Promise<T> | undefined,
  signal: CacheConnectionSignal,
  onUnexpectedFailure?: (error: unknown) => void
): Promise<T | undefined> => {
  // A known-disconnected client rejects without touching the network
  // (`enable_offline_queue: false`), so arming and clearing a timer per
  // operation would be pure overhead on one of the hottest paths in the
  // process, for the entire duration of an outage.
  if (signal.isDown) {
    try {
      return await operation();
    } catch {
      return undefined;
    }
  }

  let timer: NodeJS.Timeout | undefined;

  try {
    const timeout = new Promise<typeof TIMED_OUT>(resolve => {
      timer = setTimeout(() => resolve(TIMED_OUT), CACHE_OPERATION_TIMEOUT_MS);
      // Do not hold the event loop open for a cache read. Without this a
      // pending timer can delay process exit by up to the ceiling.
      timer.unref?.();
    });

    const result = await Promise.race([Promise.resolve(operation()), timeout]);

    if (result === TIMED_OUT) {
      onUnexpectedFailure?.(
        new Error(`timed out after ${CACHE_OPERATION_TIMEOUT_MS}ms`)
      );
      return undefined;
    }

    return result as T | undefined;
  } catch (error) {
    onUnexpectedFailure?.(error);
    return undefined;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const TIMED_OUT = Symbol('cache-operation-timed-out');

type ObservableRedisClient = RedisClientLike & {
  /** `redis@3.1.2`'s authoritative connection flag. */
  readonly ready?: boolean;
  on(event: 'error', listener: (error: unknown) => void): void;
  on(event: 'ready', listener: () => void): void;
  on(
    event: 'reconnecting',
    listener: (params?: { error?: unknown }) => void
  ): void;
};

type RedisStoreConstructor = {
  create: (options: ReturnType<typeof clientOptions>) => RedisStore;
};
