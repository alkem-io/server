import { ConfigurationTypes, LogContext } from '@common/enums';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export async function notificationsServiceFactory(
  logger: LoggerService,
  configService: ConfigService
): Promise<any> {
  const rabbitMqOptions = configService.get(
    ConfigurationTypes.MICROSERVICES
  )?.rabbitmq;
  const connectionOptions = rabbitMqOptions.connection;
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;
  try {
    const options = {
      urls: [connectionString],
      queue: MessagingQueue.NOTIFICATIONS,
      queueOptions: {
        // the queue will survive a broker restart
        durable: true,
      },
      // https://github.com/nestjs/nest/issues/11966#issuecomment-1619622486
      // In v9 there was a bug causing noAck: false to always be ignored & set to true (since we used || instead of ??).
      // If you want your app to keep working as it was in v9,
      // set noAck to true (or just remove this option whatsoever as true is the default).
      noAck: true,
    };
    return ClientProxyFactory.create({ transport: Transport.RMQ, options });
  } catch (err) {
    logger.error(
      `Could not connect to RabbitMQ: ${err}, logging in...`,
      LogContext.NOTIFICATIONS
    );
    return undefined;
  }
}
