import { registerEnumType } from '@nestjs/graphql';

export enum InnovationHubType {
  VISIBILITY = 'visibility',
  LIST = 'list',
}

registerEnumType(InnovationHubType, {
  name: 'InnovationHubType',
});
