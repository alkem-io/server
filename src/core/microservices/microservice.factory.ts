import { ConfigurationTypes, LogContext } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';
import { MicroserviceOptions } from './microservices.module';

export async function microserviceFactory(
  logger: LoggerService,
  configService: ConfigService,
  microserviceOptions: MicroserviceOptions
): Promise<any> {
  const { queueName } = microserviceOptions;
  const rmqConfig = configService.get(
    ConfigurationTypes.MICROSERVICES
  )?.rabbitmq;
  const connectionOptions = rmqConfig.connection;
  const connectionString = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;
  try {
    const rmqOptions: RmqOptions = {
      transport: Transport.RMQ,
      options: {
        urls: [connectionString],
        queue: queueName,
        queueOptions: {
          // the queue will survive a broker restart
          durable: true,
        },
        noAck: false,
      },
    };
    return ClientProxyFactory.create(rmqOptions);
  } catch (err) {
    logger.error(
      `Could not connect to RabbitMQ: ${err}, logging in...`,
      LogContext.NOTIFICATIONS
    );
    return undefined;
  }
}
