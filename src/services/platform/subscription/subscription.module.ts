import { ConfigModule, ConfigService } from '@nestjs/config';
import { Global, LoggerService, Module } from '@nestjs/common';
import { AMQPPubSub } from 'graphql-amqp-subscriptions';
import amqp from 'amqplib';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext } from '@common/enums';

export const PUB_SUB = 'PUB_SUB';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PUB_SUB,
      useFactory: async (
        logger: LoggerService,
        configService: ConfigService
      ) => {
        let pubsub;
        const rabbitMqOptions = configService.get(
          ConfigurationTypes.Notifications
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
                  autoDelete:
                    rabbitMqOptions.pub_sub?.exchange?.options?.auto_delete,
                },
              },
              queue: {
                name: rabbitMqOptions.pub_sub?.queue?.name,
                options: {
                  exclusive: rabbitMqOptions.pub_sub?.queue?.options?.exclusive,
                  durable: rabbitMqOptions.pub_sub?.queue?.options?.durable,
                  autoDelete:
                    rabbitMqOptions.pub_sub?.queue?.options?.auto_delete,
                },
                unbindOnDispose:
                  rabbitMqOptions.pub_sub?.queue?.unbind_on_dispose,
                deleteOnDispose:
                  rabbitMqOptions.pub_sub?.queue?.delete_on_dispose,
              },
            });
          })
          .catch(err => {
            logger.error(
              `Could not connect to RabbitMQ: ${err}, logging in...`,
              LogContext.NOTIFICATIONS
            );
          });

        return pubsub;
      },
      inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
    },
  ],
  exports: [PUB_SUB],
})
export class SubscriptionModule {}
