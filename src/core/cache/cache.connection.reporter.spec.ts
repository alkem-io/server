import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { CacheConnectionReporter } from './cache.connection.reporter';

/**
 * Regression coverage for the log-volume half of alkem-io/server#6330.
 *
 * These assertions all FAIL on develop, because on develop there is no reporter
 * at all — the client's error event is unlistened and terminates the process.
 */
describe('CacheConnectionReporter', () => {
  let logger: LoggerService;
  let reporter: CacheConnectionReporter;

  const warnings = () => (logger.warn as ReturnType<typeof vi.fn>).mock.calls;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
    } as unknown as LoggerService;
    reporter = new CacheConnectionReporter(logger);
  });

  describe('transition reporting', () => {
    it('records the loss exactly once', () => {
      reporter.reportError(new Error('ECONNREFUSED'));

      expect(warnings()).toHaveLength(1);
    });

    it('stays silent for every further failure in the same outage', () => {
      // A retrying client re-enters the error handler roughly every 5 seconds.
      // 50 attempts is a ~4 minute outage; a real one runs for hours.
      for (let attempt = 0; attempt < 50; attempt++) {
        reporter.reportError(new Error('ECONNREFUSED'));
      }

      expect(warnings()).toHaveLength(1);
    });

    it('records recovery exactly once, and re-arms for the next outage', () => {
      reporter.reportError(new Error('down'));
      reporter.reportReady();
      reporter.reportError(new Error('down again'));

      // Exactly 3: loss, recovery, loss. This is SC-004 — an outage cycle costs
      // 2 records regardless of how long it lasts.
      expect(warnings()).toHaveLength(3);
    });

    it('says nothing on the ordinary startup connect', () => {
      // Every boot of every replica connects. That is not news.
      reporter.reportReady();
      reporter.reportReady();

      expect(warnings()).toHaveLength(0);
    });
  });

  describe('isDown', () => {
    it('tracks the connection state across an outage cycle', () => {
      expect(reporter.isDown).toBe(false);

      reporter.reportError(new Error('down'));
      expect(reporter.isDown).toBe(true);

      reporter.reportReady();
      expect(reporter.isDown).toBe(false);
    });
  });

  describe('record content', () => {
    it('carries the error message and code, and nothing else from the error', () => {
      const error: NodeJS.ErrnoException = new Error('Ready check failed');
      error.code = 'UNCERTAIN_STATE';
      // A node_redis error can carry the failing command's arguments, which may
      // include cached values. None of it may reach the log.
      (error as unknown as Record<string, unknown>).args = [
        'AUTH',
        'super-secret-password',
      ];

      reporter.reportError(error);

      const [message, context] = warnings()[0];
      expect(message).toContain('Ready check failed');
      expect(message).toContain('UNCERTAIN_STATE');
      expect(message).not.toContain('super-secret-password');
      expect(context).toBe(LogContext.CACHE);
    });

    it('handles a non-Error rejection without throwing', () => {
      expect(() => reporter.reportError('just a string')).not.toThrow();
      expect(warnings()).toHaveLength(1);
    });

    it('routes every record through the injected logger with a context', () => {
      reporter.reportError(new Error('down'));
      reporter.reportReady();

      for (const [, context] of warnings()) {
        expect(context).toBe(LogContext.CACHE);
      }
    });
  });
});
