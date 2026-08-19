import { LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { connect as amqpConnect, ChannelModel, Connection } from 'amqplib';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';

/**
 * Attach resilience handlers to a RAW amqplib connection. Unlike the golevelup
 * connections (covered by RabbitMQResilienceService via amqp-connection-manager),
 * this long-lived ChannelModel is UNMANAGED: without an 'error' listener, an
 * unexpected drop — an idle heartbeat timeout, a broker restart — emits an
 * UNHANDLED 'error' on the connection, which Node turns into an uncaught
 * exception that takes the whole server process down (observed: a midnight
 * "Unexpected close" crash). Log it instead, mirroring RabbitMQResilienceService.
 *
 * NOTE: this raw connection does not auto-reconnect, so the PubSub bound to it
 * goes inert until the next server start — still far better than crashing the
 * entire server for a transient broker blip.
 *
 * Exported so it can be unit-tested directly, without mocking the AMQP layer.
 */
export function attachConnectionResilienceHandlers(
  connection: ChannelModel,
  queueName: string,
  logger: LoggerService
): void {
  connection.on('error', (err: Error) => {
    logger.error(
      `RabbitMQ subscription connection error (queue ${queueName}): ${err.message}`,
      err.stack,
      LogContext.SUBSCRIPTIONS
    );
  });
  connection.on('close', () => {
    logger.warn(
      `RabbitMQ subscription connection closed (queue ${queueName})`,
      LogContext.SUBSCRIPTIONS
    );
  });
}

export async function subscriptionFactory(
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>,
  exchangeName: string,
  queueName: string,
  isBootstrap = false
): Promise<PubSubEngine | undefined> {
  // Processes that do not serve GraphQL subscriptions (schema bootstrap, the
  // dedicated auth-reset worker) must not open a RabbitMQ connection + consumer
  // per subscription topic. Both fall back to an in-memory PubSub. The worker
  // flag is read from process.env (not a DI token) so it cannot be shadowed by
  // the @Global IS_SCHEMA_BOOTSTRAP=false that MicroservicesModule declares and
  // that is pulled in transitively by domain modules (e.g. UserModule).
  if (isBootstrap || process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS === 'true') {
    logger.log?.(
      'Skipping RabbitMQ subscription connection (in-memory PubSub)',
      LogContext.SUBSCRIPTIONS
    );
    return new PubSub();
  }

  const rabbitMqOptions = configService?.get('microservices.rabbitmq', {
    infer: true,
  });
  const connectionOptions = rabbitMqOptions.connection;
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;

  try {
    const connection: ChannelModel = await amqpConnect(connectionString);
    attachConnectionResilienceHandlers(connection, queueName, logger);
    const pubSub = new AMQPPubSub({
      connection: connection as unknown as Connection,
      exchange: {
        // RabbitMQ subscriptions exchange name
        name: exchangeName,
        // RabbitMQ exchange type. There are 4 exchange types:
        // TOPIC - Topic exchanges route messages to one or many queues based on matching between a message routing key and the pattern that was used to bind a queue to an exchange.
        // The topic exchange type is often used to implement various publish/subscribe pattern variations. Topic exchanges are commonly used for the multicast routing of messages.
        // DIRECT - A direct exchange delivers messages to queues based on the message routing key.
        // A direct exchange is ideal for the unicast routing of messages (although they can be used for multicast routing as well).
        // HEADERS - A headers exchange is designed for routing on multiple attributes that are more easily expressed as message headers than a routing key. Headers exchanges ignore the routing key attribute.
        // Instead, the attributes used for routing are taken from the headers attribute. A message is considered matching if the value of the header equals the value specified upon binding.
        // FANOUT - A fanout exchange routes messages to all of the queues that are bound to it and the routing key is ignored.
        // If N queues are bound to a fanout exchange, when a new message is published to that exchange a copy of the message is delivered to all N queues.
        // Fanout exchanges are ideal for the broadcast routing of messages.
        type: 'direct',
        options: {
          // the exchange will survive a broker restart
          durable: true,
          // exchange is deleted when last queue is unbound from it
          autoDelete: false,
        },
      },
      queue: {
        name: queueName,
        options: {
          // used by only one connection and the queue will be deleted when that connection closes
          exclusive: true,
          // the queue will survive a broker restart
          durable: true,
          // queue that has had at least one consumer is deleted when last consumer unsubscribes
          autoDelete: false,
        },
        // Unbind from the RabbitMQ queue when disposing the pubsub connection
        unbindOnDispose: false,
        // Delete the RabbitMQ queue when disposing the pubsub connection
        deleteOnDispose: true,
      },
    });

    logger.verbose?.(
      `Created consumer on queue ${queueName}`,
      LogContext.SUBSCRIPTIONS
    );

    (pubSub as any).connection = connection;
    return pubSub;
  } catch (err) {
    logger?.error(
      `Could not connect to RabbitMQ: ${JSON.stringify(err)}`,
      LogContext.SUBSCRIPTIONS
    );
    return undefined;
  }
}
