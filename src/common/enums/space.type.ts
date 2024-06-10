import { registerEnumType } from '@nestjs/graphql';

export enum SpaceType {
  SPACE = 'space',
  CHALLENGE = 'challenge',
  OPPORTUNITY = 'opportunity',
  VIRTUAL_CONTRIBUTOR = 'vc',
}

registerEnumType(SpaceType, {
  name: 'SpaceType',
});
