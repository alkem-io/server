import { Global, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Publisher } from './publisher';
import { Subscriber } from './subscriber';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandleMessages } from './messages';
import { AlkemioConfig } from '@src/types';
import { Handlers } from './handlers';
import { AiServerModule } from '@services/ai-server/ai-server/ai.server.module';

@Global()
@Module({
  imports: [
    CqrsModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const rbmqConfig = configService.get(
          'microservices.rabbitmq.connection',
          { infer: true }
        );

        return {
          uri: `amqp://${rbmqConfig.user}:${rbmqConfig.password}@${rbmqConfig.host}:${rbmqConfig.port}`,
          connectionInitOptions: { wait: false },
          exchanges: [
            {
              name: 'event-bus',
              type: 'direct',
            },
          ],
          queues: [
            {
              name: 'virtual-contributor-ingest-space',
              exchange: 'event-bus',
              routingKey: 'IngestSpace',
            },
            {
              name: 'virtual-contributor-ingest-space-result',
              exchange: 'event-bus',
              routingKey: 'IngestSpaceResult',
            },
          ],
        };
      },
    }),
    AiServerModule,
  ],
  providers: [
    Publisher,
    Subscriber,
    { provide: 'HANDLE_EVENTS', useValue: HandleMessages },
    EventBus,
    ...Handlers,
  ],
  exports: [EventBus],
})
export class EventBusModule implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly publisher: Publisher,
    private readonly subscriber: Subscriber
  ) {}

  async onModuleInit(): Promise<any> {
    this.subscriber.connect();
    this.subscriber.bridgeEventsTo(this.eventBus.subject$);

    // really important, regardless of what examples and docs are saying :D
    // with just the decorator on the handlers are not invoked - so we need to explicitly
    // register them
    this.eventBus.register(Handlers);

    this.publisher.connect();
    this.eventBus.publisher = this.publisher;
  }
}
