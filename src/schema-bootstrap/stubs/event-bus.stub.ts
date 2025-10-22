import { EventBus } from '@nestjs/cqrs';

export const EventBusStubProvider = {
  provide: EventBus,
  useValue: { publish: () => undefined, subscribe: () => undefined },
};
