import { RESOLVER_NAME_METADATA } from '@nestjs/graphql';
import { ClassDecoratorParams, createInstrumentedClassDecorator } from './util';

const isEnabled =
  process.env.ENABLE_APM === 'true' && process.env.APM_INSTRUMENT_MODULES
    ? process.env.APM_INSTRUMENT_MODULES.indexOf('resolver') > -1
    : true;

/**
 * Instruments the methods of a class. Useful for tracing graphql resolvers.
 * Identifies resolver fields by the __RESOLVER_NAME_METADATA__ metadata key.
 * @param options
 * @constructor
 */
export const InstrumentResolver = (
  options?: Pick<ClassDecoratorParams, 'skipMethods'>
) =>
  createInstrumentedClassDecorator('graphql-resolver', {
    ...options,
    enabled: isEnabled,
    matchMethodsOnMetadataKey: RESOLVER_NAME_METADATA,
  });
