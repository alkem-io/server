import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { IEventPublisher } from '@nestjs/cqrs';

@Injectable()
export class Publisher implements IEventPublisher {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  connect(): void {
    // init logic if is neccesary
  }

  publish<T extends object>(event: T): any {
    // throw new Error(JSON.stringify(event));
    this.amqpConnection.publish(
      'event-bus',
      event.constructor.name,
      JSON.stringify({ type: event.constructor.name, ...event })
    );
  }
}
