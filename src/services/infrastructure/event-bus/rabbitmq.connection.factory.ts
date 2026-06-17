import { LogContext } from '@common/enums';
import { Injectable, LoggerService } from '@nestjs/common';
import { connect as amqpConnect, Channel, ChannelModel } from 'amqplib';

/**
 * Factory for creating RabbitMQ connections.
 * This abstraction allows tests to override connection creation with no-op implementations.
 */
@Injectable()
export class RabbitMQConnectionFactory {
  /**
   * Ensures the exchange exists with the correct type.
   * If the exchange exists with the wrong type, it will be deleted and recreated.
   *
   * @param logger optional logger used to surface broker connection/channel
   *   errors. Without it, the no-op handlers below still prevent crashes but
   *   hide the failure, leaving incidents undiagnosable.
   */
  async ensureExchange(
    uri: string,
    exchangeName: string,
    exchangeType: string,
    logger?: LoggerService
  ): Promise<void> {
    const connection = await this.connect(uri);

    // Guard the (short-lived) connection itself: a broker drop while asserting
    // the exchange would otherwise emit an UNHANDLED 'error' on the connection
    // and crash the process (same class as the subscription-factory crash).
    // The connection is closed in the finally below regardless. Log the error
    // (when a logger is available) for observability, mirroring
    // subscription.factory.ts.
    connection.on('error', (err: Error) => {
      logger?.error?.(
        `RabbitMQ exchange setup connection error (exchange ${exchangeName}): ${err.message}`,
        err.stack,
        LogContext.SUBSCRIPTIONS
      );
    });

    let channel: Channel = await connection.createChannel();

    // Important: errors are emitted to the channel and the channel is closed
    channel.on('error', (err: Error) => {
      logger?.error?.(
        `RabbitMQ exchange setup channel error (exchange ${exchangeName}): ${err.message}`,
        err.stack,
        LogContext.SUBSCRIPTIONS
      );
    });

    try {
      // Assert the exchange exists with the right type
      await channel.assertExchange(exchangeName, exchangeType);
    } catch {
      // If not, delete and assert it again
      channel = await connection.createChannel();
      await channel.deleteExchange(exchangeName);
      await channel.assertExchange(exchangeName, exchangeType);
    } finally {
      await channel.close();
      await connection.close();
    }
  }

  /**
   * Creates a connection to RabbitMQ.
   * Can be overridden in tests to return a mock connection.
   */
  async connect(uri: string): Promise<ChannelModel> {
    return amqpConnect(uri);
  }
}
