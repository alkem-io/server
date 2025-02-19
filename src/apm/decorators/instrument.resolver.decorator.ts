import { createInstrumentedClassDecorator } from './util';
import { RESOLVER_NAME_METADATA } from '@nestjs/graphql';

export const InstrumentResolver = createInstrumentedClassDecorator(
  'graphql-resolver',
  {
    matchMethodsOnMetadataKey: RESOLVER_NAME_METADATA,
  }
);
