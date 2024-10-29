import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { IEventPublisher } from '@nestjs/cqrs';
import { InvokeEngine } from './messages/invoke.engine';

@Injectable()
export class Publisher implements IEventPublisher {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  connect(): void {
    // init logic if is neccesary
  }

  publish<T extends object>(event: T): any {
    let routingKey = event.constructor.name;
    if (event instanceof InvokeEngine) {
      routingKey = event.eventData.engine;
    }
    this.amqpConnection.publish(
      'event-bus',
      routingKey,
      JSON.stringify({ type: event.constructor.name, ...event })
    );
  }
}
