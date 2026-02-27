import { LogContext } from '@common/enums';
import { AmqpConnection, Nack } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { IEvent, IMessageSource } from '@nestjs/cqrs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Subject } from 'rxjs';

@Injectable()
export class Subscriber implements IMessageSource {
  private bridge: Subject<any> | null = null;
  constructor(
    private readonly amqpConnection: AmqpConnection,
    @Inject('HANDLE_EVENTS')
    private readonly events: Array<any>, // if I type it more strictly with IEvent can't use the name property below
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  connect() {
    this.events.forEach(event => {
      const queue = `virtual-contributor${event.name.replace(
        /[A-Z]/g,
        (letter: string) => `-${letter.toLowerCase()}`
      )}`;

      this.amqpConnection.createSubscriber<string>(
        async (message: any) => {
          this.logger.verbose?.(
            `Message from queue ${queue} received`,
            LogContext.AI_SERVER_EVENT_BUS
          );

          if (this.bridge && message) {
            const bridgedEvent = new event();

            for (const key in message) {
              bridgedEvent[key] = message[key];
            }

            this.logger.verbose?.(
              `Message mapped to event ${event.name}; Event is: ${JSON.stringify(bridgedEvent)}`,
              LogContext.AI_SERVER_EVENT_BUS
            );
            this.bridge.next(bridgedEvent);
            return new Nack(false);
          }
        },
        {
          errorHandler: (_el, _msg, e) => {
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
