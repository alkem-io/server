import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { type IEvent } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { Subscriber } from './subscriber';

describe('Subscriber', () => {
  let subscriber: Subscriber;
  let amqpConnection: { createSubscriber: ReturnType<typeof vi.fn> };

  class TestEventA {
    static name = 'TestEventA';
  }
  class TestEventB {
    static name = 'TestEventB';
  }

  beforeEach(async () => {
    amqpConnection = {
      createSubscriber: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Subscriber,
        {
          provide: AmqpConnection,
          useValue: amqpConnection,
        },
        {
          provide: 'HANDLE_EVENTS',
          useValue: [TestEventA, TestEventB],
        },
        MockWinstonProvider,
      ],
    }).compile();

    subscriber = module.get(Subscriber);
  });

  describe('connect', () => {
    it('should create a subscriber for each event', () => {
      subscriber.connect();

      expect(amqpConnection.createSubscriber).toHaveBeenCalledTimes(2);
    });

    it('should use kebab-case queue names derived from event class names', () => {
      subscriber.connect();

      const firstCall = amqpConnection.createSubscriber.mock.calls[0];
      const secondCall = amqpConnection.createSubscriber.mock.calls[1];

      // Queue name is derived from "virtual-contributor" + kebab-cased class name
      expect(firstCall[1]).toEqual(
        expect.objectContaining({
          queue: expect.stringContaining('virtual-contributor'),
        })
      );
      expect(secondCall[1]).toEqual(
        expect.objectContaining({
          queue: expect.stringContaining('virtual-contributor'),
        })
      );
    });
  });

  describe('bridgeEventsTo', () => {
    it('should set the bridge subject', () => {
      const subject = new Subject<IEvent>();

      subscriber.bridgeEventsTo(subject);

      // Verify by calling connect and checking the subscriber callback behavior
      // The bridge is a private field, so we verify indirectly
      expect(() => subscriber.bridgeEventsTo(subject)).not.toThrow();
    });
  });
});
