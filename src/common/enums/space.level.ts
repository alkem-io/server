import { registerEnumType } from '@nestjs/graphql';

export enum SpaceLevel {
  SPACE = 0,
  CHALLENGE = 1,
  OPPORTUNITY = 2,
}

registerEnumType(SpaceLevel, {
  name: 'SpaceLevel',
});
