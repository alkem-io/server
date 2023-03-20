import amqp from 'amqplib';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { PubSubEngine } from 'graphql-subscriptions';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';

export async function subscriptionFactory(
  logger: LoggerService,
  configService: ConfigService,
  exchangeName: string,
  queueName: string
): Promise<PubSubEngine | undefined> {
  const rabbitMqOptions = configService?.get(
    ConfigurationTypes.MICROSERVICES
  )?.rabbitmq;
  const connectionOptions = rabbitMqOptions.connection;
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}`;

  return amqp
    .connect(connectionString)
    .then(
      conn =>
        new AMQPPubSub({
          connection: conn,
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
        }),
      err => {
        logger?.error(
          `Connect to RabbitMQ rejected with: ${JSON.stringify(err)}`,
          LogContext.SUBSCRIPTIONS
        );
        return undefined;
      }
    )
    .then(x => {
      logger.verbose?.(
        `Created consumer on queue ${queueName}`,
        LogContext.SUBSCRIPTIONS
      );
      return x;
    })
    .catch(err => {
      logger?.error(
        `Could not connect to RabbitMQ: ${err}, logging in...`,
        LogContext.SUBSCRIPTIONS
      );
      return undefined;
    });
}
