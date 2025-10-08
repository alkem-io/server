export const EventBusStubProvider = {
  provide: 'EVENT_BUS',
  useValue: { publish: () => undefined, subscribe: () => undefined },
};
