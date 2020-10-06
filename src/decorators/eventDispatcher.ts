/**
 * Taken from https://github.com/santiq/bulletproof-nodejs/blob/master/src/decorators/eventDispatcher.ts
 * Credits to the author
 */

import { EventDispatcher as EventDispatcherClass } from 'event-dispatch';
import { Container } from 'typedi';

export function EventDispatcher() {
  return (object: any, propertyName: string, index?: number): void => {
    const eventDispatcher = new EventDispatcherClass();
    Container.registerHandler({ object, propertyName, index, value: () => eventDispatcher });
  };
}

export { EventDispatcher as EventDispatcherInterface } from 'event-dispatch';
