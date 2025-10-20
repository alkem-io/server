import { Injectable } from '@nestjs/common';
import amqplib from 'amqplib';

/**
 * Factory for creating RabbitMQ connections.
 * This abstraction allows tests to override connection creation with no-op implementations.
 */
@Injectable()
export class RabbitMQConnectionFactory {
  /**
   * Ensures the exchange exists with the correct type.
   * If the exchange exists with the wrong type, it will be deleted and recreated.
   */
  async ensureExchange(
    uri: string,
    exchangeName: string,
    exchangeType: string
  ): Promise<void> {
    const connection = await this.connect(uri);
    let channel = await connection.createChannel();

    // Important: errors are emitted to the channel and the channel is closed
    channel.on('error', () => {});

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
  async connect(uri: string): Promise<amqplib.Connection> {
    return amqplib.connect(uri);
  }
}
