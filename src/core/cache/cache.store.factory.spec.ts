import { RedisStore } from '@common/interfaces/redis.interfaces';
import { LoggerService } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { Mock } from 'vitest';
import {
  CACHE_OPERATION_TIMEOUT_MS,
  cacheRetryStrategy,
  createRedisCacheStore,
} from './cache.store.factory';

/**
 * Regression coverage for alkem-io/server#6330 — a Redis outage terminated the
 * process.
 *
 * Every assertion here is written to FAIL against develop. That is the point,
 * and it is why these tests drive the factory directly rather than driving a
 * cache consumer: consumers already tolerate a miss, so a consumer-level test
 * passes against the broken code and proves nothing at all.
 *
 * The load-bearing one is `does not throw when the client emits an error`.
 * Node's EventEmitter rethrows an `'error'` emit that has no listener — which is
 * exactly how the process died — so that test is red unless the listener is
 * genuinely attached.
 */

const createFakeClient = () => new EventEmitter();

/** Signature of `cache-manager-redis-store`'s `create`, loosely typed. */
type CreateStore = (...args: any[]) => any;

let fakeClient: EventEmitter;
let fakeStore: Record<string, unknown>;
let createSpy: Mock<CreateStore>;

vi.mock('cache-manager-redis-store', () => ({
  default: { create: (...args: any[]) => createSpy(...args) },
  create: (...args: any[]) => createSpy(...args),
}));

