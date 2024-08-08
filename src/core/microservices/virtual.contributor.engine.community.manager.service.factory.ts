import { LogContext } from '@common/enums';
import { MessagingQueue } from '@common/enums/messaging.queue';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';

export async function virtualContributorEngineCommunityManagerServiceFactory(
  logger: LoggerService,
  configService: ConfigService<AlkemioConfig, true>
): Promise<any> {
  const connectionOptions = configService.get(
    'microservices.rabbitmq.connection',
    { infer: true }
  );
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;
  try {
    const options = {
      urls: [connectionString],
      queue: MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
      queueOptions: {
        // the queue will survive a broker restart
        durable: false,
      },
      noAck: true,
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
