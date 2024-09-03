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

        const eventBusConfig = configService.get(
          'microservices.rabbitmq.event_bus',
          { infer: true }
        );

        console.log(eventBusConfig);

        return {
          uri: `amqp://${rbmqConfig.user}:${rbmqConfig.password}@${rbmqConfig.host}:${rbmqConfig.port}`,
          connectionInitOptions: { wait: false },
          exchanges: [
            {
              name: eventBusConfig.exchange,
              type: 'direct',
            },
          ],
          queues: [
            {
              name: eventBusConfig.ingest_space_queue,
              exchange: eventBusConfig.exchange,
              //TODO dynamically map queue names to events for the routing
              routingKey: 'IngestSpace',
            },
            {
              name: eventBusConfig.ingest_space_result_queue,
              exchange: eventBusConfig.exchange,
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
