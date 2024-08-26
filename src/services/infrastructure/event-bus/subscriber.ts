import { Inject } from '@nestjs/common';
import { IEvent, IMessageSource } from '@nestjs/cqrs';
import { Subject } from 'rxjs';

import { AmqpConnection, Nack } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

@Injectable()
export class Subscriber implements IMessageSource {
  private bridge: Subject<any> | null = null;
  constructor(
    private readonly amqpConnection: AmqpConnection,
    @Inject('EVENTS')
    private readonly events: Array<any>
  ) {}

  connect() {
    this.events.forEach(event => {
      const queue = `virtual-contributor${event.name.replace(
        /[A-Z]/g,
        (letter: string) => `-${letter.toLowerCase()}`
      )}`;

      this.amqpConnection.createSubscriber<string>(
        async (message: any) => {
          if (this.bridge && message) {
            const bridgedEvent = new event();

            for (const key in message) {
              bridgedEvent[key] = message[key];
            }
            this.bridge.next(bridgedEvent);
            return new Nack(false);
          }
        },
        {
          errorHandler: (channel, msg, e) => {
            throw e;
          },
          queue,
        },
        `handler_${event.name}`
      );
    });
  }

  bridgeEventsTo<T extends IEvent>(subject: Subject<T>): any {
    this.bridge = subject;
  }
}
