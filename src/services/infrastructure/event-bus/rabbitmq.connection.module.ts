import { Module } from '@nestjs/common';
import { RabbitMQConnectionFactory } from './rabbitmq.connection.factory';

@Module({
  providers: [RabbitMQConnectionFactory],
  exports: [RabbitMQConnectionFactory],
})
export class RabbitMQConnectionModule {}
