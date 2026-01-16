import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';
import {
  AmqpConnectionManager,
  AmqpConnection,
} from '@golevelup/nestjs-rabbitmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';

/**
 * Service that adds resilience to RabbitMQ connections by handling
 * error events that would otherwise crash the application.
 *
 * The @golevelup/nestjs-rabbitmq library uses amqp-connection-manager which
 * handles reconnection, but doesn't always catch the underlying amqplib
 * error events (like heartbeat timeouts). This service adds handlers
 * to prevent unhandled errors from crashing the process.
 *
 * This service attaches to ALL RabbitMQ connections managed by the
 * AmqpConnectionManager, so it only needs to be provided once globally.
 */
@Injectable()
export class RabbitMQResilienceService implements OnModuleInit {
  constructor(
    private readonly connectionManager: AmqpConnectionManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  onModuleInit() {
    const connections = this.connectionManager.getConnections();
    for (const connection of connections) {
      this.attachErrorHandlers(connection);
    }
    this.logger.verbose?.(
      `RabbitMQ resilience handlers attached to ${connections.length} connection(s)`,
      LogContext.COMMUNICATION
    );
  }

  private attachErrorHandlers(amqpConnection: AmqpConnection): void {
    const managedConnection = amqpConnection.managedConnection;
    const connectionName = amqpConnection.configuration?.name ?? 'default';

    // Handle connection-level errors to prevent crashes
    // amqp-connection-manager will still handle reconnection
    managedConnection.on('error', (err: Error) => {
      this.logger.error(
        `RabbitMQ connection error (${connectionName}): ${err.message}`,
        err.stack,
        LogContext.COMMUNICATION
      );
      // Don't rethrow - let amqp-connection-manager handle reconnection
    });

    // Log disconnections for visibility
    managedConnection.on('disconnect', ({ err }: { err?: Error }) => {
      this.logger.warn(
        `RabbitMQ disconnected (${connectionName}): ${err?.message ?? 'unknown reason'}. Will attempt to reconnect...`,
        LogContext.COMMUNICATION
      );
    });

    // Log successful reconnections
    managedConnection.on('connect', () => {
      this.logger.verbose?.(
        `RabbitMQ connected/reconnected (${connectionName})`,
        LogContext.COMMUNICATION
      );
    });

    // Log blocked connections (RabbitMQ resource alarm)
    managedConnection.on('blocked', ({ reason }: { reason: string }) => {
      this.logger.warn(
        `RabbitMQ connection blocked (${connectionName}): ${reason}`,
        LogContext.COMMUNICATION
      );
    });

    managedConnection.on('unblocked', () => {
      this.logger.verbose?.(
        `RabbitMQ connection unblocked (${connectionName})`,
        LogContext.COMMUNICATION
      );
    });

    this.logger.verbose?.(
      `RabbitMQ resilience handlers attached for connection: ${connectionName}`,
      LogContext.COMMUNICATION
    );
  }
}
