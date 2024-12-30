import { registerEnumType } from '@nestjs/graphql';

export enum CalloutsSetType {
  COLLABORATION = 'collaboration',
  KNOWLEDGE_BASE = 'knowledge-base',
}

registerEnumType(CalloutsSetType, {
  name: 'CalloutsSetType',
});
