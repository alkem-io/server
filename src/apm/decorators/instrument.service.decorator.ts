import { createInstrumentedClassDecorator } from './util';

export const InstrumentService = (options?: { skipMethods: string[] }) =>
  createInstrumentedClassDecorator('service-call', {
    skipMethods: options?.skipMethods,
  });
