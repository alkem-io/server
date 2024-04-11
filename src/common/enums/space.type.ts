import { registerEnumType } from '@nestjs/graphql';

export enum SpaceType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
}

registerEnumType(SpaceType, {
  name: 'SpaceType',
});
