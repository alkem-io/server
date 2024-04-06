import { ConfigurationTypes, LogContext } from '@common/enums';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export async function virtualPersonaEngineCommunityManagerServiceFactory(
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
      queue: MessagingQueue.VIRTUAL_PERSONA_ENGINE_COMMUNITY_MANAGER,
      queueOptions: {
        // the queue will survive a broker restart
        durable: false,
      },
      noAck: false,
    };
    return ClientProxyFactory.create({ transport: Transport.RMQ, options });
  } catch (err) {
    logger.error(
      `Could not connect to RabbitMQ: ${err}, logging in...`,
      LogContext.CHAT_GUIDANCE
    );
    return undefined;
  }
}
