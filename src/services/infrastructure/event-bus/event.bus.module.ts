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
import amqplib from 'amqplib';

@Global()
@Module({
  imports: [
    CqrsModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const rbmqConfig = configService.get(
          'microservices.rabbitmq.connection',
          { infer: true }
        );

        const eventBusConfig = configService.get(
          'microservices.rabbitmq.event_bus',
          { infer: true }
        );

        const exchangeType = 'direct';
        const uri = `amqp://${rbmqConfig.user}:${rbmqConfig.password}@${rbmqConfig.host}:${rbmqConfig.port}`;

        // with some recent changes the type fo the EventBus was changed from `fanout` to `direct` with routing keys
        // this snippet below makes sure the exchange is recreated with the proper type;
        // otherwise the app won't boot
        const connection = await amqplib.connect(uri);
        let channel = await connection.createChannel();
        // this is important - regardless of try/catch or err callbacks below the error
        // is emitted to the channel and the channel is closed;
        // we could log the error here but for some reason injecting the logger service is not working well :/
        channel.on('error', () => {});
        try {
          // assert the exchange exists with the right type
          await channel.assertExchange(eventBusConfig.exchange, exchangeType);
        } catch (err) {
          // if not, delete and assert it again
          // the configuration below will handle the oruting etc.
          channel = await connection.createChannel();
          await channel.deleteExchange(eventBusConfig.exchange);
          await channel.assertExchange(eventBusConfig.exchange, exchangeType);
        } finally {
          await channel.close();
        }

        return {
          uri,
          connectionInitOptions: { wait: false },
          exchanges: [
            {
              name: eventBusConfig.exchange,
              type: exchangeType,
            },
          ],
          queues: [
            {
              name: eventBusConfig.ingest_body_of_knowledge_queue,
              exchange: eventBusConfig.exchange,
              //TODO dynamically map queue names to events for the routing
              routingKey: 'IngestBodyOfKnowledge',
            },
            {
              name: eventBusConfig.ingest_body_of_knowledge_result_queue,
              exchange: eventBusConfig.exchange,
              routingKey: 'IngestBodyOfKnowledgeResult',
            },
            {
              name: 'virtual-contributor-engine-expert',
              exchange: eventBusConfig.exchange,
              routingKey: 'expert',
              durable: true,
            },
            {
              name: 'virtual-contributor-engine-guidance',
              exchange: eventBusConfig.exchange,
              routingKey: 'guidance',
              durable: true,
            },
            {
              name: 'virtual-contributor-engine-generic',
              exchange: eventBusConfig.exchange,
              routingKey: 'generic-openai',
              durable: true,
            },
            {
              name: 'virtual-contributor-engine-openai-assistant',
              exchange: eventBusConfig.exchange,
              routingKey: 'openai-assistant',
              durable: true,
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
