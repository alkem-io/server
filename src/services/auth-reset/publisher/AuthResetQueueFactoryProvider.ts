import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigurationTypes, LogContext, MessagingQueue } from '@common/enums';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export const AUTH_RESET_QUEUE_PROVIDER = 'auth-reset-queue';

export const authResetQueueFactoryProvider: FactoryProvider = {
  provide: AUTH_RESET_QUEUE_PROVIDER,
  useFactory: (logger: LoggerService, configService: ConfigService) => {
    const rabbitMqOptions = configService.get(
      ConfigurationTypes.MICROSERVICES
    )?.rabbitmq;
    const connectionOptions = rabbitMqOptions.connection;
    const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;
    try {
      const options = {
        urls: [connectionString],
        queue: MessagingQueue.AUTH_RESET,
        queueOptions: {
          // the queue will survive a broker restart
          durable: true,
        },
        noAck: false,
      };
      return ClientProxyFactory.create({ transport: Transport.RMQ, options });
    } catch (err) {
      logger.error(
        `Could not connect to RabbitMQ: ${err}, logging in...`,
        LogContext.NOTIFICATIONS
      );
      return undefined;
    }
  },
  inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService],
};