describe('createRedisCacheStore', () => {
  let logger: LoggerService;

  const build = (args?: { ttl?: number }): RedisStore =>
    createRedisCacheStore({ host: 'localhost', port: 6379 }, logger)(args);

  beforeEach(() => {
    fakeClient = createFakeClient();
    fakeStore = {
      name: 'redis',
      getClient: () => fakeClient,
      isCacheableValue: () => true,
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
    };
    createSpy = vi.fn<CreateStore>().mockReturnValue(fakeStore);
    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    } as unknown as LoggerService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------- survival

  describe('process survival (the defect)', () => {
    it('does not throw when the client emits an error', () => {
      build();

      // Without a listener this line throws the error as an uncaught
      // exception, which is precisely how the process died. THE regression test.
      expect(() =>
        fakeClient.emit('error', new Error('Ready check failed'))
      ).not.toThrow();
    });

    it('attaches the error listener before returning, not lazily', () => {
      build();

      // No awaits, no first-command trigger: the listener must already be there
      // the moment the factory hands the store back, because the ready-check
      // INFO can fail before any application command is ever issued.
      expect(fakeClient.listenerCount('error')).toBe(1);
      expect(fakeClient.listenerCount('ready')).toBe(1);
    });

    it('does not wait on the connection before returning the store', () => {
      // Boot must survive Redis already being down (US1 scenario 4). The client
      // connects asynchronously, so the factory must hand back a usable store
      // synchronously — never a promise, and never after a connect attempt.
      const store = createRedisCacheStore(
        { host: 'no-such-host', port: 6379 },
        logger
      )();

      expect(store).toBeDefined();
      expect(store).not.toBeInstanceOf(Promise);
      expect(store.name).toBe('redis');
    });

    it('reports a loss signalled only as `reconnecting`, with no error event', () => {
      // THE second regression test. `redis@3.1.2` re-emits a socket failure as
      // `'error'` ONLY when no retry_strategy is configured (index.js:341) —
      // and this factory configures one. So the ordinary outage (ECONNREFUSED,
      // `docker stop redis`) produces reconnecting events and NO error event.
      // Listening for `error` alone makes an outage completely silent, and
      // leaves `isDown` false so TaskService never suppresses its own flood.
      const store = build();

      fakeClient.emit('reconnecting', {
        delay: 250,
        attempt: 1,
        error: new Error('ECONNREFUSED'),
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(store.connectionSignal?.isDown).toBe(true);

      fakeClient.emit('ready');
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(store.connectionSignal?.isDown).toBe(false);
    });

    it('reports the outage once, however many retries fail', () => {
      build();

      for (let i = 0; i < 25; i++) {
        fakeClient.emit('error', new Error('ECONNREFUSED'));
      }
      fakeClient.emit('ready');

      // One loss + one recovery. SC-004.
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });

  // --------------------------------------------------------------- fail-soft

  describe('fail-soft behaviour', () => {
    it('turns a failing read into a miss', async () => {
      fakeStore.get = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      await expect(store.get('any-key')).resolves.toBeUndefined();
    });

    it('turns a failing write into a no-op', async () => {
      fakeStore.set = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      await expect(store.set('any-key', 'value')).resolves.toBeUndefined();
    });

    it('turns a failing delete into a no-op', async () => {
      fakeStore.del = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      await expect(store.del?.('any-key')).resolves.toBeUndefined();
    });

    it('turns a failing reset into a no-op', async () => {
      fakeStore.reset = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      await expect(store.reset?.()).resolves.toBeUndefined();
    });

    it('swallows failures regardless of their shape, not just known codes', async () => {
      // The vocabulary spans AbortError/NR_CLOSED, UNCERTAIN_STATE,
      // CONNECTION_BROKEN, raw socket errors and JSON parse failures on
      // truncated replies. An allow-list would be a guess.
      for (const thrown of [
        new SyntaxError('Unexpected end of JSON input'),
        'a bare string',
        { code: 'ECONNRESET' },
        undefined,
      ]) {
        fakeStore.get = vi.fn().mockRejectedValue(thrown);
        const store = build();

        await expect(store.get('k')).resolves.toBeUndefined();
      }
    });

    it('passes successful reads straight through untouched', async () => {
      fakeStore.get = vi.fn().mockResolvedValue({ cached: true });
      const store = build();

      // SC-008 — no observable change while Redis is healthy.
      await expect(store.get('k')).resolves.toEqual({ cached: true });
    });
  });

  // ------------------------------------------------------------------ timing

  describe('bounded latency', () => {
    it('abandons an operation that never settles, at the ceiling', async () => {
      vi.useFakeTimers();
      fakeStore.get = vi.fn().mockReturnValue(new Promise(() => {}));
      const store = build();

      const pending = store.get('k');
      await vi.advanceTimersByTimeAsync(CACHE_OPERATION_TIMEOUT_MS);

      // A connected-but-silent server must not hold a request open. The
      // configured Redis timeout is measured in tens of seconds; charging that
      // to a request would swap a crash for a hang.
      await expect(pending).resolves.toBeUndefined();
    });
  });

  // ------------------------------------------------------------------- retry

  describe('reconnection policy', () => {
    it('always returns a number, for every attempt', () => {
      // Returning anything else — including an Error, the documented way to
      // abort — makes redis@3.1.2 give up permanently AND emit a terminal
      // error. That is the failure mode this whole feature removes.
      for (let attempt = 1; attempt <= 100; attempt++) {
        const delay = cacheRetryStrategy({ attempt });

        expect(typeof delay).toBe('number');
        expect(Number.isFinite(delay)).toBe(true);
        expect(delay).toBeGreaterThan(0);
      }
    });

    it('grows the delay but caps it', () => {
      expect(cacheRetryStrategy({ attempt: 1 })).toBe(250);
      expect(cacheRetryStrategy({ attempt: 2 })).toBe(500);
      // Capped well inside SC-003's 60s recovery target, so that target holds
      // by construction rather than by luck.
      expect(cacheRetryStrategy({ attempt: 20 })).toBe(5000);
      expect(cacheRetryStrategy({ attempt: 100_000 })).toBe(5000);
    });

    it('never spends the retry budget, so reconnection is unbounded', () => {
      build();
      const options = createSpy.mock.calls[0][0];

      // connect_timeout doubles as the total retry budget in redis@3.1.2: once
      // retry_totaltime exceeds it the client calls end(false) and stops
      // forever. Wiring the configured 60s here would abandon Redis after a
      // minute of outage.
      expect(options.connect_timeout).toBeGreaterThan(24 * 60 * 60 * 1000);
    });

    it('refuses to queue commands issued while disconnected', () => {
      build();
      const options = createSpy.mock.calls[0][0];

      // This is what makes a known-disconnected cache miss in 0ms with no timer
      // of ours, and it is what stops queued commands being aborted en masse.
      expect(options.enable_offline_queue).toBe(false);
    });
  });

  // ---------------------------------------------------------- store identity

  describe('store contract preservation', () => {
    it('keeps getClient and name intact', () => {
      const store = build();

      // TaskService reaches through getClient() for server-side atomic counters
      // and guards on its presence. Losing it would reintroduce the lost-update
      // hang of #6310.
      expect(store.name).toBe('redis');
      expect(typeof store.getClient).toBe('function');
      expect(store.getClient()).toBe(fakeClient);
    });

    it('publishes the connection signal for direct-client consumers', () => {
      const store = build();

      expect(store.connectionSignal?.isDown).toBe(false);
      fakeClient.emit('error', new Error('down'));
      expect(store.connectionSignal?.isDown).toBe(true);
      fakeClient.emit('ready');
      expect(store.connectionSignal?.isDown).toBe(false);
    });

    it('forwards the ttl argument to the underlying store unmodified', async () => {
      const store = build();

      // The whole design rests on this. Call sites pass a v4-style
      // `{ ttl: seconds }` object; reinterpreting it is the silent 1000x TTL
      // bug that ruled out swapping the store for a cache-manager v5 one.
      await store.set('key', 'value', { ttl: 3600 });

      expect(fakeStore.set).toHaveBeenCalledWith('key', 'value', { ttl: 3600 });
    });

    it('does not log per failed read', async () => {
      fakeStore.get = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      for (let i = 0; i < 20; i++) {
        await store.get('k');
      }

      // The reporter owns the signal. Logging here too would reproduce the
      // flood from the other direction, and a failed read is a miss anyway.
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('reports an invalidation that failed against a REACHABLE cache', async () => {
      // The one case the transition record cannot cover: the connection is up,
      // the DEL failed, the entry survives and every later read serves it. A
      // silently-swallowed invalidation is a stale ActorContext / role set for
      // the rest of its TTL, with no signal anywhere.
      fakeStore.del = vi.fn().mockRejectedValue(new Error('LOADING'));
      const store = build();

      await expect(store.del?.('k')).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(
        (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]
      ).toMatch(/invalidation/);
    });

    it('stays silent about mutations once the outage has been reported', async () => {
      fakeStore.del = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      fakeClient.emit('error', new Error('ECONNREFUSED'));
      (logger.warn as ReturnType<typeof vi.fn>).mockClear();

      for (let i = 0; i < 20; i++) {
        await store.del?.('k');
      }

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('fails mget soft, preserving the positional shape callers index into', async () => {
      // RoleSetCacheService reads `cacheManager.store.mget` directly, so the
      // spread alone left that path rejecting per request during an outage —
      // and with no ceiling against a connected-but-silent server.
      fakeStore.mget = vi.fn().mockRejectedValue(new Error('NR_CLOSED'));
      const store = build();

      await expect(store.mget?.('a', 'b', 'c')).resolves.toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it("forwards cache-manager's default ttl to the client", () => {
      // `cache-manager-redis-store` reads its fallback TTL off the client
      // options. Dropping it makes any `set` without an explicit ttl a key with
      // NO expiry, in the database the OIDC session store shares.
      build({ ttl: 5000 });

      expect(createSpy.mock.calls[0][0].ttl).toBe(5000);
    });
  });
});
