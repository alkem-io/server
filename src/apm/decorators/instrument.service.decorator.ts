import { ClassDecoratorParams, createInstrumentedClassDecorator } from './util';

const isEnabled =
  process.env.ENABLE_APM === 'true' && process.env.APM_INSTRUMENT_MODULES
    ? process.env.APM_INSTRUMENT_MODULES.indexOf('service') > -1
    : true;
/**
 * Instruments the methods of a class. Useful for tracing service calls.
 * @param options
 * @constructor
 */
export const InstrumentService = (
  options?: Pick<ClassDecoratorParams, 'skipMethods'>
) =>
  createInstrumentedClassDecorator('service-call', {
    ...options,
    enabled: isEnabled,
    skipMethods: options?.skipMethods,
  });
