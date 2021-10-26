import { ConfigurationTypes, LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import { PubSubEngine } from 'graphql-subscriptions';
import amqp from 'amqplib';

export async function subscriptionPubSubFactory(
  logger: LoggerService,
  configService: ConfigService
): Promise<PubSubEngine | undefined> {
  let pubsub;
  const rabbitMqOptions = configService.get(
    ConfigurationTypes.NOTIFICATIONS
  )?.rabbitmq;
  const connectionOptions = rabbitMqOptions.connection;
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;

  await amqp
    .connect(connectionString)
    .then(conn => {
      pubsub = new AMQPPubSub({
        connection: conn,
        exchange: {
          name: rabbitMqOptions.pub_sub?.exchange?.name,
          type: rabbitMqOptions.pub_sub?.exchange?.type,
          options: {
            durable: rabbitMqOptions.pub_sub?.exchange?.options?.durable,
            autoDelete: rabbitMqOptions.pub_sub?.exchange?.options?.auto_delete,
          },
        },
        queue: {
          name: rabbitMqOptions.pub_sub?.queue?.name,
          options: {
            exclusive: rabbitMqOptions.pub_sub?.queue?.options?.exclusive,
            durable: rabbitMqOptions.pub_sub?.queue?.options?.durable,
            autoDelete: rabbitMqOptions.pub_sub?.queue?.options?.auto_delete,
          },
          unbindOnDispose: rabbitMqOptions.pub_sub?.queue?.unbind_on_dispose,
          deleteOnDispose: rabbitMqOptions.pub_sub?.queue?.delete_on_dispose,
        },
      });
    })
    .catch(err => {
      logger.error(
        `Could not connect to RabbitMQ: ${err}, logging in...`,
        LogContext.NOTIFICATIONS
      );
      return undefined;
    });

  return pubsub;
}
