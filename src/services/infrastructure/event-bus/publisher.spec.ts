import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { InvokeEngine } from './messages/invoke.engine';
import { Publisher } from './publisher';

describe('Publisher', () => {
  let publisher: Publisher;
  let amqpConnection: { publish: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();

    amqpConnection = {
      publish: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Publisher,
        {
          provide: AmqpConnection,
          useValue: amqpConnection,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    publisher = module.get(Publisher);
  });

  describe('connect', () => {
    it('should be a no-op and not throw', () => {
      expect(() => publisher.connect()).not.toThrow();
    });
  });

  describe('publish', () => {
    it('should publish to event-bus exchange with constructor name as routing key', () => {
      class TestEvent {
        data = 'value';
      }
      const event = new TestEvent();

      publisher.publish(event);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'event-bus',
        'TestEvent',
        {
          eventType: 'TestEvent',
          data: 'value',
        }
      );
    });

    it('should use engine name as routing key for InvokeEngine events', () => {
      const event = new InvokeEngine({
        engine: 'my-custom-engine',
      } as any);

      publisher.publish(event);

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        'event-bus',
        'my-custom-engine',
        expect.objectContaining({
          eventType: 'InvokeEngine',
        })
      );
    });
  });
});
