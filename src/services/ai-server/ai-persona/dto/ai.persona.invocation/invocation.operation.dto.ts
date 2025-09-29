import { registerEnumType } from '@nestjs/graphql';

export enum InvocationOperation {
  QUERY = 'query',
  INGEST = 'ingest',
}

registerEnumType(InvocationOperation, {
  name: 'InvocationOperation',
  description: 'Available operations for the engine to execute.',
});
