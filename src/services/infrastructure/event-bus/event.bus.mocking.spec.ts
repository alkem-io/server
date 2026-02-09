import { Test, TestingModule } from '@nestjs/testing';
import { getEventBusMockProviders } from '@test/utils';
import { Publisher } from './publisher';
import { RabbitMQConnectionFactory } from './rabbitmq.connection.factory';
import { Subscriber } from './subscriber';

describe('EventBus Mocking', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [...getEventBusMockProviders()],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should provide mocked Publisher', () => {
    const publisher = module.get<Publisher>(Publisher);
    expect(publisher).toBeDefined();
    expect(publisher.connect).toBeDefined();
    expect(publisher.publish).toBeDefined();
  });

  it('should provide mocked Subscriber', () => {
    const subscriber = module.get<Subscriber>(Subscriber);
    expect(subscriber).toBeDefined();
    expect(subscriber.connect).toBeDefined();
    expect(subscriber.bridgeEventsTo).toBeDefined();
  });

  it('should provide mocked RabbitMQConnectionFactory', () => {
    const factory = module.get<RabbitMQConnectionFactory>(
      RabbitMQConnectionFactory
    );
    expect(factory).toBeDefined();
    expect(factory.connect).toBeDefined();
    expect(factory.ensureExchange).toBeDefined();
  });

  it('should not create real RabbitMQ connections when calling factory methods', async () => {
    const factory = module.get<RabbitMQConnectionFactory>(
      RabbitMQConnectionFactory
    );
    // This should not throw or attempt real connections
    await expect(
      factory.ensureExchange('amqp://fake', 'test-exchange', 'direct')
    ).resolves.toBeUndefined();
  });

  it('should not create real RabbitMQ connections when calling publisher methods', () => {
    const publisher = module.get<Publisher>(Publisher);
    // This should not throw or attempt real connections
    expect(() => publisher.connect()).not.toThrow();
    expect(() => publisher.publish({ test: 'event' })).not.toThrow();
  });

  it('should not create real RabbitMQ connections when calling subscriber methods', () => {
    const subscriber = module.get<Subscriber>(Subscriber);
    // This should not throw or attempt real connections
    expect(() => subscriber.connect()).not.toThrow();
  });
});
