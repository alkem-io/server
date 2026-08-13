import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { RedisConnectionReporter } from './redis.connection.reporter';

/**
 * Regression coverage for the log-volume half of alkem-io/server#6332.
 *
 * These assertions all FAIL on develop, because on develop the two session
 * `ioredis` clients have no `error` listener at all — ioredis routes the emit
 * through `silentEmit` and writes it to stdout with `console.error`, so nothing
 * reaches Winston and there is no reporter to test.
 *
 * The sibling of `cache.connection.reporter.spec.ts`; the shape is deliberately
 * the same because the observable contract is the same (one record per
 * transition, never per retry).
 */
describe('RedisConnectionReporter', () => {
  let logger: LoggerService;
  let reporter: RedisConnectionReporter;

  const warnings = () => (logger.warn as ReturnType<typeof vi.fn>).mock.calls;

  const createLogger = () =>
    ({
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    }) as unknown as LoggerService;

  beforeEach(() => {
    logger = createLogger();
    reporter = new RedisConnectionReporter(logger, 'session');
  });

  describe('transition reporting', () => {
    it('records the loss exactly once, carrying the client label', () => {
      reporter.reportError(new Error('connect ECONNREFUSED 127.0.0.1:6379'));

      expect(warnings()).toHaveLength(1);
      // Without the label an operator reading the record cannot tell which of
      // the three clients is down, and a second client's outage would look like
      // a duplicate of the first. Invariant I5.
      expect(warnings()[0][0]).toContain('session');
    });

    it('stays silent for every further failure in the same outage', () => {
      // ioredis's default backoff saturates at one attempt every 2 seconds, so
      // an hour of outage re-enters this handler ~1800 times per client per
      // replica. 100 attempts is ~3 minutes; a real outage runs far longer.
      for (let attempt = 0; attempt < 100; attempt++) {
        reporter.reportError(new Error('connect ECONNREFUSED 127.0.0.1:6379'));
      }

      // FR-025 — the record count is a function of transitions, not duration.
      expect(warnings()).toHaveLength(1);
    });

    it('records recovery once and re-arms, so a SECOND outage is reported too', () => {
      // The re-arm is the whole reason `reportReady` exists. If recovery did
      // not clear the latch, the first blip of a process's life would silence
      // every later outage for the rest of that process's life. FR-024.
      reporter.reportError(new Error('down'));
      reporter.reportReady();
      reporter.reportError(new Error('down again'));
      reporter.reportReady();

      // Exactly 4: loss, recovery, loss, recovery. Two complete cycles cost two
      // records each, however long either outage lasted.
      expect(warnings()).toHaveLength(4);
      expect(warnings()[0][0]).toMatch(/lost/i);
      expect(warnings()[1][0]).toMatch(/re-established/i);
      expect(warnings()[2][0]).toMatch(/lost/i);
      expect(warnings()[3][0]).toMatch(/re-established/i);
    });

    it('says nothing on the ordinary startup connect', () => {
      // Every boot of every replica emits `ready` once, and ioredis emits it
      // again after each successful reconnect. Neither is news on its own.
      reporter.reportReady();
      reporter.reportReady();

      expect(warnings()).toHaveLength(0);
    });

    it('reports a Redis that was already down at boot', () => {
      // The latch starts un-set rather than "assumed healthy", so a process
      // that never had a working connection still reports the first failure —
      // it has no healthy state to fall from, but it is still news.
      reporter.reportError(new Error('ENOTFOUND redis'));

      expect(warnings()).toHaveLength(1);
    });
  });

  describe('record content', () => {
    it('carries the error message and code, and nothing else from the error', () => {
      const error: NodeJS.ErrnoException = new Error(
        'connect ECONNREFUSED 127.0.0.1:6379'
      );
      error.code = 'ECONNREFUSED';
      // An ioredis error can carry the failing command, whose arguments may be
      // credentials (`AUTH <password>`) or session identifiers. Constitution §8
      // forbids any of it reaching the log, so the reporter must project the
      // error down to message + code rather than formatting the object.
      (error as unknown as Record<string, unknown>).command = {
        name: 'auth',
        args: ['AUTH', 'hunter2'],
      };

      reporter.reportError(error);

      const [message, context] = warnings()[0];
      expect(message).toContain('connect ECONNREFUSED');
      expect(message).toContain('ECONNREFUSED');
      expect(message).not.toContain('hunter2');
      expect(message).not.toContain('args');
      expect(context).toBe(LogContext.AUTH);
    });

    it('omits the code cleanly when the error has none', () => {
      // Not every ioredis error is a socket error; a reply error has a message
      // and no `code`. The record must stay readable rather than printing
      // "(code: undefined)".
      reporter.reportError(new Error('Ready check failed'));

      expect(warnings()[0][0]).toContain('Ready check failed');
      expect(warnings()[0][0]).not.toContain('undefined');
    });

    it('handles a non-Error rejection without throwing', () => {
      // ioredis re-emits whatever the socket layer produced; it is not
      // guaranteed to be an Error, and a throw inside an `error` handler would
      // become an uncaught exception — the crash this feature exists to remove.
      expect(() => reporter.reportError('just a string')).not.toThrow();
      expect(() => reporter.reportReady()).not.toThrow();
      expect(warnings()).toHaveLength(2);
    });

    it('routes every record through the injected logger at AUTH context', () => {
      // AUTH rather than CACHE: these clients back the session store and the
      // OIDC handle, so an operator triaging a login outage finds them where
      // the rest of the authentication story already is.
      reporter.reportError(new Error('down'));
      reporter.reportReady();

      expect(warnings()).toHaveLength(2);
      for (const [, context] of warnings()) {
        expect(context).toBe(LogContext.AUTH);
      }
    });

    it('never touches the other log levels', () => {
      // A connection transition is a warning: the process is still serving, it
      // is just failing fast. Emitting `error` too would double the volume and
      // page on a condition that recovers itself.
      reporter.reportError(new Error('down'));
      reporter.reportReady();

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('one instance per client', () => {
    it('keeps two labelled reporters fully independent', () => {
      // The reason the class takes a label instead of being a singleton. A
      // shared instance would make the second client's outage invisible while
      // the first was already down, and would announce recovery when only one
      // of the two had actually recovered. FR-023, contract G8, invariant I5.
      const sessionLogger = createLogger();
      const oidcLogger = createLogger();
      const session = new RedisConnectionReporter(sessionLogger, 'session');
      const oidc = new RedisConnectionReporter(oidcLogger, 'oidc');

      session.reportError(new Error('down'));
      oidc.reportError(new Error('down'));

      const sessionCalls = (sessionLogger.warn as ReturnType<typeof vi.fn>).mock
        .calls;
      const oidcCalls = (oidcLogger.warn as ReturnType<typeof vi.fn>).mock
        .calls;

      expect(sessionCalls).toHaveLength(1);
      expect(oidcCalls).toHaveLength(1);
      expect(sessionCalls[0][0]).toContain('session');
      expect(oidcCalls[0][0]).toContain('oidc');
    });

    it("does not let one client's recovery re-arm the other", () => {
      // Both reporters write to the same Winston instance in production, so the
      // only thing separating their state is that they are separate objects.
      // This pins that: `oidc` recovering must not clear `session`'s latch and
      // let session's ongoing outage log a second time.
      const shared = createLogger();
      const session = new RedisConnectionReporter(shared, 'session');
      const oidc = new RedisConnectionReporter(shared, 'oidc');

      session.reportError(new Error('down'));
      oidc.reportError(new Error('down'));
      oidc.reportReady();
      session.reportError(new Error('still down'));

      // 3 records: session lost, oidc lost, oidc re-established. The fourth
      // call is suppressed because session never recovered.
      const calls = (shared.warn as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls).toHaveLength(3);
      expect(calls.map(([message]) => message as string)).toEqual([
        expect.stringContaining('session'),
        expect.stringContaining('oidc'),
        expect.stringContaining('oidc'),
      ]);
    });
  });
});
