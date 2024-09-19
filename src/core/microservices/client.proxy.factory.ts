import { MessagingQueue } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';

export const clientProxyFacotry = async (
  configService: ConfigService<AlkemioConfig, true>,
  queue: MessagingQueue,
  durable: boolean = true
) => {
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
};
