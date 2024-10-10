import { LogContext, MessagingQueue } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';

const QUEUE_CONTEXT_MAP: { [key in MessagingQueue]?: LogContext } = {
  [MessagingQueue.AUTH_RESET]: LogContext.AUTH,
  [MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT]:
    LogContext.VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT,
  [MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC]:
    LogContext.VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC,
  [MessagingQueue.VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT]:
    LogContext.VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT,
};

export const clientProxyFactory = (queue: MessagingQueue, durable = true) => {
  const context = QUEUE_CONTEXT_MAP[queue];
  return async (
    logger: LoggerService,
    configService: ConfigService<AlkemioConfig, true>
  ) => {
    try {
      const rabbitMqOptions = configService.get('microservices.rabbitmq', {
        infer: true,
      });
      const { user, password, host, port } = rabbitMqOptions.connection;
      const connectionString = `amqp://${user}:${password}@${host}:${port}?heartbeat=30`;

      const options = {
        urls: [connectionString],
        queue,
        queueOptions: {
          // the queue will survive a broker restart
          durable,
        },
        noAck: true,
      };
      return ClientProxyFactory.create({ transport: Transport.RMQ, options });
    } catch (err) {
      logger.error(`Could not connect to RabbitMQ: ${err}`, context);
      return undefined;
    }
  };
};
