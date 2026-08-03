import { LoggerService } from '@nestjs/common';
import { readdirSync, readFileSync } from 'fs';
import type Redis from 'ioredis';
import { join, relative, resolve } from 'path';
import { createRedisClient } from './redis.client.factory';

/**
 * Regression coverage for alkem-io/server#6332 — a Redis outage hung every
 * authenticated request for tens of seconds and then failed it.
 *
 * These tests drive the factory directly rather than a consumer, for the same
 * reason `cache.store.factory.spec.ts` does: a consumer-level test of the
 * session store passes against develop (the request eventually resolves, just
 * 42 seconds later) and would prove nothing. The properties that matter here
 * are the *applied options* and the *attached listeners*, so those are what is
 * asserted.
 *
 * Every client constructed below is registered for teardown. An ioredis client
 * with the default retry strategy reconnects forever, and a leaked one keeps a
 * timer alive that stops vitest's worker from exiting.
 */

/** Somewhere nothing listens: refused immediately, no DNS, no waiting. */
const UNREACHABLE = { host: '127.0.0.1', port: 1 };

describe('createRedisClient', () => {
  let logger: LoggerService;
  let clients: Redis[];

  const warnings = () => (logger.warn as ReturnType<typeof vi.fn>).mock.calls;

  /** Build a client and register it for teardown. */
  const build = (
    options: Parameters<typeof createRedisClient>[2],
    config: Parameters<typeof createRedisClient>[0] = UNREACHABLE
  ): Redis => {
    const client = createRedisClient(config, logger, options);
    clients.push(client);
    return client;
  };

  beforeEach(() => {
    clients = [];
    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    } as unknown as LoggerService;
  });

  afterEach(() => {
    for (const client of clients) {
      // `disconnect()` rather than `quit()`: quit round-trips a command to a
      // server that is not there, so it would hang the suite exactly the way
      // this feature exists to prevent.
      client.disconnect();
    }
    clients = [];
  });

  // ------------------------------------------------------------ construction

  describe('construction (F1, G1)', () => {
    it('returns a client against an unreachable host, without throwing', () => {
      // FR-013. A throw here propagates into Nest's module bootstrap (for
      // OIDC_REDIS_CLIENT and the health probe) or the Express bootstrap (for
      // the session client) and aborts startup — a Redis that is down must not
      // be able to stop the server from booting.
      let client: Redis | undefined;

      expect(() => {
        client = build({ purpose: 'session' });
      }).not.toThrow();

      expect(client).toBeDefined();
      expect(client).not.toBeInstanceOf(Promise);
    });

    it('does not block on the connection before returning', () => {
      // The client is handed back while still in `connecting`. If the factory
      // ever awaited the connection, boot latency would become a function of
      // Redis's availability.
      const client = build({ purpose: 'session' });

      expect(['connecting', 'connect', 'wait', 'reconnecting']).toContain(
        client.status
      );
    });

    it('hands back an unwrapped ioredis instance (G6)', () => {
      // No proxy, no method interception: `session-index.redis.ts` issues Lua
      // EVAL and `connect-redis` sniffs the client's shape (`"scanIterator" in
      // client`) to decide which library it is talking to. A wrapper breaks
      // both.
      const client = build({ purpose: 'session' });

      expect(typeof client.eval).toBe('function');
      expect(typeof client.defineCommand).toBe('function');
      expect(typeof client.pipeline).toBe('function');
    });
  });

  // --------------------------------------------------------------- listeners

  describe('listeners attached before return (F2, F3)', () => {
    it('has an error listener the moment the factory returns', () => {
      // FR-027. Nothing is awaited between construction and return, so there is
      // no turn of the event loop in which an emit could go unobserved. On
      // develop this count is 0 and every session-client failure lands on
      // stdout via ioredis's `silentEmit`, bypassing Winston entirely.
      const client = build({ purpose: 'session', lazyConnect: true });

      expect(client.listenerCount('error')).toBeGreaterThanOrEqual(1);
    });

    it('has a ready listener the moment the factory returns', () => {
      // FR-024. Without it there is no recovery record AND the reporter never
      // re-arms, so a second outage in the same process is silent forever.
      const client = build({ purpose: 'session', lazyConnect: true });

      expect(client.listenerCount('ready')).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------------------- options

  describe('applied options (F4, F5, F9)', () => {
    it('applies the four fail-fast options', () => {
      const client = build({ purpose: 'session', lazyConnect: true });

      // The load-bearing one. ioredis's default `true` PARKS a command issued
      // while disconnected and flushes the queue with an error only at the 21st
      // reconnect boundary — ~42 s once the backoff saturates. `false` rejects
      // in 0 ms for the whole outage. FR-008.
      expect(client.options.enableOfflineQueue).toBe(false);

      // The only defence against a store that completes the handshake and then
      // stops answering: the other three options all key off connection state.
      // FR-009.
      expect(client.options.commandTimeout).toBe(500);

      // Adopted verbatim from the health probe, which had it right already.
      // FR-011.
      expect(client.options.connectTimeout).toBe(500);

      // Bounds a command already in flight when the connection drops. With
      // offline queueing off nothing else can be waiting, so 1 rather than
      // ioredis's default 20. FR-010.
      expect(client.options.maxRetriesPerRequest).toBe(1);
    });

    it('reads host and port from the config, coercing a string port', () => {
      // `storage.redis.port` arrives from the environment as a string; ioredis
      // silently mis-connects on a non-number, so the coercion is not cosmetic.
      const client = build(
        { purpose: 'session', lazyConnect: true },
        { host: 'redis.internal', port: '6379' }
      );

      expect(client.options.host).toBe('redis.internal');
      expect(client.options.port).toBe(6379);
    });

    it('does not enable lazyConnect unless the caller asks for it', () => {
      // FR-014. Combined with `enableOfflineQueue: false`, lazyConnect makes
      // the FIRST command fail unconditionally — the client is still in `wait`
      // when it is issued. Tolerable for a probe that re-runs on a schedule,
      // fatal on the request path, hence opt-in.
      expect(build({ purpose: 'session' }).options.lazyConnect).toBe(false);
      expect(build({ purpose: 'oidc' }).options.lazyConnect).toBe(false);
    });

    it('enables lazyConnect for the health probe when requested', () => {
      const client = build({ purpose: 'health', lazyConnect: true });

      expect(client.options.lazyConnect).toBe(true);
      // And it really did defer: nothing is connecting yet.
      expect(client.status).toBe('wait');
    });

    it('applies no keyPrefix', () => {
      // F9. The `alkemio:sid:` prefix is applied by `connect-redis` and by
      // `buildSessionStore`; a client-level prefix would double it and every
      // single session lookup would miss — an outage that looks like every user
      // being logged out at once.
      const client = build({ purpose: 'session', lazyConnect: true });

      expect(client.options.keyPrefix ?? '').toBe('');
    });
  });

  // ------------------------------------------------------------------- retry

  describe('reconnection policy (F6, G5)', () => {
    it('always returns a number, for every attempt', () => {
      // Kept as ioredis's default rather than restated. Returning a NON-number
      // is how ioredis is told to stop trying: it transitions to `end` and
      // abandons the store permanently, so an outage longer than the budget
      // would need a process restart to recover from. FR-012, invariant I3.
      const client = build({ purpose: 'session', lazyConnect: true });
      const retryStrategy = client.options.retryStrategy;

      expect(typeof retryStrategy).toBe('function');

      let previous = 0;
      for (let attempt = 1; attempt <= 100; attempt++) {
        const delay = retryStrategy?.(attempt);

        expect(typeof delay).toBe('number');
        expect(delay).not.toBeInstanceOf(Error);
        expect(Number.isFinite(delay as number)).toBe(true);
        expect(delay as number).toBeGreaterThan(0);
        // Monotonic non-decreasing: a strategy that ever shortens the interval
        // under sustained failure is a strategy that hammers a recovering
        // store.
        expect(delay as number).toBeGreaterThanOrEqual(previous);
        previous = delay as number;
      }
    });

    it('grows the interval but caps it at 2000ms', () => {
      const client = build({ purpose: 'session', lazyConnect: true });
      const retryStrategy = client.options.retryStrategy;

      expect(retryStrategy?.(1)).toBe(50);
      expect(retryStrategy?.(2)).toBe(100);
      // Capped well inside SC-005's recovery target, so "no operator action
      // required" holds by construction rather than by luck.
      expect(retryStrategy?.(40)).toBe(2000);
      expect(retryStrategy?.(100_000)).toBe(2000);
    });
  });

  // -------------------------------------------------------------- reporting

  describe('outage reporting through the returned client (F7, F8)', () => {
    it('does not throw when the client emits an error, and records it once', () => {
      const client = build({ purpose: 'session', lazyConnect: true });

      expect(() =>
        client.emit('error', new Error('connect ECONNREFUSED'))
      ).not.toThrow();

      expect(warnings()).toHaveLength(1);
      expect(warnings()[0][0]).toContain('session');
    });

    it('stays silent for the rest of the outage, then records recovery once', () => {
      const client = build({ purpose: 'session', lazyConnect: true });

      for (let attempt = 0; attempt < 50; attempt++) {
        client.emit('error', new Error('connect ECONNREFUSED'));
      }
      expect(warnings()).toHaveLength(1);

      client.emit('ready');

      // One loss + one recovery for the whole cycle. FR-024, FR-025.
      expect(warnings()).toHaveLength(2);
      expect(warnings()[1][0]).toMatch(/re-established/i);
    });

    it('does not log the ordinary boot connect', () => {
      const client = build({ purpose: 'session', lazyConnect: true });

      client.emit('ready');

      expect(warnings()).toHaveLength(0);
    });
  });

  // ------------------------------------------------------ one reporter each

  describe('one reporter per client (G8, FR-023)', () => {
    it('reports two clients independently, neither masking the other', () => {
      // Each call constructs its OWN reporter, labelled with `purpose`. A
      // shared reporter would make whichever client failed second invisible,
      // and would announce recovery when only one of the two had recovered.
      // US3, invariant I5.
      const session = build({ purpose: 'session', lazyConnect: true });
      const oidc = build({ purpose: 'oidc', lazyConnect: true });

      session.emit('error', new Error('connect ECONNREFUSED'));
      oidc.emit('error', new Error('connect ECONNREFUSED'));

      expect(warnings()).toHaveLength(2);
      const messages = warnings().map(([message]) => message as string);
      expect(messages[0]).toContain('session');
      expect(messages[1]).toContain('oidc');
    });

    it("does not let one client's recovery re-arm the other", () => {
      const session = build({ purpose: 'session', lazyConnect: true });
      const oidc = build({ purpose: 'oidc', lazyConnect: true });

      session.emit('error', new Error('down'));
      oidc.emit('error', new Error('down'));
      oidc.emit('ready');
      // Session never recovered, so this must remain suppressed. If the
      // reporters shared state, oidc's recovery would have re-armed session and
      // this line would emit a duplicate loss record.
      session.emit('error', new Error('still down'));

      expect(warnings()).toHaveLength(3);
    });
  });

  // ------------------------------------------------------------ the SC-009 guard

  describe('single construction site (F10, SC-009)', () => {
    it('finds no ioredis construction anywhere outside this factory', () => {
      // THE structural test. Fixing the two session clients closes two bugs;
      // this closes the class. #6332 was a SAFE bootstrap (the health probe's
      // options) that was never propagated, and #6330 was an UNSAFE one
      // copy-pasted twice — same root cause, per-site client construction with
      // no shared seam. If a future third client is constructed directly it
      // gets ioredis's defaults back: offline queueing on, 20 retries per
      // request, and the 42-second hang returns. FR-007.
      const offenders = findDirectConstructions();

      expect(
        offenders,
        offenders.length === 0
          ? ''
          : `ioredis must only be constructed in ${FACTORY_RELATIVE_PATH}. ` +
              `Route these through createRedisClient():\n` +
              offenders
                .map(hit => `  ${hit.file}:${hit.line}  ${hit.text}`)
                .join('\n')
      ).toEqual([]);
    });
  });
});

// --------------------------------------------------------------------- helpers

const SRC_ROOT = resolve(__dirname, '..', '..');
const FACTORY_RELATIVE_PATH = 'src/core/redis/redis.client.factory.ts';
const FACTORY_ABSOLUTE_PATH = resolve(SRC_ROOT, '..', FACTORY_RELATIVE_PATH);

/**
 * The escapes are load-bearing beyond matching whitespace: this file is itself
 * inside the tree being scanned, and `new` followed by `\s+` rather than a real
 * space is what stops the pattern matching its own source.
 */
const DIRECT_CONSTRUCTION = /new\s+Redis\s*\(/;

type Hit = { file: string; line: number; text: string };

/**
 * Every `.ts` file under `src/`.
 *
 * A `readdirSync` walk rather than shelling out to `grep` so the guard behaves
 * identically on a developer machine and in CI, with no dependency on which
 * grep is installed.
 */
const listSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : listSourceFiles(path);
    }
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
};

/**
 * Strip comments before matching.
 *
 * The factory's own docblock, and the call sites that now route through it, all
 * *describe* the old `new Redis({ host, port })` in prose — that is the record
 * of why the seam exists and must not be what trips the guard. Only block
 * comments and whole-line `//` comments are removed, which is conservative: it
 * can never delete real code, so the guard cannot be silenced by formatting.
 */
const stripComments = (source: string): string[] =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, blockComment =>
      blockComment.replace(/[^\n]/g, ' ')
    )
    .split('\n')
    .map(line => (line.trimStart().startsWith('//') ? '' : line));

const findDirectConstructions = (): Hit[] =>
  listSourceFiles(SRC_ROOT).flatMap(file => {
    if (resolve(file) === FACTORY_ABSOLUTE_PATH) {
      return [];
    }
    return stripComments(readFileSync(file, 'utf8')).flatMap((text, index) =>
      DIRECT_CONSTRUCTION.test(text)
        ? [
            {
              file: relative(resolve(SRC_ROOT, '..'), file),
              line: index + 1,
              text: text.trim(),
            },
          ]
        : []
    );
  });
