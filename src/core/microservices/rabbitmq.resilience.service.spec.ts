import { LogContext } from '@common/enums/logging.context';
import { RabbitMQResilienceService } from '@core/microservices/rabbitmq.resilience.service';
import {
  AmqpConnection,
  AmqpConnectionManager,
} from '@golevelup/nestjs-rabbitmq';
import { type Mock, vi } from 'vitest';

/**
 * Creates a mock managedConnection (EventEmitter-like) that captures
 * handlers registered via `.on()` so they can be triggered in tests.
 */
function createMockManagedConnection() {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};

  return {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!handlers[event]) {
        handlers[event] = [];
      }
      handlers[event].push(handler);
    }),
    /** Helper: trigger a registered event handler */
    emit(event: string, ...args: any[]) {
      const eventHandlers = handlers[event] ?? [];
      for (const handler of eventHandlers) {
        handler(...args);
      }
    },
  };
}

function createMockAmqpConnection(
  managedConnection: ReturnType<typeof createMockManagedConnection>,
  name?: string
) {
  return {
    managedConnection,
    configuration: name ? { name } : undefined,
  } as unknown as AmqpConnection;
}

describe('RabbitMQResilienceService', () => {
  let service: RabbitMQResilienceService;
  let connectionManager: { getConnections: Mock };
  let logger: Record<string, Mock>;

  function buildService(connections: AmqpConnection[]) {
    connectionManager = {
      getConnections: vi.fn().mockReturnValue(connections),
    };

    logger = {
      verbose: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new RabbitMQResilienceService(
      connectionManager as unknown as AmqpConnectionManager,
      logger as any
    );
  }

  // ── onModuleInit ──────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should attach error handlers to all connections', () => {
      const mc1 = createMockManagedConnection();
      const mc2 = createMockManagedConnection();
      const conn1 = createMockAmqpConnection(mc1, 'conn-1');
      const conn2 = createMockAmqpConnection(mc2, 'conn-2');

      buildService([conn1, conn2]);
      service.onModuleInit();

      // Each managed connection should have 5 event handlers registered:
      // error, disconnect, connect, blocked, unblocked
      expect(mc1.on).toHaveBeenCalledTimes(5);
      expect(mc2.on).toHaveBeenCalledTimes(5);
    });

    it('should register handlers for error, disconnect, connect, blocked, and unblocked events', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'test-conn');

      buildService([conn]);
      service.onModuleInit();

      const registeredEvents = mc.on.mock.calls.map((call: any[]) => call[0]);
      expect(registeredEvents).toContain('error');
      expect(registeredEvents).toContain('disconnect');
      expect(registeredEvents).toContain('connect');
      expect(registeredEvents).toContain('blocked');
      expect(registeredEvents).toContain('unblocked');
    });

    it('should log the number of connections after attaching handlers', () => {
      const mc1 = createMockManagedConnection();
      const mc2 = createMockManagedConnection();
      const conn1 = createMockAmqpConnection(mc1, 'a');
      const conn2 = createMockAmqpConnection(mc2, 'b');

      buildService([conn1, conn2]);
      service.onModuleInit();

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('2 connection(s)'),
        LogContext.COMMUNICATION
      );
    });

    it('should handle zero connections gracefully', () => {
      buildService([]);
      service.onModuleInit();

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('0 connection(s)'),
        LogContext.COMMUNICATION
      );
    });

    it('should handle a single connection', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'only-conn');

      buildService([conn]);
      service.onModuleInit();

      expect(mc.on).toHaveBeenCalledTimes(5);
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('1 connection(s)'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── error event handler ───────────────────────────────────────────

  describe('error event handler', () => {
    it('should log error with connection name and error message', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'my-connection');

      buildService([conn]);
      service.onModuleInit();

      const error = new Error('Heartbeat timeout');
      mc.emit('error', error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('my-connection'),
        error.stack,
        LogContext.COMMUNICATION
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Heartbeat timeout'),
        expect.any(String),
        LogContext.COMMUNICATION
      );
    });

    it('should use "default" as connection name when configuration.name is not set', () => {
      const mc = createMockManagedConnection();
      // No name in configuration
      const conn = {
        managedConnection: mc,
        configuration: undefined,
      } as unknown as AmqpConnection;

      buildService([conn]);
      service.onModuleInit();

      const error = new Error('Connection refused');
      mc.emit('error', error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('default'),
        error.stack,
        LogContext.COMMUNICATION
      );
    });

    it('should not rethrow the error (preventing process crash)', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'resilient');

      buildService([conn]);
      service.onModuleInit();

      const error = new Error('AMQP protocol error');

      // If the handler rethrew, this would throw; it should not
      expect(() => mc.emit('error', error)).not.toThrow();
    });
  });

  // ── disconnect event handler ──────────────────────────────────────

  describe('disconnect event handler', () => {
    it('should log warning with connection name and error message on disconnect', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'primary');

      buildService([conn]);
      service.onModuleInit();

      const err = new Error('Socket closed');
      mc.emit('disconnect', { err });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('primary'),
        LogContext.COMMUNICATION
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Socket closed'),
        LogContext.COMMUNICATION
      );
    });

    it('should log "unknown reason" when disconnect has no error', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'secondary');

      buildService([conn]);
      service.onModuleInit();

      mc.emit('disconnect', { err: undefined });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown reason'),
        LogContext.COMMUNICATION
      );
    });

    it('should indicate reconnection will be attempted', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'conn');

      buildService([conn]);
      service.onModuleInit();

      mc.emit('disconnect', { err: new Error('timeout') });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('reconnect'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── connect event handler ─────────────────────────────────────────

  describe('connect event handler', () => {
    it('should log verbose message with connection name on connect', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'main-conn');

      buildService([conn]);
      service.onModuleInit();

      // Clear verbose calls from onModuleInit itself
      logger.verbose.mockClear();

      mc.emit('connect');

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('main-conn'),
        LogContext.COMMUNICATION
      );
    });

    it('should log reconnection event with "connected/reconnected" phrasing', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'reconn');

      buildService([conn]);
      service.onModuleInit();
      logger.verbose.mockClear();

      mc.emit('connect');

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('connected/reconnected'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── blocked event handler ─────────────────────────────────────────

  describe('blocked event handler', () => {
    it('should log warning with connection name and reason when blocked', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'blocked-conn');

      buildService([conn]);
      service.onModuleInit();

      mc.emit('blocked', { reason: 'resource_limit' });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('blocked-conn'),
        LogContext.COMMUNICATION
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('resource_limit'),
        LogContext.COMMUNICATION
      );
    });

    it('should include the block reason in the log message', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'conn');

      buildService([conn]);
      service.onModuleInit();

      mc.emit('blocked', { reason: 'memory' });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('memory'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── unblocked event handler ───────────────────────────────────────

  describe('unblocked event handler', () => {
    it('should log verbose message with connection name when unblocked', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'unblock-conn');

      buildService([conn]);
      service.onModuleInit();
      logger.verbose.mockClear();

      mc.emit('unblocked');

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('unblock-conn'),
        LogContext.COMMUNICATION
      );
    });

    it('should include "unblocked" in the log message', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'conn');

      buildService([conn]);
      service.onModuleInit();
      logger.verbose.mockClear();

      mc.emit('unblocked');

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('unblocked'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── multiple connections ──────────────────────────────────────────

  describe('multiple connections', () => {
    it('should independently handle events on different connections', () => {
      const mc1 = createMockManagedConnection();
      const mc2 = createMockManagedConnection();
      const conn1 = createMockAmqpConnection(mc1, 'conn-alpha');
      const conn2 = createMockAmqpConnection(mc2, 'conn-beta');

      buildService([conn1, conn2]);
      service.onModuleInit();

      const error1 = new Error('Alpha error');
      mc1.emit('error', error1);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('conn-alpha'),
        error1.stack,
        LogContext.COMMUNICATION
      );

      const error2 = new Error('Beta error');
      mc2.emit('error', error2);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('conn-beta'),
        error2.stack,
        LogContext.COMMUNICATION
      );
    });

    it('should log per-connection handler attachment', () => {
      const mc1 = createMockManagedConnection();
      const mc2 = createMockManagedConnection();
      const conn1 = createMockAmqpConnection(mc1, 'alpha');
      const conn2 = createMockAmqpConnection(mc2, 'beta');

      buildService([conn1, conn2]);
      service.onModuleInit();

      // Should have verbose logs for each connection's handler attachment
      // plus the summary log
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('alpha'),
        LogContext.COMMUNICATION
      );
      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('beta'),
        LogContext.COMMUNICATION
      );
    });
  });

  // ── connection name fallback ──────────────────────────────────────

  describe('connection name fallback', () => {
    it('should use "default" when configuration object exists but name is undefined', () => {
      const mc = createMockManagedConnection();
      const conn = {
        managedConnection: mc,
        configuration: { name: undefined },
      } as unknown as AmqpConnection;

      buildService([conn]);
      service.onModuleInit();

      mc.emit('connect');

      // The verbose log for 'connect' event should contain 'default'
      const connectLogCalls = logger.verbose.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('connected/reconnected')
      );
      expect(connectLogCalls.length).toBeGreaterThan(0);
      expect(connectLogCalls[0][0]).toContain('default');
    });

    it('should use the provided connection name when available', () => {
      const mc = createMockManagedConnection();
      const conn = createMockAmqpConnection(mc, 'custom-name');

      buildService([conn]);
      service.onModuleInit();

      mc.emit('connect');

      const connectLogCalls = logger.verbose.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('connected/reconnected')
      );
      expect(connectLogCalls.length).toBeGreaterThan(0);
      expect(connectLogCalls[0][0]).toContain('custom-name');
    });
  });
});
