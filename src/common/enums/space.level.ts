import { registerEnumType } from '@nestjs/graphql';

export enum SpaceLevel {
  L0 = 0,
  L1 = 1,
  L2 = 2,
}

registerEnumType(SpaceLevel, {
  name: 'SpaceLevel',
});
