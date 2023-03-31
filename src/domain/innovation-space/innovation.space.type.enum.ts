import { registerEnumType } from '@nestjs/graphql';

export enum InnovationSpaceType {
  BASIC = 'basic', // todo: what name is good here?
  LITE = 'lite',
}

registerEnumType(InnovationSpaceType, {
  name: 'InnovationSpaceType',
});
