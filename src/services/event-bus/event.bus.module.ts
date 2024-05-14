import { Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Publisher } from './publisher';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { IngestSpace } from './commands';

@Module({
  imports: [
    CqrsModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rbmqConfig = configService.get(ConfigurationTypes.MICROSERVICES)
          .rabbitmq.connection;
        return {
          uri: `amqp://${rbmqConfig.user}:${rbmqConfig.password}@${rbmqConfig.host}:${rbmqConfig.port}`,
          connectionInitOptions: { wait: false },
          exchanges: [
            {
              name: 'event-bus',
              type: 'fanout',
            },
          ],
          queues: [
            {
              name: 'virtual-contributor-ingest-space',
              exchange: 'event-bus',
              routingKey: '',
            },
          ],
        };
      },
    }),
  ],
  providers: [Publisher, IngestSpace, EventBus],
  exports: [EventBus],
})
export class EventBusModule implements OnModuleInit {
  constructor(
    private readonly event$: EventBus,
    private readonly publisher: Publisher
  ) {}

  async onModuleInit(): Promise<any> {
    this.publisher.connect();
    this.event$.publisher = this.publisher;
  }
}
