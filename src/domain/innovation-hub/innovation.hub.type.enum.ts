import { registerEnumType } from '@nestjs/graphql';

export enum InnovationHxbType {
  VISIBILITY = 'visibility',
  LIST = 'list',
}

registerEnumType(InnovationHxbType, {
  name: 'InnovationHxbType',
});
